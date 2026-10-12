import {
  DashboardOverview,
  ServiceCostItem,
  ServiceDetailBreakdown,
  CostTimelinePoint,
  RegionCostItem,
  DailyCostSummary,
  CostAnomaly,
  CostSavings,
  TagSpendingItem,
  AccountSpendingItem,
  CategoryBreakdown,
  DrillDownNode,
  SearchQueryResult,
  CostInsight
} from '../../shared/types.js';
import { explainService, explainUsageType, AWS_REGIONS_DIRECTORY } from '../../shared/explanationDictionary.js';

export class MockDataService {
  public static getDashboardOverview(): DashboardOverview {
    const insights: CostInsight[] = [
      {
        id: 'ins-1',
        type: 'warning',
        title: 'EC2 Spending Surge',
        message: 'EC2 spending is 18.4% higher than last month, driven primarily by on-demand m5.large instances in us-east-1.',
        service: 'Amazon Elastic Compute Cloud - Compute',
        amountChange: 311.21
      },
      {
        id: 'ins-2',
        type: 'savings',
        title: 'RDS Optimization Success',
        message: 'RDS spending decreased by 18.2% after rightsizing non-production instances, saving $184.10 this month.',
        service: 'Amazon Relational Database Service',
        amountChange: -184.10
      },
      {
        id: 'ins-3',
        type: 'increase',
        title: 'S3 Storage Growth',
        message: 'S3 storage grew by 9.8% ($28.12) due to database snapshot archives in us-east-1.',
        service: 'Amazon Simple Storage Service',
        amountChange: 28.12
      },
      {
        id: 'ins-4',
        type: 'neutral',
        title: 'Region Concentration',
        message: 'US East (N. Virginia) accounts for 49.1% ($2,104.73) of your total AWS bill.',
        amountChange: 0
      }
    ];

    return {
      currentMonthSpend: 4283.72,
      previousMonthSpend: 3810.25,
      spendChangePercent: 12.43,
      todayEstimated: 142.80,
      avgDailySpend: 171.35,
      projectedMonthEnd: 5120.40,
      projectedRange: {
        min: 4850.00,
        max: 5430.00
      },
      topService: {
        name: 'Amazon Elastic Compute Cloud - Compute',
        amount: 1843.21,
        percentage: 43.03
      },
      topRegion: {
        name: 'US East (N. Virginia)',
        amount: 2104.73,
        percentage: 49.13
      },
      activeServicesCount: 14,
      currency: 'USD',
      lastUpdated: new Date().toISOString(),
      isDemoMode: true,
      authStatus: {
        isAuthenticated: false,
        region: 'us-east-1',
        readOnlyMode: true,
        isDemoMode: true,
        permissions: {
          costExplorer: 'untested',
          sts: 'untested',
          ec2Read: 'untested',
          rdsRead: 'untested',
          s3Read: 'untested'
        },
        availableProfiles: ['default'],
        message: 'Demo Mode Active (Sample AWS billing data loaded). Configure AWS CLI credentials to connect to live account.'
      },
      insights
    };
  }

  public static getServices(): ServiceCostItem[] {
    const rawServices = [
      { name: 'Amazon Elastic Compute Cloud - Compute', current: 1843.21, prev: 1532.00, cat: 'Compute' as const },
      { name: 'Amazon Relational Database Service', current: 824.50, prev: 1008.60, cat: 'Database' as const },
      { name: 'EC2 - Other', current: 486.30, prev: 420.10, cat: 'Compute' as const },
      { name: 'Amazon Simple Storage Service', current: 312.45, prev: 284.33, cat: 'Storage' as const },
      { name: 'Amazon Virtual Private Cloud', current: 248.10, prev: 195.40, cat: 'Networking' as const },
      { name: 'Amazon CloudWatch', current: 186.20, prev: 142.15, cat: 'Management' as const },
      { name: 'AWS Data Transfer', current: 142.30, prev: 98.70, cat: 'Networking' as const },
      { name: 'Elastic Load Balancing', current: 98.65, prev: 92.10, cat: 'Networking' as const },
      { name: 'Amazon DynamoDB', current: 64.20, prev: 58.40, cat: 'Database' as const },
      { name: 'AWS Lambda', current: 38.42, prev: 42.10, cat: 'Compute' as const },
      { name: 'AWS Secrets Manager', current: 18.40, prev: 16.80, cat: 'Security' as const },
      { name: 'Amazon Route 53', current: 12.00, prev: 12.00, cat: 'Networking' as const },
      { name: 'Amazon Simple Notification Service', current: 4.80, prev: 4.20, cat: 'Management' as const },
      { name: 'AWS Key Management Service', current: 2.19, prev: 3.47, cat: 'Security' as const }
    ];

    const totalCurrent = rawServices.reduce((sum, s) => sum + s.current, 0);

    return rawServices.map(s => {
      const changeAmount = s.current - s.prev;
      const changePercent = Number(((changeAmount / s.prev) * 100).toFixed(1));
      const percentOfTotal = Number(((s.current / totalCurrent) * 100).toFixed(1));
      const exp = explainService(s.name);

      return {
        serviceName: s.name,
        currentMonth: s.current,
        previousMonth: s.prev,
        changeAmount: Number(changeAmount.toFixed(2)),
        changePercent,
        percentOfTotal,
        category: s.cat,
        description: exp.shortSummary,
        plainEnglishExplanation: exp.detailedExplanation
      };
    }).sort((a, b) => b.currentMonth - a.currentMonth);
  }

