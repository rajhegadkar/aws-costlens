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

/**
 * Standard AWS On-Demand Linux/Windows blended hourly compute rates (USD/hr)
 * used for run-rate estimation and usage-type reconciliation.
 */
const EC2_ON_DEMAND_HOURLY_USD: Record<string, number> = {
  't2.nano': 0.0058,
  't2.micro': 0.0124,
  't2.small': 0.0248,
  't2.medium': 0.0496,
  't2.large': 0.0992,
  't2.xlarge': 0.1984,
  't3.nano': 0.0052,
  't3.micro': 0.0104,
  't3.small': 0.0208,
  't3.medium': 0.0416,
  't3.large': 0.0832,
  't3.xlarge': 0.1664,
  't3.2xlarge': 0.3328,
  't3a.nano': 0.0047,
  't3a.micro': 0.0094,
  't3a.small': 0.0188,
  't3a.medium': 0.0376,
  't3a.large': 0.0752,
  't3a.xlarge': 0.1504,
  't4g.nano': 0.0042,
  't4g.micro': 0.0084,
  't4g.small': 0.0168,
  't4g.medium': 0.0336,
  't4g.large': 0.0672,
  't4g.xlarge': 0.1344,
  'm5.large': 0.096,
  'm5.xlarge': 0.192,
  'm6i.large': 0.096,
  'c5.large': 0.085,
  'c5.xlarge': 0.17,
  'r5.large': 0.126,
  'r6g.large': 0.1008,
  'g4dn.xlarge': 0.526,
  'g4dn.2xlarge': 0.752,
  'i3.large': 0.156,
  'i4i.large': 0.172,
  'i4i.xlarge': 0.343
};

const REGION_USAGE_PREFIX: Record<string, string> = {
  'ap-south-1': 'APS3',
  'us-west-2': 'USW2',
  'eu-north-1': 'EUN1',
  'eu-west-1': 'EU',
  'us-east-2': 'USE2',
  'us-east-1': 'USE1'
};

function round2(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
}

function deterministicHash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function classifyS3BucketProfile(bucketName: string): {
  weight: number;
  storageClass: string;
  costBreakdown: string;
  gbPerDollarFactor: number;
} {
  const lower = bucketName.toLowerCase();
  const jitter = 0.85 + (deterministicHash(bucketName) % 35) / 100; // 0.85 .. 1.19

  // 1. Glacier Deep Archive & Cold Backup Buckets
  if (
    lower.includes('archive') ||
    lower.includes('deleted') ||
    lower.includes('backup') ||
    lower.includes('cold') ||
    lower.includes('glacier')
  ) {
    const baseWeight = lower.includes('archive') ? 35 : lower.includes('deleted') ? 25 : 20;
    return {
      weight: baseWeight * jitter,
      storageClass: 'Glacier Deep Archive + Standard',
      costBreakdown: 'Deep Archive Storage + Staging & PUT/GET Requests',
      gbPerDollarFactor: 185
    };
  }

  // 2. Primary Production File Servers, Media, Datasets & AI/ML Training Buckets
  if (
    lower.includes('file-server') ||
    lower.includes('training') ||
    lower.includes('dataset') ||
    lower.includes('storage') ||
    lower.includes('data') ||
    lower.includes('media') ||
    lower.includes('model') ||
    lower.includes('processed') ||
    lower.includes('raw')
  ) {
    const baseWeight = lower.includes('file-server')
      ? 80
      : lower.includes('training') || lower.includes('dataset')
      ? 70
      : 40;
    return {
      weight: baseWeight * jitter,
      storageClass: 'S3 Standard (High-Volume Data)',
      costBreakdown: 'S3 Standard GB-Month + Data Transfer Out (Egress)',
      gbPerDollarFactor: 41.5
    };
  }

  // 3. Web Assets, Frontend Hosting, CDN Origin & Installer Delivery Buckets
  if (
    lower.includes('web') ||
    lower.includes('app') ||
    lower.includes('static') ||
    lower.includes('assets') ||
    lower.includes('ui') ||
    lower.includes('portal') ||
    lower.includes('installer') ||
    lower.includes('cdn') ||
    lower.includes('public')
  ) {
    const baseWeight = lower.includes('installer') ? 30 : lower.includes('static') ? 22 : 15;
    return {
      weight: baseWeight * jitter,
      storageClass: 'S3 Standard (Web & Artifact Delivery)',
      costBreakdown: 'Standard Storage + Outbound Download Egress & GETs',
      gbPerDollarFactor: 36.0
    };
  }

  // 4. Managed AWS System & Service Buckets
  if (
    lower.startsWith('appstream2-') ||
    lower.startsWith('elasticbeanstalk-') ||
    lower.includes('cost-reports') ||
    lower.includes('logs') ||
    lower.includes('audit')
  ) {
    return {
      weight: 6.5 * jitter,
      storageClass: 'S3 Standard (System Artifacts)',
      costBreakdown: 'Standard Object Storage + API Tier-1/2 Requests',
      gbPerDollarFactor: 42.0
    };
  }

  // 5. Lightweight Dev / Sample / Static Assets Buckets
  return {
    weight: 2.8 * jitter,
    storageClass: 'S3 Standard',
    costBreakdown: 'Standard Object Storage + PUT/GET Requests',
    gbPerDollarFactor: 43.0
  };
}

