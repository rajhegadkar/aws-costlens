import { DescribeInstancesCommand } from '@aws-sdk/client-ec2';
import { ListBucketsCommand } from '@aws-sdk/client-s3';
import { DescribeDBInstancesCommand } from '@aws-sdk/client-rds';
import { LookupEventsCommand } from '@aws-sdk/client-cloudtrail';
import {
  getEc2Client,
  getRdsClient,
  getS3Client,
  getCloudTrailClient,
  getCurrentRegion
} from './awsClients.js';
import { CostExplorerService, isDemoModeEnabled } from './costExplorerService.js';
import { executeSafeReadOnlyOperation } from '../security/awsGuard.js';
import { globalCache } from '../cache/fileCache.js';
import { getFriendlyRegionName } from '../../shared/explanationDictionary.js';
import {
  ResourceInventorySummary,
  Ec2InstanceInventoryItem,
  S3BucketInventoryItem,
  RdsInstanceInventoryItem,
  CloudTrailActivityItem
} from '../../shared/types.js';

const PRIMARY_REGIONS = ['ap-south-1', 'us-east-1', 'us-west-2', 'eu-north-1', 'eu-west-1', 'us-east-2'];

export class InventoryService {
  public static async getInventory(forceRefresh = false): Promise<ResourceInventorySummary> {
    if (isDemoModeEnabled()) {
      return this.getMockInventory();
    }

    const cacheKey = 'inventory_summary_all';
    if (!forceRefresh) {
      const cached = globalCache.get<ResourceInventorySummary>(cacheKey, 15 * 60 * 1000); // 15 min TTL
      if (cached) return cached;
    }

    const auth = await CostExplorerService.getAuthStatus();
    if (auth.isDemoMode || !auth.isAuthenticated) {
      const stale = globalCache.getStale<ResourceInventorySummary>(cacheKey);
      return stale || this.getMockInventory();
    }

    try {
      const ec2Instances: Ec2InstanceInventoryItem[] = [];
      const rdsInstances: RdsInstanceInventoryItem[] = [];
      const s3Buckets: S3BucketInventoryItem[] = [];
      const activeRegionsSet = new Set<string>();

      const regionsToScan = Array.from(new Set([getCurrentRegion(), ...PRIMARY_REGIONS]));

      // 1. Scan EC2 across primary regions in parallel
      const ec2RegionScans = regionsToScan.map(async (reg) => {
        try {
          const ec2Client = getEc2Client(reg);
          const ec2Res = await executeSafeReadOnlyOperation('DescribeInstances', async () => {
            return await ec2Client.send(new DescribeInstancesCommand({}));
          });

          const instances = ec2Res.Reservations?.flatMap(r => r.Instances || []) || [];
          if (instances.length > 0) {
            activeRegionsSet.add(reg);
            for (const inst of instances) {
              const tagsMap: Record<string, string> = {};
              for (const t of inst.Tags || []) {
                if (t.Key && t.Value) tagsMap[t.Key] = t.Value;
              }
              const nameTag = tagsMap['Name'] || '(unnamed machine)';

              ec2Instances.push({
                instanceId: inst.InstanceId || 'unknown',
                name: nameTag,
                instanceType: inst.InstanceType || 'unknown',
                state: (inst.State?.Name as any) || 'unknown',
                region: reg,
                regionName: getFriendlyRegionName(reg),
                privateIp: inst.PrivateIpAddress,
                publicIp: inst.PublicIpAddress,
                launchTime: inst.LaunchTime ? new Date(inst.LaunchTime).toISOString() : undefined,
                tags: tagsMap,
                vpcId: inst.VpcId,
                subnetId: inst.SubnetId
              });
            }
          }
        } catch (err: any) {
          console.warn(`[INVENTORY] EC2 scan error in ${reg}:`, err.message);
        }
      });

      // 2. Scan S3 Buckets
      const s3Scan = (async () => {
        try {
          const s3Client = getS3Client();
          const s3Res = await executeSafeReadOnlyOperation('ListBuckets', async () => {
            return await s3Client.send(new ListBucketsCommand({}));
          });

          for (const b of s3Res.Buckets || []) {
            s3Buckets.push({
              name: b.Name || 'unknown',
              creationDate: b.CreationDate ? new Date(b.CreationDate).toISOString() : undefined
            });
          }
        } catch (err: any) {
          console.warn('[INVENTORY] S3 scan error:', err.message);
        }
      })();

      // 3. Scan RDS across primary regions in parallel
      const rdsRegionScans = ['ap-south-1', 'us-east-1', 'us-west-2'].map(async (reg) => {
        try {
          const rdsClient = getRdsClient(reg);
          const rdsRes = await executeSafeReadOnlyOperation('DescribeDBInstances', async () => {
            return await rdsClient.send(new DescribeDBInstancesCommand({ MaxRecords: 20 }));
          });

          for (const db of rdsRes.DBInstances || []) {
            activeRegionsSet.add(reg);
            rdsInstances.push({
              dbInstanceIdentifier: db.DBInstanceIdentifier || 'unknown',
              engine: db.Engine || 'unknown',
              dbInstanceClass: db.DBInstanceClass || 'unknown',
              status: db.DBInstanceStatus || 'unknown',
              allocatedStorageGb: db.AllocatedStorage,
              region: reg,
              multiAz: db.MultiAZ,
              endpoint: db.Endpoint?.Address
            });
          }
        } catch {
          // RDS may have 0 instances or region disabled
        }
      });

      await Promise.all([...ec2RegionScans, s3Scan, ...rdsRegionScans]);

      // Sort EC2: running first, then by name
      ec2Instances.sort((a, b) => {
        if (a.state === 'running' && b.state !== 'running') return -1;
        if (a.state !== 'running' && b.state === 'running') return 1;
        return a.name.localeCompare(b.name);
      });

      const runningCount = ec2Instances.filter(i => i.state === 'running').length;
      const stoppedCount = ec2Instances.filter(i => i.state === 'stopped').length;

      const summary: ResourceInventorySummary = {
        scannedAt: new Date().toISOString(),
        totalEc2Instances: ec2Instances.length,
        runningEc2Instances: runningCount,
        stoppedEc2Instances: stoppedCount,
        totalS3Buckets: s3Buckets.length,
        totalRdsDatabases: rdsInstances.length,
        activeRegions: Array.from(activeRegionsSet),
        ec2Instances,
        s3Buckets,
        rdsInstances
      };

      globalCache.set(cacheKey, summary);
      return summary;
    } catch (err: any) {
      console.warn('[INVENTORY] Live scan failed, using fallback:', err.message);
      const stale = globalCache.getStale<ResourceInventorySummary>(cacheKey);
      return stale || this.getMockInventory();
    }
  }