  public static getServiceDetail(serviceName: string): ServiceDetailBreakdown {
    const exp = explainService(serviceName);

    if (serviceName.toLowerCase().includes('elastic compute cloud') || serviceName.toLowerCase().includes('ec2')) {
      return {
        serviceName,
        totalCost: 1843.21,
        previousMonthCost: 1532.00,
        changePercent: 20.31,
        explanation: exp.detailedExplanation,
        subcategories: [
          { name: 'Compute Instance Hours (On-Demand)', cost: 1421.22, percent: 77.1, explanation: 'Hourly charges for running EC2 virtual machines.' },
          { name: 'EBS Block Storage (Hard drives)', cost: 242.21, percent: 13.1, explanation: 'Disk space provisioned for your instances, billed even when instances are stopped.' },
          { name: 'Data Transfer (Network Egress)', cost: 84.32, percent: 4.6, explanation: 'Internet traffic generated by your EC2 instances.' },
          { name: 'Elastic IP Addresses', cost: 31.21, percent: 1.7, explanation: 'Charges for unallocated or allocated static public IPv4 addresses ($0.005/hr).' },
          { name: 'Other EC2 Ancillary Features', cost: 64.25, percent: 3.5, explanation: 'Detailed monitoring, elastic network interfaces, and miscellaneous charges.' }
        ],
        usageTypes: [
          { usageType: 'BoxUsage:m5.large', cost: 712.40, percent: 38.6, explanation: 'General purpose 2 vCPU, 8GB RAM virtual servers in us-east-1.' },
          { usageType: 'BoxUsage:c5.xlarge', cost: 520.10, percent: 28.2, explanation: 'Compute-optimized 4 vCPU, 8GB RAM instances for backend processing.' },
          { usageType: 'BoxUsage:t4g.small', cost: 188.72, percent: 10.2, explanation: 'Cost-effective Graviton2 ARM servers for light web traffic.' },
          { usageType: 'EBS:VolumeUsage.gp3', cost: 198.40, percent: 10.8, explanation: 'Next-gen General Purpose SSD storage volumes.' },
          { usageType: 'EBS:SnapshotUsage', cost: 43.81, percent: 2.4, explanation: 'Incremental backup snapshots stored in AWS S3.' },
          { usageType: 'DataTransfer-Out-Bytes', cost: 84.32, percent: 4.6, explanation: 'Data sent from EC2 servers out to users on the internet.' },
          { usageType: 'PublicIPv4:InUseAddress', cost: 31.21, percent: 1.7, explanation: 'AWS charge of $0.005/hour for in-use and idle public IPv4 addresses.' },
          { usageType: 'Other', cost: 64.25, percent: 3.5, explanation: 'Miscellaneous usage codes.' }
        ],
        operations: [
          { operation: 'RunInstances', cost: 1421.22, percent: 77.1, explanation: 'Starting and running virtual machine instances.' },
          { operation: 'CreateVolume / Storage', cost: 242.21, percent: 13.1, explanation: 'Provisioned hard drive disk space.' },
          { operation: 'DataTransferOut', cost: 84.32, percent: 4.6, explanation: 'Outbound internet network traffic.' },
          { operation: 'AllocateAddress', cost: 31.21, percent: 1.7, explanation: 'Public IPv4 address allocation.' },
          { operation: 'Other', cost: 64.25, percent: 3.5, explanation: 'Other EC2 API operations.' }
        ],
        regions: [
          { region: 'us-east-1', regionName: 'US East (N. Virginia)', cost: 1324.50, percent: 71.9 },
          { region: 'us-west-2', regionName: 'US West (Oregon)', cost: 380.20, percent: 20.6 },
          { region: 'eu-west-1', regionName: 'Europe (Ireland)', cost: 138.51, percent: 7.5 }
        ]
      };
    }

    if (serviceName.toLowerCase().includes('relational database') || serviceName.toLowerCase().includes('rds')) {
      return {
        serviceName,
        totalCost: 824.50,
        previousMonthCost: 1008.60,
        changePercent: -18.25,
        explanation: exp.detailedExplanation,
        subcategories: [
          { name: 'Database Instance (Compute Engine)', cost: 580.30, percent: 70.4, explanation: 'Running PostgreSQL/MySQL database server instance.' },
          { name: 'Database Storage (gp3 SSD)', cost: 142.10, percent: 17.2, explanation: 'Allocated disk space for database tables and indexes.' },
          { name: 'Automated Backups & Snapshots', cost: 64.50, percent: 7.8, explanation: 'Retention of daily point-in-time recovery backup snapshots.' },
          { name: 'Multi-AZ Standby Replication', cost: 37.60, percent: 4.6, explanation: 'Synchronous replication to a secondary availability zone.' }
        ],
        usageTypes: [
          { usageType: 'InstanceUsage:db.r6g.large', cost: 410.20, percent: 49.8, explanation: 'Memory-optimized Graviton database instance in production.' },
          { usageType: 'InstanceUsage:db.t4g.medium', cost: 170.10, percent: 20.6, explanation: 'Development database instance.' },
          { usageType: 'RDS:gp3-Storage', cost: 142.10, percent: 17.2, explanation: 'Provisioned 500GB SSD database storage.' },
          { usageType: 'RDS:ChargedBackupUsage', cost: 64.50, percent: 7.8, explanation: 'Backup storage exceeding free quota.' },
          { usageType: 'Other', cost: 37.60, percent: 4.6, explanation: 'Minor data transfer and replication.' }
        ],
        operations: [
          { operation: 'CreateDBInstance', cost: 580.30, percent: 70.4, explanation: 'Running managed database instances.' },
          { operation: 'StorageAllocation', cost: 142.10, percent: 17.2, explanation: 'Database storage disk space.' },
          { operation: 'CreateDBSnapshot', cost: 64.50, percent: 7.8, explanation: 'Automated backup archives.' },
          { operation: 'Other', cost: 37.60, percent: 4.6, explanation: 'Minor operations.' }
        ],
        regions: [
          { region: 'us-east-1', regionName: 'US East (N. Virginia)', cost: 620.00, percent: 75.2 },
          { region: 'us-west-2', regionName: 'US West (Oregon)', cost: 204.50, percent: 24.8 }
        ]
      };
    }

    // Default breakdown for other services
    return {
      serviceName,
      totalCost: 312.45,
      previousMonthCost: 284.33,
      changePercent: 9.89,
      explanation: exp.detailedExplanation,
      subcategories: [
        { name: 'Primary Resource Usage', cost: 220.00, percent: 70.4, explanation: 'Main service runtime charges.' },
        { name: 'Storage / Retention', cost: 62.45, percent: 20.0, explanation: 'Data stored or retained.' },
        { name: 'API Requests & Operations', cost: 30.00, percent: 9.6, explanation: 'API call volume.' }
      ],
      usageTypes: [
        { usageType: 'StandardUsage', cost: 220.00, percent: 70.4, explanation: 'Standard tier consumption.' },
        { usageType: 'StorageUsage', cost: 62.45, percent: 20.0, explanation: 'Stored data volume.' },
        { usageType: 'RequestTier1', cost: 30.00, percent: 9.6, explanation: 'Write/Upload API calls.' }
      ],
      operations: [
        { operation: 'StandardOperation', cost: 220.00, percent: 70.4, explanation: 'Standard runtime.' },
        { operation: 'StorageRetention', cost: 62.45, percent: 20.0, explanation: 'Data holding.' },
        { operation: 'ApiRequests', cost: 30.00, percent: 9.6, explanation: 'API requests.' }
      ],
      regions: [
        { region: 'us-east-1', regionName: 'US East (N. Virginia)', cost: 218.70, percent: 70.0 },
        { region: 'us-west-2', regionName: 'US West (Oregon)', cost: 93.75, percent: 30.0 }
      ]
    };
  }

