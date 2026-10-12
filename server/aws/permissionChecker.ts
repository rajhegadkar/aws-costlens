import { GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { GetCostAndUsageCommand } from '@aws-sdk/client-cost-explorer';
import { DescribeInstancesCommand } from '@aws-sdk/client-ec2';
import { DescribeDBInstancesCommand } from '@aws-sdk/client-rds';
import { ListBucketsCommand } from '@aws-sdk/client-s3';
import {
  getStsClient,
  getCostExplorerClient,
  getEc2Client,
  getRdsClient,
  getS3Client,
  getCurrentProfile,
  getCurrentRegion,
  getAvailableAwsProfiles
} from './awsClients.js';
import { executeSafeReadOnlyOperation } from '../security/awsGuard.js';
import { AuthStatus } from '../../shared/types.js';

export async function checkAwsPermissions(): Promise<AuthStatus> {
  const availableProfiles = getAvailableAwsProfiles();
  const currentProfile = getCurrentProfile();
  const currentRegion = getCurrentRegion();

  const status: AuthStatus = {
    isAuthenticated: false,
    region: currentRegion,
    profile: currentProfile || 'default',
    readOnlyMode: true, // Permanent read-only
    isDemoMode: false,
    permissions: {
      costExplorer: 'untested',
      sts: 'untested',
      ec2Read: 'untested',
      rdsRead: 'untested',
      s3Read: 'untested'
    },
    availableProfiles
  };

  // 1. Check STS Caller Identity (Read-only)
  try {
    const stsClient = getStsClient();
    const identity = await executeSafeReadOnlyOperation('GetCallerIdentity', async () => {
      return await stsClient.send(new GetCallerIdentityCommand({}));
    });

    if (identity && identity.Account) {
      status.isAuthenticated = true;
      status.accountId = identity.Account;
      status.arn = identity.Arn;
      status.permissions.sts = 'accessible';
    }
  } catch (err: any) {
    status.permissions.sts = 'denied';
    status.message = `AWS Credentials check failed: ${err.message || 'No valid credentials found in AWS credential chain'}.`;
    return status;
  }

  // 2. Check Cost Explorer (Read-only, minimal test range)
  try {
    const ceClient = getCostExplorerClient();
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 2);

    const startStr = yesterday.toISOString().split('T')[0];
    const endStr = new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    await executeSafeReadOnlyOperation('GetCostAndUsage', async () => {
      return await ceClient.send(new GetCostAndUsageCommand({
        TimePeriod: { Start: startStr, End: endStr },
        Granularity: 'DAILY',
        Metrics: ['UnblendedCost']
      }));
    });

    status.permissions.costExplorer = 'accessible';
  } catch (err: any) {
    status.permissions.costExplorer = 'denied';
    console.warn('[PERMISSION CHECK] Cost Explorer check failed:', err.message);
  }

  // 3. Check EC2 metadata read (Optional enrichment)
  try {
    const ec2Client = getEc2Client();
    await executeSafeReadOnlyOperation('DescribeInstances', async () => {
      return await ec2Client.send(new DescribeInstancesCommand({ MaxResults: 5 }));
    });
    status.permissions.ec2Read = 'accessible';
  } catch {
    status.permissions.ec2Read = 'denied';
  }

  // 4. Check RDS metadata read (Optional enrichment)
  try {
    const rdsClient = getRdsClient();
    await executeSafeReadOnlyOperation('DescribeDBInstances', async () => {
      return await rdsClient.send(new DescribeDBInstancesCommand({ MaxRecords: 20 }));
    });
    status.permissions.rdsRead = 'accessible';
  } catch {
    status.permissions.rdsRead = 'denied';
  }

  // 5. Check S3 metadata read (Optional enrichment)
  try {
    const s3Client = getS3Client();
    await executeSafeReadOnlyOperation('ListBuckets', async () => {
      return await s3Client.send(new ListBucketsCommand({}));
    });
    status.permissions.s3Read = 'accessible';
  } catch {
    status.permissions.s3Read = 'denied';
  }

  return status;
}