  public static async getCloudTrailActivity(limit = 60): Promise<{
    events: CloudTrailActivityItem[];
    topUsers: { username: string; count: number }[];
    topActions: { action: string; count: number }[];
  }> {
    const safeLimit = Math.min(200, Math.max(1, limit));

    if (isDemoModeEnabled()) {
      return this.getMockCloudTrailActivity();
    }

    const cacheKey = `cloudtrail_activity_${safeLimit}`;
    const cached = globalCache.get<any>(cacheKey, 5 * 60 * 1000); // 5 min TTL
    if (cached) return cached;

    const auth = await CostExplorerService.getAuthStatus();
    if (auth.isDemoMode || !auth.isAuthenticated) {
      const stale = globalCache.getStale<any>(cacheKey) || globalCache.getStale<any>('cloudtrail_activity_80');
      return stale || this.getMockCloudTrailActivity();
    }

    try {
      const ctRegion = auth.region || 'ap-south-1';
      const ctClient = getCloudTrailClient(ctRegion);
      const ctRes = await executeSafeReadOnlyOperation('LookupEvents', async () => {
        return await ctClient.send(new LookupEventsCommand({ MaxResults: safeLimit }));
      });

      const events: CloudTrailActivityItem[] = (ctRes.Events || []).map(ev => {
        return {
          eventId: ev.EventId || String(Math.random()),
          eventTime: ev.EventTime ? new Date(ev.EventTime).toISOString() : new Date().toISOString(),
          eventName: ev.EventName || 'Unknown',
          username: ev.Username || 'system / aws-service',
          region: ctRegion,
          resourceName: ev.Resources?.[0]?.ResourceName,
          resourceType: ev.Resources?.[0]?.ResourceType
        };
      });

      const userCounts = new Map<string, number>();
      const actionCounts = new Map<string, number>();

      for (const ev of events) {
        userCounts.set(ev.username, (userCounts.get(ev.username) || 0) + 1);
        actionCounts.set(ev.eventName, (actionCounts.get(ev.eventName) || 0) + 1);
      }

      const topUsers = Array.from(userCounts.entries())
        .map(([username, count]) => ({ username, count }))
        .sort((a, b) => b.count - a.count);

      const topActions = Array.from(actionCounts.entries())
        .map(([action, count]) => ({ action, count }))
        .sort((a, b) => b.count - a.count);

      const result = { events, topUsers, topActions };
      globalCache.set(cacheKey, result);
      return result;
    } catch (err: any) {
      console.warn('[CLOUDTRAIL] Activity lookup failed:', err.message);
      const stale = globalCache.getStale<any>(cacheKey) || globalCache.getStale<any>('cloudtrail_activity_80');
      return stale || this.getMockCloudTrailActivity();
    }
  }