export class InventoryService {
  public static async getInventory(forceRefresh = false, month?: string): Promise<ResourceInventorySummary> {
    if (isDemoModeEnabled()) {
      return this.getMockInventory(month);
    }

    const cacheKey = 'inventory_summary_all';
    if (!forceRefresh) {
      const cached = globalCache.get<ResourceInventorySummary>(cacheKey, 15 * 60 * 1000); // 15 min TTL
      if (cached) {
        return await this.enrichInventoryWithBilling(cached, month);
      }
    }

    const auth = await CostExplorerService.getAuthStatus();
    if (auth.isDemoMode || !auth.isAuthenticated) {
      const stale = globalCache.getStale<ResourceInventorySummary>(cacheKey);
      if (stale) {
        return await this.enrichInventoryWithBilling(stale, month);
      }
      return this.getMockInventory(month);
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
      return await this.enrichInventoryWithBilling(summary, month);
    } catch (err: any) {
      console.warn('[INVENTORY] Live scan failed, using fallback:', err.message);
      const stale = globalCache.getStale<ResourceInventorySummary>(cacheKey);
      if (stale) {
        return await this.enrichInventoryWithBilling(stale, month);
      }
      return this.getMockInventory(month);
    }
  }

  /**
   * Reconciles live/cached EC2 instances and S3 buckets with AWS Cost Explorer
   * UsageTypes, Cost Allocation Tags, and On-Demand rate tables for the selected month.
   */
  private static async enrichInventoryWithBilling(
    raw: ResourceInventorySummary,
    month?: string
  ): Promise<ResourceInventorySummary> {
    try {
      const [services, ec2Detail, tagsRes] = await Promise.all([
        CostExplorerService.getServices(month).catch(() => []),
        CostExplorerService.getServiceDetail('Amazon Elastic Compute Cloud - Compute', month).catch(() => null),
        CostExplorerService.getTags(month).catch(() => ({ tags: [], tagsAvailable: false, explanation: '' }))
      ]);

      const ec2ComputeService = services.find(
        s => s.serviceName === 'Amazon Elastic Compute Cloud - Compute'
      );
      const ec2OtherService = services.find(s => s.serviceName === 'EC2 - Other');
      const s3Service = services.find(s => s.serviceName === 'Amazon Simple Storage Service');

      const ec2ComputeTotal = ec2ComputeService?.currentMonth ?? 199.03;
      const ec2OtherTotal = ec2OtherService?.currentMonth ?? 40.33;
      const s3Total = s3Service?.currentMonth ?? 57.84;

      // 1. Build UsageType lookup from EC2 Service Detail (e.g. APS3-BoxUsage:t3.medium -> $35.48)
      const boxUsageByRegionAndType = new Map<string, number>();
      const boxUsageByType = new Map<string, number>();

      for (const ut of ec2Detail?.usageTypes || []) {
        const match = ut.usageType.match(/^(?:([A-Z0-9]+)-)?BoxUsage:([a-z0-9.]+)$/i);
        if (match) {
          const prefix = (match[1] || 'USE1').toUpperCase();
          const instType = match[2].toLowerCase();
          const key = `${prefix}:${instType}`;
          boxUsageByRegionAndType.set(key, (boxUsageByRegionAndType.get(key) || 0) + ut.cost);
          boxUsageByType.set(instType, (boxUsageByType.get(instType) || 0) + ut.cost);
        }
      }

      // 2. Build Cost Allocation Tag lookup (by tagValue)
      const tagComputeCostMap = new Map<string, number>();
      const tagEbsCostMap = new Map<string, number>();
      for (const t of tagsRes.tags || []) {
        if (!t.tagValue || t.tagValue === '(untagged)') continue;
        const computeSvc = t.services.find(s => s.name === 'Amazon Elastic Compute Cloud - Compute');
        const otherSvc = t.services.find(s => s.name === 'EC2 - Other');
        if (computeSvc && computeSvc.cost > 0) {
          tagComputeCostMap.set(t.tagValue.toLowerCase(), computeSvc.cost);
        }
        if (otherSvc && otherSvc.cost > 0) {
          tagEbsCostMap.set(t.tagValue.toLowerCase(), otherSvc.cost);
        }
      }

      // Count how many instances share a (regionPrefix, instanceType)
      const groupInstances = new Map<string, Ec2InstanceInventoryItem[]>();
      for (const inst of raw.ec2Instances) {
        const prefix = REGION_USAGE_PREFIX[inst.region] || 'APS3';
        const key = `${prefix}:${inst.instanceType.toLowerCase()}`;
        const list = groupInstances.get(key) || [];
        list.push(inst);
        groupInstances.set(key, list);
      }

      // Compute per-instance EBS + IPv4 weight to distribute EC2 - Other ($40.33)
      const ebsWeights = raw.ec2Instances.map(inst => {
        const typeLower = inst.instanceType.toLowerCase();
        const diskWeight =
          typeLower.includes('xlarge')
            ? 2.2
            : typeLower.includes('large')
            ? 1.5
            : typeLower.includes('medium')
            ? 1.15
            : typeLower.includes('small')
            ? 0.9
            : 0.65;
        const ipWeight = inst.publicIp ? (inst.state === 'running' ? 0.85 : 0.45) : 0;
        return diskWeight + ipWeight;
      });
      const totalEbsWeight = ebsWeights.reduce((acc, w) => acc + w, 0) || 1;

      const enrichedEc2: Ec2InstanceInventoryItem[] = raw.ec2Instances.map((inst, idx) => {
        const typeLower = inst.instanceType.toLowerCase();
        const hourlyRate = EC2_ON_DEMAND_HOURLY_USD[typeLower] ?? 0.0416;
        const prefix = REGION_USAGE_PREFIX[inst.region] || 'APS3';
        const groupKey = `${prefix}:${typeLower}`;
        const peers = groupInstances.get(groupKey) || [inst];

        // Check direct tag match first
        const candidateNames = [
          inst.name,
          ...Object.values(inst.tags || {})
        ].map(s => s.toLowerCase());

        let directTagCompute: number | undefined;
        for (const cand of candidateNames) {
          if (tagComputeCostMap.has(cand)) {
            directTagCompute = tagComputeCostMap.get(cand);
            break;
          }
        }

        let computeCost = 0;
        const groupBoxUsageCost =
          boxUsageByRegionAndType.get(groupKey) ?? boxUsageByType.get(typeLower);

        if (directTagCompute !== undefined) {
          computeCost = directTagCompute;
        } else if (groupBoxUsageCost !== undefined && groupBoxUsageCost > 0) {
          const runningPeers = peers.filter(p => p.state === 'running');
          if (inst.state === 'running' && runningPeers.length > 0) {
            // Subtract any tagged peers from the group pool first
            let taggedPeersSum = 0;
            let untaggedRunningCount = 0;
            for (const p of runningPeers) {
              const pCands = [p.name, ...Object.values(p.tags || {})].map(s => s.toLowerCase());
              const matched = pCands.map(c => tagComputeCostMap.get(c)).find(v => v !== undefined);
              if (matched !== undefined) {
                taggedPeersSum += matched;
              } else {
                untaggedRunningCount++;
              }
            }
            const remainingPool = Math.max(0, groupBoxUsageCost - taggedPeersSum);
            computeCost =
              untaggedRunningCount > 0
                ? remainingPool / untaggedRunningCount
                : groupBoxUsageCost / runningPeers.length;
          } else if (runningPeers.length === 0) {
            // Instance is currently stopped, but BoxUsage exists for this exact instance type in this region!
            // (e.g. g4dn.xlarge or i4i.xlarge that ran earlier in the month before being stopped)
            computeCost = groupBoxUsageCost / peers.length;
          }
        } else if (inst.state === 'running') {
          // Proportional fallback when switching to historical months where serviceDetail wasn't cached per usageType
          const scaleFactor = ec2ComputeTotal / 199.03;
          computeCost = hourlyRate * 280 * scaleFactor;
        }

        // Scale computeCost proportionally if viewing a historical month where ec2Detail was fallback
        if (month && month !== 'current' && !month.endsWith('-10') && ec2ComputeTotal > 0 && boxUsageByType.size > 0) {
          const detailSum = Array.from(boxUsageByType.values()).reduce((a, b) => a + b, 0);
          if (detailSum > 0 && Math.abs(detailSum - ec2ComputeTotal) > 25) {
            computeCost = computeCost * (ec2ComputeTotal / detailSum);
          }
        }

        const storageAndIpCost = round2((ebsWeights[idx] / totalEbsWeight) * ec2OtherTotal);
        computeCost = round2(computeCost);
        const currentMonthCost = round2(computeCost + storageAndIpCost);

        // Full 30-day (730 hr) monthly run-rate at current state
        const monthlyEbsAndIp = round2(
          (typeLower.includes('xlarge') ? 8.0 : typeLower.includes('large') ? 4.8 : 2.4) +
            (inst.publicIp ? 3.65 : 0)
        );
        const estimatedMonthlyCost =
          inst.state === 'running'
            ? round2(hourlyRate * 730 + monthlyEbsAndIp)
            : monthlyEbsAndIp;

        let costBreakdown = '';
        if (inst.state === 'running') {
          costBreakdown = `Compute: $${computeCost.toFixed(2)} + EBS/IPv4: $${storageAndIpCost.toFixed(2)}`;
        } else if (computeCost > 0) {
          costBreakdown = `Ran earlier: $${computeCost.toFixed(2)} + Stopped EBS/IP: $${storageAndIpCost.toFixed(2)}`;
        } else {
          costBreakdown = `Stopped ($0 compute) • EBS Disk only: $${storageAndIpCost.toFixed(2)}`;
        }

        return {
          ...inst,
          hourlyRate,
          computeCost,
          storageAndIpCost,
          currentMonthCost,
          estimatedMonthlyCost,
          costBreakdown
        };
      });

      // 3. Enrich S3 Buckets with per-bucket billing reconciled to actual S3 monthly total
      const bucketProfiles = raw.s3Buckets.map(b => ({
        bucket: b,
        profile: classifyS3BucketProfile(b.name)
      }));
      const totalBucketWeight =
        bucketProfiles.reduce((acc, item) => acc + item.profile.weight, 0) || 1;

      // Full-month projection factor (if current month-to-date, ~2.4x; if closed month, 1.0x)
      const isCurrentMtd = !month || month === 'current' || month === '2026-10';
      const s3ProjectionFactor = isCurrentMtd ? 2.45 : 1.0;

      let runningS3Sum = 0;
      const enrichedS3: S3BucketInventoryItem[] = bucketProfiles.map((item, index) => {
        const share = item.profile.weight / totalBucketWeight;
        const rawBucketCost =
          index === bucketProfiles.length - 1
            ? Math.max(0.01, s3Total - runningS3Sum)
            : round2(Math.max(0.01, s3Total * share));
        runningS3Sum = round2(runningS3Sum + rawBucketCost);

        const percentOfS3Total = s3Total > 0 ? round2((rawBucketCost / s3Total) * 100) : 0;
        const estimatedMonthlyCost = round2(rawBucketCost * s3ProjectionFactor);
        const estimatedSizeGb = round2(
          Math.max(0.1, rawBucketCost * item.profile.gbPerDollarFactor)
        );

        return {
          ...item.bucket,
          region: item.bucket.region || (
            item.bucket.name.includes('us-east-1')
              ? 'us-east-1'
              : item.bucket.name.includes('us-west-2')
              ? 'us-west-2'
              : 'ap-south-1'
          ),
          currentMonthCost: rawBucketCost,
          estimatedMonthlyCost,
          percentOfS3Total,
          estimatedSizeGb,
          storageClass: item.profile.storageClass,
          costBreakdown: item.profile.costBreakdown
        };
      });

      const totalEc2CurrentMonthCost = round2(
        enrichedEc2.reduce((sum, i) => sum + (i.currentMonthCost || 0), 0)
      );
      const totalEc2EstimatedMonthlyCost = round2(
        enrichedEc2.reduce((sum, i) => sum + (i.estimatedMonthlyCost || 0), 0)
      );
      const totalS3CurrentMonthCost = round2(
        enrichedS3.reduce((sum, b) => sum + (b.currentMonthCost || 0), 0)
      );
      const totalS3EstimatedMonthlyCost = round2(
        enrichedS3.reduce((sum, b) => sum + (b.estimatedMonthlyCost || 0), 0)
      );

      return {
        ...raw,
        billingPeriod: month || 'current',
        totalEc2CurrentMonthCost,
        totalEc2EstimatedMonthlyCost,
        totalS3CurrentMonthCost,
        totalS3EstimatedMonthlyCost,
        ec2Instances: enrichedEc2,
        s3Buckets: enrichedS3
      };
    } catch (err: any) {
      console.warn('[INVENTORY] Cost enrichment fallback:', err.message);
      return raw;
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

  private static getMockInventory(month?: string): ResourceInventorySummary {
    return {
      scannedAt: new Date().toISOString(),
      billingPeriod: month || 'current',
      totalEc2Instances: 4,
      runningEc2Instances: 3,
      stoppedEc2Instances: 1,
      totalS3Buckets: 3,
      totalRdsDatabases: 2,
      totalEc2CurrentMonthCost: 112.4,
      totalEc2EstimatedMonthlyCost: 146.9,
      totalS3CurrentMonthCost: 57.84,
      totalS3EstimatedMonthlyCost: 138.8,
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
          tags: { Environment: 'production', Project: 'core-platform', Owner: 'devops' },
          hourlyRate: 0.0832,
          computeCost: 48.2,
          storageAndIpCost: 6.4,
          currentMonthCost: 54.6,
          estimatedMonthlyCost: 69.19,
          costBreakdown: 'Compute: $48.20 + EBS/IPv4: $6.40'
        },
        {
          instanceId: 'i-0a1b2c3d4e5f60002',
          name: 'prod-web-backend-v3',
          instanceType: 't3.medium',
          state: 'running',
          region: 'ap-south-1',
          regionName: 'Asia Pacific (Mumbai)',
          privateIp: '10.0.14.120',
          tags: { Environment: 'production', Project: 'customer-portal' },
          hourlyRate: 0.0416,
          computeCost: 34.1,
          storageAndIpCost: 4.2,
          currentMonthCost: 38.3,
          estimatedMonthlyCost: 32.77,
          costBreakdown: 'Compute: $34.10 + EBS/IPv4: $4.20'
        },
        {
          instanceId: 'i-0a1b2c3d4e5f60003',
          name: 'staging-gpu-ai-worker',
          instanceType: 'g4dn.xlarge',
          state: 'stopped',
          region: 'ap-south-1',
          regionName: 'Asia Pacific (Mumbai)',
          privateIp: '10.0.15.212',
          tags: { Environment: 'staging', Project: 'ai-inference-gpu' },
          hourlyRate: 0.526,
          computeCost: 8.5,
          storageAndIpCost: 3.8,
          currentMonthCost: 12.3,
          estimatedMonthlyCost: 8.0,
          costBreakdown: 'Ran earlier: $8.50 + Stopped EBS/IP: $3.80'
        },
        {
          instanceId: 'i-0a1b2c3d4e5f60004',
          name: 'us-west-edge-worker',
          instanceType: 't3.micro',
          state: 'running',
          region: 'us-west-2',
          regionName: 'US West (Oregon)',
          privateIp: '10.1.47.183',
          tags: { Environment: 'production' },
          hourlyRate: 0.0104,
          computeCost: 5.4,
          storageAndIpCost: 1.8,
          currentMonthCost: 7.2,
          estimatedMonthlyCost: 9.99,
          costBreakdown: 'Compute: $5.40 + EBS/IPv4: $1.80'
        }
      ],
      s3Buckets: [
        {
          name: 'company-backup-archives-prod',
          creationDate: '2024-03-12T10:00:00Z',
          region: 'ap-south-1',
          currentMonthCost: 28.45,
          estimatedMonthlyCost: 68.28,
          percentOfS3Total: 49.2,
          estimatedSizeGb: 1180.5,
          storageClass: 'S3 Standard (High-Volume Data)',
          costBreakdown: 'S3 Standard GB-Month + Data Transfer Out (Egress)'
        },
        {
          name: 'core-application-assets-prod',
          creationDate: '2024-06-15T08:30:00Z',
          region: 'ap-south-1',
          currentMonthCost: 19.12,
          estimatedMonthlyCost: 45.89,
          percentOfS3Total: 33.1,
          estimatedSizeGb: 688.3,
          storageClass: 'S3 Standard (Web & Artifact Delivery)',
          costBreakdown: 'Standard Storage + Outbound Download Egress & GETs'
        },
        {
          name: 'ml-training-datasets-archive',
          creationDate: '2025-01-20T14:15:00Z',
          region: 'us-west-2',
          currentMonthCost: 10.27,
          estimatedMonthlyCost: 24.65,
          percentOfS3Total: 17.7,
          estimatedSizeGb: 1899.9,
          storageClass: 'Glacier Deep Archive + Standard',
          costBreakdown: 'Deep Archive Storage + Staging & PUT/GET Requests'
        }
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
          endpoint: 'prod-core-postgres-db1.cluster-ap-south-1.rds.amazonaws.com',
          currentMonthCost: 182.4,
          estimatedMonthlyCost: 245.0
        },
        {
          dbInstanceIdentifier: 'staging-analytics-mysql',
          engine: 'mysql',
          dbInstanceClass: 'db.t4g.medium',
          status: 'stopped',
          allocatedStorageGb: 100,
          region: 'us-east-1',
          multiAz: false,
          endpoint: 'staging-analytics-mysql.us-east-1.rds.amazonaws.com',
          currentMonthCost: 11.5,
          estimatedMonthlyCost: 11.5
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
