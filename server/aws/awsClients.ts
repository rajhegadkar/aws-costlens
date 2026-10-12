import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { CostExplorerClient } from '@aws-sdk/client-cost-explorer';
import { STSClient } from '@aws-sdk/client-sts';
import { EC2Client } from '@aws-sdk/client-ec2';
import { RDSClient } from '@aws-sdk/client-rds';
import { S3Client } from '@aws-sdk/client-s3';
import { CloudTrailClient } from '@aws-sdk/client-cloudtrail';

let currentProfile: string | undefined = process.env.AWS_PROFILE || undefined;
let currentRegion: string = process.env.AWS_REGION || 'us-east-1';

/**
 * Discovers available AWS profile names from ~/.aws/credentials and ~/.aws/config
 */
export function getAvailableAwsProfiles(): string[] {
  const profiles = new Set<string>();
  const homeDir = os.homedir();

  const credPath = path.join(homeDir, '.aws', 'credentials');
  const configPath = path.join(homeDir, '.aws', 'config');

  const parseFile = (filePath: string) => {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        for (const line of lines) {
          const match = line.match(/^\s*\[(?:profile\s+)?([^\]]+)\]\s*$/);
          if (match && match[1]) {
            profiles.add(match[1].trim());
          }
        }
      }
    } catch {
      // Ignore read errors
    }
  };

  parseFile(credPath);
  parseFile(configPath);

  if (profiles.size === 0) {
    profiles.add('default');
  }

  return Array.from(profiles);
}

export function getCurrentProfile(): string | undefined {
  return currentProfile;
}

export function setCurrentProfile(profile: string | undefined) {
  currentProfile = profile;
}

export function getCurrentRegion(): string {
  return currentRegion;
}

export function setCurrentRegion(region: string) {
  currentRegion = region;
}

/**
 * Creates client configuration with standard AWS SDK credential resolution
 */
export function getClientConfig(regionOverride?: string) {
  const region = regionOverride || currentRegion;
  const config: any = {
    region
  };

  // If explicit credentials are provided in environment variables / .env
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    config.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID.trim(),
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY.trim(),
      ...(process.env.AWS_SESSION_TOKEN ? { sessionToken: process.env.AWS_SESSION_TOKEN.trim() } : {})
    };
  } else if (currentProfile && currentProfile !== 'default') {
    config.profile = currentProfile;
  }

  return config;
}

export function getCostExplorerClient(): CostExplorerClient {
  // Cost Explorer endpoint is global / us-east-1
  return new CostExplorerClient(getClientConfig('us-east-1'));
}

export function getStsClient(regionOverride?: string): STSClient {
  return new STSClient(getClientConfig(regionOverride));
}

export function getEc2Client(regionOverride?: string): EC2Client {
  return new EC2Client(getClientConfig(regionOverride));
}

export function getRdsClient(regionOverride?: string): RDSClient {
  return new RDSClient(getClientConfig(regionOverride));
}

export function getS3Client(regionOverride?: string): S3Client {
  return new S3Client(getClientConfig(regionOverride));
}

export function getCloudTrailClient(regionOverride?: string): CloudTrailClient {
  return new CloudTrailClient(getClientConfig(regionOverride));
}