  public static getCostTimeline(period: 'daily' | 'weekly' | 'monthly' = 'daily'): CostTimelinePoint[] {
    const points: CostTimelinePoint[] = [];
    const now = new Date();

    if (period === 'daily') {
      // 30 days of daily data
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];

        // Weekend vs weekday pattern
        const dayOfWeek = d.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const multiplier = isWeekend ? 0.75 : 1.0;

        // Introduce a slight spike on day 12 for anomaly detection demo
        const spikeMultiplier = i === 12 ? 1.6 : 1.0;

        const ec2 = Number((58.0 * multiplier * spikeMultiplier + (Math.sin(i) * 3)).toFixed(2));
        const rds = Number((27.5 * multiplier + (Math.cos(i) * 1.5)).toFixed(2));
        const s3 = Number((10.4 + (i * 0.05)).toFixed(2)); // gradual growth
        const vpc = Number((8.2 * multiplier * (i === 12 ? 2.1 : 1.0)).toFixed(2));
        const cloudwatch = Number((6.2 + (Math.sin(i * 2) * 0.8)).toFixed(2));
        const other = Number((14.5 * multiplier).toFixed(2));

        const total = Number((ec2 + rds + s3 + vpc + cloudwatch + other).toFixed(2));
        const prevTotal = Number((total * 0.9).toFixed(2));

        points.push({
          date: dateStr,
          total,
          previousPeriodTotal: prevTotal,
          forecast: i < 5 ? Number((total * 1.02).toFixed(2)) : undefined,
          services: {
            'EC2': ec2,
            'RDS': rds,
            'S3': s3,
            'VPC': vpc,
            'CloudWatch': cloudwatch,
            'Other': other
          }
        });
      }
    } else if (period === 'weekly') {
      // 12 weeks
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - (i * 7));
        const dateStr = `Week of ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

        const base = 850 + (12 - i) * 20;
        const total = Number((base + Math.sin(i) * 40).toFixed(2));
        points.push({
          date: dateStr,
          total,
          previousPeriodTotal: Number((total * 0.92).toFixed(2)),
          services: {
            'EC2': Number((total * 0.43).toFixed(2)),
            'RDS': Number((total * 0.19).toFixed(2)),
            'S3': Number((total * 0.07).toFixed(2)),
            'VPC': Number((total * 0.06).toFixed(2)),
            'CloudWatch': Number((total * 0.05).toFixed(2)),
            'Other': Number((total * 0.20).toFixed(2))
          }
        });
      }
    } else {
      // Monthly view (last 6 months + 1 forecast month)
      const months = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct (Current)', 'Nov (Forecast)'];
      const totals = [3420, 3580, 3750, 3810, 4120, 4283.72, 5120.40];

      months.forEach((m, idx) => {
        const total = totals[idx];
        const isForecast = idx === 6;
        points.push({
          date: m,
          total: isForecast ? 0 : total,
          forecast: isForecast ? total : undefined,
          previousPeriodTotal: Number((total * 0.88).toFixed(2)),
          services: {
            'EC2': Number((total * 0.43).toFixed(2)),
            'RDS': Number((total * 0.19).toFixed(2)),
            'S3': Number((total * 0.07).toFixed(2)),
            'VPC': Number((total * 0.06).toFixed(2)),
            'CloudWatch': Number((total * 0.05).toFixed(2)),
            'Other': Number((total * 0.20).toFixed(2))
          }
        });
      });
    }

    return points;
  }

  public static getRegions(): RegionCostItem[] {
    const raw = [
      { code: 'us-east-1', cost: 2104.73, prev: 1840.10, services: 12 },
      { code: 'us-west-2', cost: 842.10, prev: 790.30, services: 9 },
      { code: 'ap-south-1', cost: 531.40, prev: 420.00, services: 6 },
      { code: 'eu-west-1', cost: 420.50, prev: 460.20, services: 7 },
      { code: 'global', cost: 234.10, prev: 180.50, services: 3 },
      { code: 'ap-southeast-1', cost: 150.89, prev: 119.15, services: 4 }
    ];

    const total = raw.reduce((sum, r) => sum + r.cost, 0);

    return raw.map(r => {
      const info = AWS_REGIONS_DIRECTORY[r.code] || { name: r.code, country: 'Unknown', flag: '📍' };
      const changeAmount = r.cost - r.prev;
      const changePercent = Number(((changeAmount / r.prev) * 100).toFixed(1));
      const percentOfTotal = Number(((r.cost / total) * 100).toFixed(1));

      return {
        regionCode: r.code,
        regionName: info.name,
        cost: r.cost,
        previousCost: r.prev,
        percentOfTotal,
        changePercent,
        country: `${info.flag} ${info.country}`,
        activeServices: r.services
      };
    }).sort((a, b) => b.cost - a.cost);
  }

  public static getDailySummary(): DailyCostSummary {
    const points = this.getCostTimeline('daily');
    const todayPoint = points[points.length - 1];
    const yesterdayPoint = points[points.length - 2];

    const last7 = points.slice(-7);
    const sum7 = last7.reduce((s, p) => s + p.total, 0);
    const sum30 = points.reduce((s, p) => s + p.total, 0);

    let maxPoint = points[0];
    let minPoint = points[0];
    for (const p of points) {
      if (p.total > maxPoint.total) maxPoint = p;
      if (p.total < minPoint.total) minPoint = p;
    }

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return {
      todayCost: todayPoint.total,
      yesterdayCost: yesterdayPoint.total,
      sevenDayAverage: Number((sum7 / 7).toFixed(2)),
      thirtyDayAverage: Number((sum30 / points.length).toFixed(2)),
      highestDay: {
        date: maxPoint.date,
        amount: maxPoint.total
      },
      lowestDay: {
        date: minPoint.date,
        amount: minPoint.total
      },
      dailyPoints: points.map((p, idx) => {
        const d = new Date(p.date);
        return {
          date: p.date,
          dayOfWeek: dayNames[d.getDay()],
          amount: p.total,
          isToday: idx === points.length - 1,
          isYesterday: idx === points.length - 2,
          services: p.services
        };
      })
    };
  }

  public static getAnomalies(): CostAnomaly[] {
    return [
      {
        id: 'anom-1',
        service: 'Amazon Elastic Compute Cloud - Compute',
        date: '2026-09-25',
        currentCost: 182.40,
        expectedCost: 76.00,
        deviationMultiplier: 2.4,
        severity: 'high',
        title: 'Unusual EC2 Spike Detected',
        explanation: 'EC2 spending surged 2.4× above your 30-day moving average. The increase coincided with a batch run of c5.xlarge instances in us-east-1.',
        drillDownHint: 'Check us-east-1 compute instances during this date range to verify if batch jobs completed.'
      },
      {
        id: 'anom-2',
        service: 'Amazon Virtual Private Cloud',
        date: '2026-09-25',
        currentCost: 26.80,
        expectedCost: 8.20,
        deviationMultiplier: 3.2,
        severity: 'medium',
        title: 'NAT Gateway Data Processing Surge',
        explanation: 'NAT Gateway processing volume was 3.2× higher than normal ($0.045/GB processed), likely transferring heavy docker images or backups from a private subnet to the internet.',
        drillDownHint: 'Configure a VPC Gateway Endpoint for S3 to route backups through AWS internal networks for free.'
      },
      {
        id: 'anom-3',
        service: 'AWS Data Transfer',
        date: '2026-09-28',
        currentCost: 21.50,
        expectedCost: 4.80,
        deviationMultiplier: 4.5,
        severity: 'high',
        title: 'Unexpected Outbound Internet Egress',
        explanation: 'Sudden spike in outbound internet bandwidth from us-west-2.',
        drillDownHint: 'Review CloudFront CDN caching to reduce direct S3/EC2 downloads.'
      }
    ];
  }

  public static getSavings(): CostSavings[] {
    return [
      {
        id: 'sav-1',
        service: 'Amazon Relational Database Service',
        previousCost: 1008.60,
        currentCost: 824.50,
        savedAmount: 184.10,
        savedPercent: 18.25,
        explanation: 'Rightsized over-provisioned db.r5.xlarge staging databases down to db.t4g.medium.'
      },
      {
        id: 'sav-2',
        service: 'AWS Lambda',
        previousCost: 42.10,
        currentCost: 38.42,
        savedAmount: 3.68,
        savedPercent: 8.74,
        explanation: 'Optimized memory allocation and reduced execution timeouts across microservices.'
      },
      {
        id: 'sav-3',
        service: 'AWS Key Management Service',
        previousCost: 3.47,
        currentCost: 2.19,
        savedAmount: 1.28,
        savedPercent: 36.89,
        explanation: 'Consolidated unused customer managed keys (CMKs).'
      }
    ];
  }

  public static getAccounts(): AccountSpendingItem[] {
    return [
      {
        accountId: '123456789012',
        accountName: 'Production (Core)',
        cost: 3241.50,
        previousCost: 2890.00,
        percentOfTotal: 75.67,
        changePercent: 12.16,
        topServices: [
          { name: 'EC2', cost: 1540.00 },
          { name: 'RDS', cost: 720.00 },
          { name: 'S3', cost: 240.00 }
        ]
      },
      {
        accountId: '234567890123',
        accountName: 'Staging & QA',
        cost: 642.10,
        previousCost: 610.00,
        percentOfTotal: 14.99,
        changePercent: 5.26,
        topServices: [
          { name: 'EC2', cost: 220.00 },
          { name: 'RDS', cost: 104.50 },
          { name: 'CloudWatch', cost: 82.00 }
        ]
      },
      {
        accountId: '345678901234',
        accountName: 'Shared Services & Security',
        cost: 400.12,
        previousCost: 310.25,
        percentOfTotal: 9.34,
        changePercent: 28.97,
        topServices: [
          { name: 'VPC / Transit Gateway', cost: 248.10 },
          { name: 'CloudWatch Logs', cost: 86.20 },
          { name: 'Secrets Manager', cost: 18.40 }
        ]
      }
    ];
  }

  public static getTags(): { tags: TagSpendingItem[]; tagsAvailable: boolean; explanation: string } {
    return {
      tagsAvailable: true,
      explanation: 'Cost allocation tags let you categorize spending by environment, project, or department. Note: tags must be explicitly activated in the AWS Billing Console before they appear in Cost Explorer.',
      tags: [
        {
          tagKey: 'Environment',
          tagValue: 'production',
          cost: 3140.20,
          percentOfTotal: 73.3,
          services: [
            { name: 'EC2', cost: 1480.00 },
            { name: 'RDS', cost: 720.00 },
            { name: 'S3', cost: 220.00 }
          ]
        },
        {
          tagKey: 'Environment',
          tagValue: 'staging',
          cost: 720.40,
          percentOfTotal: 16.8,
          services: [
            { name: 'EC2', cost: 260.00 },
            { name: 'RDS', cost: 104.50 },
            { name: 'CloudWatch', cost: 65.00 }
          ]
        },
        {
          tagKey: 'Project',
          tagValue: 'ecommerce-platform',
          cost: 2480.50,
          percentOfTotal: 57.9,
          services: [
            { name: 'EC2', cost: 1200.00 },
            { name: 'RDS', cost: 650.00 },
            { name: 'Data Transfer', cost: 110.00 }
          ]
        },
        {
          tagKey: 'Project',
          tagValue: 'data-analytics',
          cost: 960.30,
          percentOfTotal: 22.4,
          services: [
            { name: 'EC2', cost: 420.00 },
            { name: 'S3', cost: 180.00 },
            { name: 'DynamoDB', cost: 64.20 }
          ]
        },
        {
          tagKey: 'Untagged',
          tagValue: '(No tag applied)',
          cost: 423.12,
          percentOfTotal: 9.9,
          services: [
            { name: 'CloudWatch', cost: 186.20 },
            { name: 'Secrets Manager', cost: 18.40 },
            { name: 'Route 53', cost: 12.00 }
          ]
        }
      ]
    };
  }

  public static getCategoryDeepDive(category: 'Compute' | 'Storage' | 'Database' | 'Networking' | 'AI & ML'): CategoryBreakdown {
    switch (category) {
      case 'AI & ML':
        return {
          category: 'AI & ML',
          totalCost: 104.87,
          percentOfTotalSpend: 8.12,
          summary: 'AI & ML covers serverless foundation models on Amazon Bedrock (Claude Sonnet & Haiku) and machine learning workloads.',
          plainEnglishGuide: 'Generative AI charges on Amazon Bedrock are billed strictly per 1,000 input prompt tokens and output completion tokens. There are no fixed hourly server fees for on-demand Bedrock inference.',
          services: [
            {
              serviceName: 'Claude Sonnet 5 (Amazon Bedrock Edition)',
              cost: 81.79,
              percentOfCategory: 78.0,
              components: [
                { name: 'Input Prompt Tokens', cost: 28.40, explanation: 'Context documents and system instructions sent to Claude Sonnet.' },
                { name: 'Output Completion Tokens', cost: 53.39, explanation: 'Generated analysis, code, and structured responses.' }
              ]
            },
            {
              serviceName: 'Claude Haiku 4.5 (Amazon Bedrock Edition)',
              cost: 23.08,
              percentOfCategory: 22.0,
              components: [
                { name: 'High-Throughput Token Inference', cost: 23.08, explanation: 'Fast classification, summarization, and routing prompts.' }
              ]
            }
          ],
          recommendations: [
            'Enable Amazon Bedrock Prompt Caching for repeated system prompts and static knowledge base context (saves up to 90% on cached input tokens).',
            'Route lightweight classification and extraction tasks to Claude Haiku instead of Sonnet to reduce token costs by ~75%.',
            'Set appropriate max_tokens limits on API calls to prevent unnecessarily verbose completions.'
          ]
        };

      case 'Compute':
        return {
          category: 'Compute',
          totalCost: 2367.93,
          percentOfTotalSpend: 55.28,
          summary: 'Compute powers your applications, backend APIs, and background cron jobs.',
          plainEnglishGuide: 'Compute spending includes virtual servers (EC2), serverless functions (Lambda), and ancillary container compute. The main driver of compute cost is running servers 24/7 at fixed capacity.',
          services: [
            {
              serviceName: 'Amazon Elastic Compute Cloud - Compute',
              cost: 1843.21,
              percentOfCategory: 77.8,
              components: [
                { name: 'm5.large On-Demand', cost: 712.40, explanation: 'General purpose 2 vCPU 8GB RAM servers running in us-east-1.' },
                { name: 'c5.xlarge On-Demand', cost: 520.10, explanation: 'High-CPU instances for compute-intensive APIs.' },
                { name: 't4g.small ARM Graviton', cost: 188.72, explanation: 'Efficient modern ARM servers.' },
                { name: 'Other instance types', cost: 422.00, explanation: 'Miscellaneous development and test instances.' }
              ]
            },
            {
              serviceName: 'EC2 - Other',
              cost: 486.30,
              percentOfCategory: 20.5,
              components: [
                { name: 'EBS gp3 Storage Volumes', cost: 242.21, explanation: 'Virtual hard drive storage attached to EC2 instances.' },
                { name: 'EBS Backup Snapshots', cost: 128.56, explanation: 'Daily point-in-time backup snapshots.' },
                { name: 'Elastic IP Idle & In-Use', cost: 31.21, explanation: 'Public IPv4 address allocation fees.' },
                { name: 'Other EC2 features', cost: 84.32, explanation: 'Network interfaces and monitoring.' }
              ]
            },
            {
              serviceName: 'AWS Lambda',
              cost: 38.42,
              percentOfCategory: 1.6,
              components: [
                { name: 'Invocations (Requests)', cost: 12.10, explanation: 'Billed per million requests executed.' },
                { name: 'Duration (GB-seconds)', cost: 26.32, explanation: 'Memory size multiplied by millisecond run duration.' }
              ]
            }
          ],
          recommendations: [
            'Turn off staging EC2 servers outside of working hours (e.g. 7 PM to 7 AM) to save ~50% on non-prod compute.',
            'Switch x86 (m5/c5) instances to AWS Graviton (m7g/c7g) for ~20% immediate savings and better performance.',
            'Purchase a 1-year Compute Savings Plan if you maintain consistent baseline compute.'
          ]
        };

      case 'Storage':
        return {
          category: 'Storage',
          totalCost: 554.66,
          percentOfTotalSpend: 12.95,
          summary: 'Storage represents files, database disks, and system backup snapshots across AWS.',
          plainEnglishGuide: 'Storage costs accumulate automatically as data is created and rarely decreases on its own unless lifecycle policies or cleanup scripts are configured.',
          services: [
            {
              serviceName: 'Amazon Simple Storage Service (S3)',
              cost: 312.45,
              percentOfCategory: 56.3,
              components: [
                { name: 'S3 Standard Storage', cost: 218.40, explanation: 'Active storage capacity billed at ~$0.023 per GB/month.' },
                { name: 'API Operations (PUT/GET)', cost: 38.10, explanation: 'Charges for uploading and reading files.' },
                { name: 'S3 Data Transfer Out', cost: 55.95, explanation: 'Bandwidth for downloading files over the internet.' }
              ]
            },
            {
              serviceName: 'EBS Provisioned Storage (EC2 Hard Drives)',
              cost: 242.21,
              percentOfCategory: 43.7,
              components: [
                { name: 'gp3 General Purpose SSD', cost: 198.40, explanation: 'Fast flash storage for running operating systems and databases.' },
                { name: 'Snapshot Backups', cost: 43.81, explanation: 'Backup images of EBS volumes stored in S3.' }
              ]
            }
          ],
          recommendations: [
            'Enable S3 Intelligent-Tiering to automatically move rarely accessed files to cheaper storage tiers without operational overhead.',
            'Delete unattached (orphaned) EBS volumes left behind by terminated EC2 instances.',
            'Set S3 Lifecycle rules to delete multipart uploads that failed halfway through.'
          ]
        };

      case 'Database':
        return {
          category: 'Database',
          totalCost: 888.70,
          percentOfTotalSpend: 20.75,
          summary: 'Databases store and serve structured application and user data.',
          plainEnglishGuide: 'Managed databases like RDS handle automated backups, patching, and multi-region failover. You pay for both the database compute engine and the dedicated high-performance disk storage.',
          services: [
            {
              serviceName: 'Amazon Relational Database Service (RDS)',
              cost: 824.50,
              percentOfCategory: 92.8,
              components: [
                { name: 'RDS Compute Engine (db.r6g.large)', cost: 580.30, explanation: 'Managed database server CPU & memory.' },
                { name: 'RDS gp3 Storage (500 GB)', cost: 142.10, explanation: 'Dedicated high-IOPS database hard drive.' },
                { name: 'Automated Daily Backups', cost: 64.50, explanation: '30-day point-in-time recovery snapshots.' },
                { name: 'Multi-AZ Standby Replica', cost: 37.60, explanation: 'Synchronous replication for high availability.' }
              ]
            },
            {
              serviceName: 'Amazon DynamoDB',
              cost: 64.20,
              percentOfCategory: 7.2,
              components: [
                { name: 'On-Demand Read Request Units', cost: 24.10, explanation: 'Charges per million reads.' },
                { name: 'On-Demand Write Request Units', cost: 28.50, explanation: 'Charges per million writes.' },
                { name: 'Table Storage', cost: 11.60, explanation: 'Storage of documents and indexes.' }
              ]
            }
          ],
          recommendations: [
            'Upgrade older RDS db.r5 instances to Graviton db.r6g or db.r7g to save up to 20% on database compute.',
            'Disable Multi-AZ on staging and development databases where high-availability downtime during maintenance is acceptable.'
          ]
        };

      case 'Networking':
      default:
        return {
          category: 'Networking',
          totalCost: 489.05,
          percentOfTotalSpend: 11.42,
          summary: 'Networking covers internet bandwidth, NAT Gateways, Load Balancers, and DNS.',
          plainEnglishGuide: 'Data moving into AWS is free, but data moving OUT of AWS or across Availability Zones costs money. NAT Gateways are a frequent hidden cost driver because they bill both per hour and per gigabyte processed.',
          services: [
            {
              serviceName: 'Amazon Virtual Private Cloud (NAT Gateways)',
              cost: 248.10,
              percentOfCategory: 50.7,
              components: [
                { name: 'NAT Gateway Hourly Runtime', cost: 64.80, explanation: 'Two NAT Gateways deployed across 2 AZs ($0.045/hr each).' },
                { name: 'NAT Gateway Data Processed', cost: 183.30, explanation: 'Data routed through the NAT Gateway to the internet ($0.045/GB).' }
              ]
            },
            {
              serviceName: 'AWS Data Transfer',
              cost: 142.30,
              percentOfCategory: 29.1,
              components: [
                { name: 'Internet Outflow (Egress)', cost: 98.20, explanation: 'Public internet downloads billed at ~$0.09/GB.' },
                { name: 'Inter-AZ Zone Transfer', cost: 44.10, explanation: 'Traffic crossing between different data centers in us-east-1.' }
              ]
            },
            {
              serviceName: 'Elastic Load Balancing (ALB)',
              cost: 98.65,
              percentOfCategory: 20.2,
              components: [
                { name: 'Application Load Balancer Hours', cost: 43.20, explanation: 'Fixed hourly charge per active load balancer.' },
                { name: 'LCU Processing Units', cost: 55.45, explanation: 'Traffic connections and request volume processed by ALB.' }
              ]
            }
          ],
          recommendations: [
            'Create a free S3 VPC Gateway Endpoint! This bypasses the NAT Gateway for all S3 traffic, eliminating both NAT processing fees ($0.045/GB) and egress fees.',
            'Put CloudFront CDN in front of public web applications to benefit from lower egress transfer rates.'
          ]
        };
    }
  }

  public static getDrillDownTree(): DrillDownNode {
    return {
      level: 0,
      levelName: 'Total AWS Spend',
      key: 'root',
      name: 'Total AWS Account Spend',
      cost: 4283.72,
      percentOfParent: 100,
      changePercent: 12.43,
      explanation: 'All combined AWS cloud spending for the current billing period.',
      hasChildren: true,
      children: [
        {
          level: 1,
          levelName: 'Service',
          key: 'ec2',
          name: 'Amazon Elastic Compute Cloud - Compute',
          cost: 1843.21,
          percentOfParent: 43.03,
          changePercent: 20.31,
          explanation: 'Virtual compute servers running 24/7 workloads.',
          hasChildren: true,
          children: [
            {
              level: 2,
              levelName: 'Usage Category',
              key: 'ec2-ondemand',
              name: 'On-Demand Compute Instance Hours',
              cost: 1421.22,
              percentOfParent: 77.11,
              changePercent: 18.4,
              explanation: 'Standard hourly server capacity without long-term commitments.',
              hasChildren: true,
              children: [
                {
                  level: 3,
                  levelName: 'Region',
                  key: 'ec2-ondemand-useast1',
                  name: 'US East (N. Virginia)',
                  cost: 1042.80,
                  percentOfParent: 73.37,
                  changePercent: 22.1,
                  explanation: 'Primary production region hosting backend API fleet.',
                  hasChildren: true,
                  children: [
                    {
                      level: 4,
                      levelName: 'Instance Type',
                      key: 'm5.large',
                      name: 'm5.large (2 vCPU, 8 GB RAM)',
                      cost: 712.40,
                      percentOfParent: 68.32,
                      changePercent: 24.5,
                      explanation: 'Standard general-purpose workhorse instances.',
                      hasChildren: false
                    },
                    {
                      level: 4,
                      levelName: 'Instance Type',
                      key: 'c5.xlarge',
                      name: 'c5.xlarge (4 vCPU, 8 GB RAM)',
                      cost: 330.40,
                      percentOfParent: 31.68,
                      changePercent: 17.2,
                      explanation: 'High-CPU batch processing workers.',
                      hasChildren: false
                    }
                  ]
                },
                {
                  level: 3,
                  levelName: 'Region',
                  key: 'ec2-ondemand-uswest2',
                  name: 'US West (Oregon)',
                  cost: 378.42,
                  percentOfParent: 26.63,
                  changePercent: 5.1,
                  explanation: 'Secondary staging and failover region.',
                  hasChildren: false
                }
              ]
            },
            {
              level: 2,
              levelName: 'Usage Category',
              key: 'ec2-ebs',
              name: 'EBS Hard Drive Storage Volumes',
              cost: 242.21,
              percentOfParent: 13.14,
              changePercent: 4.2,
              explanation: 'Virtual hard drives provisioned for operating systems.',
              hasChildren: false
            },
            {
              level: 2,
              levelName: 'Usage Category',
              key: 'ec2-net',
              name: 'Network & Elastic IP Charges',
              cost: 179.78,
              percentOfParent: 9.75,
              changePercent: 12.8,
              explanation: 'Internet bandwidth and public IPv4 address fees.',
              hasChildren: false
            }
          ]
        },
        {
          level: 1,
          levelName: 'Service',
          key: 'rds',
          name: 'Amazon Relational Database Service',
          cost: 824.50,
          percentOfParent: 19.25,
          changePercent: -18.25,
          explanation: 'Managed PostgreSQL & MySQL databases.',
          hasChildren: true,
          children: [
            {
              level: 2,
              levelName: 'Usage Category',
              key: 'rds-compute',
              name: 'Database Instance Hours',
              cost: 580.30,
              percentOfParent: 70.38,
              changePercent: -22.1,
              explanation: 'Database virtual machine engine running Postgres.',
              hasChildren: false
            },
            {
              level: 2,
              levelName: 'Usage Category',
              key: 'rds-storage',
              name: 'Provisioned Database SSD Storage',
              cost: 142.10,
              percentOfParent: 17.23,
              changePercent: 1.5,
              explanation: '500 GB gp3 high-speed storage.',
              hasChildren: false
            },
            {
              level: 2,
              levelName: 'Usage Category',
              key: 'rds-backups',
              name: 'Automated Snapshots & Backups',
              cost: 102.10,
              percentOfParent: 12.38,
              changePercent: -3.2,
              explanation: 'Retained point-in-time recovery archives.',
              hasChildren: false
            }
          ]
        },
        {
          level: 1,
          levelName: 'Service',
          key: 's3',
          name: 'Amazon Simple Storage Service',
          cost: 312.45,
          percentOfParent: 7.29,
          changePercent: 9.89,
          explanation: 'Object storage buckets holding documents, media, and logs.',
          hasChildren: false
        },
        {
          level: 1,
          levelName: 'Service',
          key: 'other-services',
          name: 'All Other AWS Services (VPC, CloudWatch, Lambda, etc.)',
          cost: 1303.56,
          percentOfParent: 30.43,
          changePercent: 8.4,
          explanation: 'Supporting infrastructure, monitoring, and network routing.',
          hasChildren: false
        }
      ]
    };
  }

  public static handleSearch(query: string): SearchQueryResult {
    const q = query.toLowerCase().trim();

    if (q.includes('increase') || q.includes('why') || q.includes('higher') || q.includes('surge') || q.includes('more expensive')) {
      return {
        query,
        intent: 'increase_explanation',
        title: 'Why did my AWS bill increase?',
        summary: 'Your AWS spend increased by 12.4% (+$473.47) compared to last month. The single largest driver is EC2 virtual compute (+$311.21), followed by NAT Gateway data processing in VPC (+$52.70).',
        highlightNumber: '+$473.47 (+12.4%)',
        relevantData: {
          primaryDriver: 'Amazon Elastic Compute Cloud - Compute',
          primaryIncrease: 311.21,
          secondaryDriver: 'Amazon Virtual Private Cloud',
          secondaryIncrease: 52.70
        },
        suggestedAction: {
          page: 'anomalies',
          label: 'View Detailed Cost Anomalies'
        }
      };
    }

    if (q.includes('ec2') || q.includes('server') || q.includes('virtual machine') || q.includes('instance')) {
      return {
        query,
        intent: 'service_lookup',
        title: 'EC2 Spending Summary',
        summary: 'You are spending $1,843.21 on EC2 Compute (43.0% of your bill) plus $486.30 on EC2-Other (disks, IPs, snapshots). Combined, EC2 accounts for over 54% of your total monthly spend.',
        highlightNumber: '$2,329.51 total',
        relevantData: {
          compute: 1843.21,
          supportingEBS: 486.30,
          changePercent: '+20.3%'
        },
        suggestedAction: {
          page: 'services',
          label: 'Inspect EC2 Service Breakdown',
          params: { service: 'Amazon Elastic Compute Cloud - Compute' }
        }
      };
    }

    if (q.includes('storage') || q.includes('s3') || q.includes('disk') || q.includes('ebs')) {
      return {
        query,
        intent: 'category_lookup',
        title: 'Storage Spending Overview',
        summary: 'Total storage spending across all AWS services is $554.66 this month. S3 cloud buckets account for $312.45, and EC2 EBS virtual hard drives account for $242.21.',
        highlightNumber: '$554.66 / mo',
        relevantData: {
          s3Cost: 312.45,
          ebsCost: 242.21,
          rdsStorage: 142.10
        },
        suggestedAction: {
          page: 'categories',
          label: 'View Storage Category Deep-Dive',
          params: { category: 'Storage' }
        }
      };
    }

    if (q.includes('region') || q.includes('where') || q.includes('virginia') || q.includes('oregon') || q.includes('mumbai')) {
      return {
        query,
        intent: 'region_lookup',
        title: 'Regional Spend Distribution',
        summary: 'US East (N. Virginia / us-east-1) is your most expensive region at $2,104.73 (49.1% of total spend), followed by US West (Oregon) at $842.10 (19.7%) and Asia Pacific (Mumbai) at $531.40 (12.4%).',
        highlightNumber: '49.1% in us-east-1',
        relevantData: {
          topRegion: 'US East (N. Virginia)',
          topCost: 2104.73
        },
        suggestedAction: {
          page: 'regions',
          label: 'Explore Regional Map & Analysis'
        }
      };
    }

    if (q.includes('database') || q.includes('rds') || q.includes('postgres') || q.includes('dynamo')) {
      return {
        query,
        intent: 'category_lookup',
        title: 'Database Spending Overview',
        summary: 'Total database spend is $888.70 this month ($824.50 on RDS and $64.20 on DynamoDB). Good news: RDS spend decreased by 18.2% (-$184.10) compared to last month!',
        highlightNumber: '$888.70 (-18.2% RDS)',
        relevantData: {
          rdsCost: 824.50,
          dynamoCost: 64.20
        },
        suggestedAction: {
          page: 'categories',
          label: 'View Database Deep-Dive',
          params: { category: 'Database' }
        }
      };
    }

    // General fallback
    return {
      query,
      intent: 'general',
      title: `Search Results for "${query}"`,
      summary: `Your total current month spend is $4,283.72 across 14 active AWS services. The top cost drivers are EC2 ($1,843.21), RDS ($824.50), and S3 ($312.45).`,
      highlightNumber: '$4,283.72 Total',
      relevantData: {
        topServices: ['EC2 ($1,843.21)', 'RDS ($824.50)', 'EC2-Other ($486.30)', 'S3 ($312.45)']
      },
      suggestedAction: {
        page: 'overview',
        label: 'Return to Main Dashboard'
      }
    };
  }
}