  private static getMockInventory(): ResourceInventorySummary {
    return {
      scannedAt: new Date().toISOString(),
      totalEc2Instances: 15,
      runningEc2Instances: 10,
      stoppedEc2Instances: 5,
      totalS3Buckets: 49,
      totalRdsDatabases: 2,
      activeRegions: ['ap-south-1', 'us-west-2', 'us-east-1'],
      ec2Instances: [
        {
          instanceId: 'i-0a1b2c3d4e5f60001',
          name: 'prod-core-api-server-01',
          instanceType: 't3.large',
          state: 'running',
          region: 'ap-south-1',
          regionName: 'Asia Pacific (Mumbai)',
          privateIp: '10.0.12.19',
          publicIp: '203.0.113.50',
          tags: { Environment: 'production', Project: 'core-platform', Owner: 'devops' }
        },
        {
          instanceId: 'i-0a1b2c3d4e5f60002',
          name: 'prod-web-backend-v3',
          instanceType: 't3.medium',
          state: 'running',
          region: 'ap-south-1',
          regionName: 'Asia Pacific (Mumbai)',
          privateIp: '10.0.14.120',
          tags: { Environment: 'production', Project: 'customer-portal' }
        },
        {
          instanceId: 'i-0a1b2c3d4e5f60003',
          name: 'staging-gpu-ai-worker',
          instanceType: 'g4dn.xlarge',
          state: 'stopped',
          region: 'ap-south-1',
          regionName: 'Asia Pacific (Mumbai)',
          privateIp: '10.0.15.212',
          tags: { Environment: 'staging', Project: 'ai-inference-gpu' }
        },
        {
          instanceId: 'i-0a1b2c3d4e5f60004',
          name: 'us-west-edge-worker',
          instanceType: 't3.micro',
          state: 'running',
          region: 'us-west-2',
          regionName: 'US West (Oregon)',
          privateIp: '10.1.47.183',
          tags: { Environment: 'production' }
        }
      ],
      s3Buckets: [
        { name: 'company-backup-archives-prod', creationDate: '2024-03-12T10:00:00Z' },
        { name: 'core-application-assets-prod', creationDate: '2024-06-15T08:30:00Z' },
        { name: 'ml-training-datasets-archive', creationDate: '2025-01-20T14:15:00Z' }
      ],
      rdsInstances: [
        {
          dbInstanceIdentifier: 'prod-core-postgres-db1',
          engine: 'postgres',
          dbInstanceClass: 'db.r6g.large',
          status: 'available',
          allocatedStorageGb: 250,
          region: 'ap-south-1',
          multiAz: true,
          endpoint: 'prod-core-postgres-db1.cluster-ap-south-1.rds.amazonaws.com'
        },
        {
          dbInstanceIdentifier: 'staging-analytics-mysql',
          engine: 'mysql',
          dbInstanceClass: 'db.t4g.medium',
          status: 'stopped',
          allocatedStorageGb: 100,
          region: 'us-east-1',
          multiAz: false,
          endpoint: 'staging-analytics-mysql.us-east-1.rds.amazonaws.com'
        }
      ]
    };
  }

  private static getMockCloudTrailActivity() {
    return {
      events: [
        {
          eventId: '1',
          eventTime: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          eventName: 'DescribeInstances',
          username: 'finops-scheduler-automation',
          region: 'ap-south-1'
        },
        {
          eventId: '2',
          eventTime: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          eventName: 'GetCostAndUsage',
          username: 'cloud-admin@example.com',
          region: 'ap-south-1'
        }
      ],
      topUsers: [
        { username: 'finops-scheduler-automation', count: 42 },
        { username: 'cloud-admin@example.com', count: 18 }
      ],
      topActions: [
        { action: 'DescribeInstances', count: 52 },
        { action: 'GetCostAndUsage', count: 8 }
      ]
    };
  }
}
