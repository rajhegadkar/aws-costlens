import { ServiceCategory } from './types.js';

export interface TermDefinition {
  technicalTerm: string;
  friendlyName: string;
  simpleExplanation: string;
  whyItCostsMoney: string;
  typicalDrivers: string[];
}

export const AWS_TERMINOLOGY_MAP: Record<string, TermDefinition> = {
  'UnblendedCost': {
    technicalTerm: 'UnblendedCost',
    friendlyName: 'Actual Billed Cost',
    simpleExplanation: 'The exact amount your AWS account was invoiced for in this billing period without spreading upfront reservations across time.',
    whyItCostsMoney: 'This reflects the real out-of-pocket charges on your AWS credit card or invoice for the period.',
    typicalDrivers: ['Direct on-demand hourly usage', 'Data transfer', 'Storage gigabytes consumed']
  },
  'AmortizedCost': {
    technicalTerm: 'AmortizedCost',
    friendlyName: 'True Effective Cost (Amortized)',
    simpleExplanation: 'Spreads any upfront fees from Savings Plans or Reserved Instances evenly across the entire month or year.',
    whyItCostsMoney: 'Gives finance teams a smoother, more realistic picture of daily operational spend instead of large lump-sum spikes.',
    typicalDrivers: ['1-year or 3-year upfront commitments', 'Recurring reservation amortization']
  },
  'BlendedCost': {
    technicalTerm: 'BlendedCost',
    friendlyName: 'Organization Averaged Cost',
    simpleExplanation: 'The average unit rate across all AWS accounts in your AWS Organization.',
    whyItCostsMoney: 'AWS groups multiple accounts together; accounts with higher volume discounts pull down the blended rate for others.',
    typicalDrivers: ['Multi-account billing organizations']
  },
  'NetUnblendedCost': {
    technicalTerm: 'NetUnblendedCost',
    friendlyName: 'Net Billed Cost (After Enterprise Discounts)',
    simpleExplanation: 'Actual billed cost after applying any private AWS enterprise discounts or custom contract pricing.',
    whyItCostsMoney: 'Reflects your true net payable amount if you have an Enterprise Agreement (EDP) with AWS.',
    typicalDrivers: ['Enterprise Discount Program agreements']
  },
  'UsageType': {
    technicalTerm: 'UsageType',
    friendlyName: 'Usage Category',
    simpleExplanation: 'The specific type of resource or activity that incurred the charge (e.g. server hours, gigabytes stored, API requests).',
    whyItCostsMoney: 'Every AWS service charges across distinct units (hours, GBs, millions of requests).',
    typicalDrivers: ['Server instance families', 'Disk storage tiers', 'Network egress']
  },
  'Operation': {
    technicalTerm: 'Operation',
    friendlyName: 'AWS Action Performed',
    simpleExplanation: 'The exact API action or internal AWS operation (e.g., RunInstances, PutObject, NatGateway).',
    whyItCostsMoney: 'AWS tracks which specific API command was called or running in your environment.',
    typicalDrivers: ['Starting EC2 servers', 'Uploading files', 'Routing internet packets']
  }
};

export interface ServiceExplanation {
  friendlyName: string;
  category: ServiceCategory;
  shortSummary: string;
  detailedExplanation: string;
  whyItCostsMoney: string;
  howToControlCost: string;
}

export const SERVICE_EXPLANATIONS: Record<string, ServiceExplanation> = {
  'Amazon Elastic Compute Cloud - Compute': {
    friendlyName: 'EC2 Virtual Servers',
    category: 'Compute',
    shortSummary: 'Virtual computers running your software, apps, and background workloads in the cloud.',
    detailedExplanation: 'EC2 provides resizable compute capacity. You are billed for every second or hour a virtual server (instance) is powered on.',
    whyItCostsMoney: 'Each instance reserves dedicated CPU cores and RAM in AWS data centers.',
    howToControlCost: 'Turn off test/staging servers when not in use, choose modern Graviton/ARM instance types (e.g. t4g, m7g), and purchase Savings Plans for steady workloads.'
  },
  'EC2 - Other': {
    friendlyName: 'EC2 Supporting Infrastructure (Disks, IPs, Gateways)',
    category: 'Compute',
    shortSummary: 'Supporting items attached to EC2 servers: virtual hard drives (EBS), static IPs, and NAT traffic.',
    detailedExplanation: 'This is the most common confusing charge on AWS bills! It is NOT the CPU/RAM of your servers. It represents EBS hard drives, disk snapshots, Elastic IP addresses ($0.005/hr even when idle), and NAT Gateway network processing.',
    whyItCostsMoney: 'EBS storage reserves disk capacity in AWS data centers regardless of whether the server is running. Unattached Elastic IPs incur idle charges.',
    howToControlCost: 'Delete orphaned EBS volumes left behind by terminated instances, clean up old snapshots, and release unattached Elastic IPs.'
  },
  'Amazon Lightsail': {
    friendlyName: 'Lightsail Virtual Private Servers',
    category: 'Compute',
    shortSummary: 'Bundled virtual servers, containers, and static IPs with predictable monthly pricing.',
    detailedExplanation: 'Amazon Lightsail packages virtual compute, SSD storage, and data transfer allowance into flat-rate or hourly virtual private server bundles.',
    whyItCostsMoney: 'Each Lightsail instance or container service charges a fixed hourly/monthly bundle rate while provisioned (even if stopped!).',
    howToControlCost: 'Important: Stopping a Lightsail instance does NOT stop billing—you must snapshot and delete unused Lightsail instances to stop charges.'
  },
  'AWS Amplify': {
    friendlyName: 'AWS Amplify Web Hosting & CI/CD',
    category: 'Compute',
    shortSummary: 'Managed frontend web application hosting, CI/CD build pipelines, and CDN delivery.',
    detailedExplanation: 'AWS Amplify builds, deploys, and hosts modern web and mobile frontends. Charges come from build minutes consumed during git deployments plus gigabytes of web assets stored and served.',
    whyItCostsMoney: 'AWS provisions build containers on every code push and serves hosted frontend assets over global edge locations.',
    howToControlCost: 'Prune old feature-branch preview deployments and avoid triggering unnecessary full frontend rebuilds.'
  },
  'AWS CloudShell': {
    friendlyName: 'AWS CloudShell Browser Terminal',
    category: 'Compute',
    shortSummary: 'Browser-based command-line terminal environment inside the AWS Console.',
    detailedExplanation: 'The CloudShell compute environment itself is free, though outbound data transfer or persistent VPC resources accessed from CloudShell can incur minor charges.',
    whyItCostsMoney: 'Data transfer out from terminal sessions or associated network resources.',
    howToControlCost: 'Avoid downloading large multi-gigabyte archives through CloudShell sessions.'
  },
  'AWS Lambda': {
    friendlyName: 'Lambda Serverless Functions',
    category: 'Compute',
    shortSummary: 'Runs your code only when triggered, without keeping any servers running.',
    detailedExplanation: 'Serverless compute that charges strictly for the milliseconds of compute time your function executes, plus the number of invocations.',
    whyItCostsMoney: 'You pay for RAM allocation multiplied by execution duration in milliseconds. When your code stops, billing stops immediately.',
    howToControlCost: 'Optimize function memory allocation using AWS Lambda Power Tuning and eliminate slow database connection cold starts.'
  },
  'Amazon Elastic Container Service': {
    friendlyName: 'ECS Container Orchestration',
    category: 'Compute',
    shortSummary: 'Runs Docker containers across EC2 instances or AWS Fargate serverless compute.',
    detailedExplanation: 'ECS orchestrates containerized microservices. When using AWS Fargate, you pay per vCPU-hour and GB-hour of memory requested by running tasks.',
    whyItCostsMoney: 'Container tasks reserve CPU and memory resources while active.',
    howToControlCost: 'Right-size task CPU/memory definitions, use Fargate Spot for fault-tolerant workloads, and scale down idle staging services.'
  },
  'Amazon Elastic Kubernetes Service': {
    friendlyName: 'EKS Managed Kubernetes',
    category: 'Compute',
    shortSummary: 'Managed Kubernetes control plane ($0.10/hour per cluster) plus worker node compute.',
    detailedExplanation: 'AWS manages the Kubernetes control plane availability and upgrades at ~$73/month per cluster, plus underlying EC2 or Fargate worker costs.',
    whyItCostsMoney: 'Dedicated multi-AZ Kubernetes control plane instances and worker compute nodes.',
    howToControlCost: 'Consolidate non-production environments onto shared clusters using namespaces instead of spinning up separate EKS clusters.'
  },
  'Amazon Simple Storage Service': {
    friendlyName: 'S3 Cloud File Storage',
    category: 'Storage',
    shortSummary: 'Cloud storage buckets holding files, documents, media, backups, and static website assets.',
    detailedExplanation: 'S3 charges based on: 1) Gigabytes stored per month, 2) Number of file operations (upload PUT / read GET), and 3) Data downloaded out to the internet.',
    whyItCostsMoney: 'AWS stores multiple copies of your data across at least three physical data centers for 99.999999999% durability.',
    howToControlCost: 'Configure S3 Lifecycle rules to automatically transition older files to S3 Glacier or delete temporary files after 30 days.'
  },
  'Amazon Elastic File System': {
    friendlyName: 'EFS Managed Network File System',
    category: 'Storage',
    shortSummary: 'Shared elastic NFS file storage mounted across multiple EC2 servers or containers.',
    detailedExplanation: 'EFS automatically grows and shrinks as files are added or removed, charging per gigabyte-month stored and for throughput read/write operations.',
    whyItCostsMoney: 'Multi-AZ replicated network file system storage with low-latency shared access.',
    howToControlCost: 'Enable EFS Lifecycle Management to automatically move files not accessed for 30 days to the EFS Infrequent Access (IA) tier (up to 90% cheaper).'
  },
  'AWS Backup': {
    friendlyName: 'AWS Centralized Backup Vaults',
    category: 'Storage',
    shortSummary: 'Centralized automated backup snapshots across EC2, EBS, RDS, and S3.',
    detailedExplanation: 'Charges are based on the total gigabytes of warm or cold backup recovery points stored in your backup vaults each month.',
    whyItCostsMoney: 'Long-term encrypted snapshot retention stored across isolated vaults.',
    howToControlCost: 'Shorten retention periods on non-production backups and transition older monthly backups to cold storage.'
  },
  'Amazon Relational Database Service': {
    friendlyName: 'RDS Managed Databases',
    category: 'Database',
    shortSummary: 'Managed SQL databases (PostgreSQL, MySQL, MariaDB, SQL Server, Oracle).',
    detailedExplanation: 'AWS manages database patching, automated backups, and multi-AZ redundancy for you. You pay for the database engine server hours, provisioned storage (EBS gp3/io1), and backup storage.',
    whyItCostsMoney: 'Managed databases require persistent compute instances with high reliability and automated snapshot replication.',
    howToControlCost: 'Stop staging/dev databases over weekends, ensure multi-AZ is only enabled for production, and use Reserved Instances.'
  },
  'Amazon DynamoDB': {
    friendlyName: 'DynamoDB NoSQL Database',
    category: 'Database',
    shortSummary: 'Ultra-fast, fully managed key-value and document database with single-digit millisecond latency.',
    detailedExplanation: 'DynamoDB charges either on-demand (per million read/write requests) or provisioned capacity (reserved read/write units per second), plus data storage.',
    whyItCostsMoney: 'AWS provisions distributed SSD clusters to guarantee ultra-fast response times at any scale.',
    howToControlCost: 'Switch sporadic workloads to On-Demand billing, use TTL to auto-expire old records, and use DynamoDB Standard-IA for cold tables.'
  },
  'Amazon ElastiCache': {
    friendlyName: 'ElastiCache In-Memory Redis / Memcached',
    category: 'Database',
    shortSummary: 'Managed in-memory caching clusters for sub-millisecond application data access.',
    detailedExplanation: 'Charges per node-hour based on cache instance family and memory allocation, or per GB-hour and ElastiCache Processing Units (ECPUs) in Serverless mode.',
    whyItCostsMoney: 'Dedicated high-speed RAM nodes kept running continuously in your VPC.',
    howToControlCost: 'Right-size underutilized cache nodes, use Graviton r7g/t4g node types, and set TTLs on cached keys.'
  },
  'Amazon Bedrock': {
    friendlyName: 'Amazon Bedrock Generative AI',
    category: 'AI & ML',
    shortSummary: 'Serverless foundation model APIs (Anthropic Claude, Llama, Titan) billed per input/output token.',
    detailedExplanation: 'Amazon Bedrock provides API access to foundation LLMs without managing GPU servers. You pay strictly per 1,000 input tokens (prompts) and output tokens (completions), or for Provisioned Throughput.',
    whyItCostsMoney: 'Running large language models requires high-end GPU/Trainium inference clusters processing your prompt and completion tokens.',
    howToControlCost: 'Use prompt caching for repeated system instructions, route simpler tasks to faster/cheaper models like Claude Haiku, and cap max_tokens.'
  },
  'Claude Sonnet 5 (Amazon Bedrock Edition)': {
    friendlyName: 'Anthropic Claude Sonnet 5 (Bedrock AI)',
    category: 'AI & ML',
    shortSummary: 'Frontier intelligence LLM on Amazon Bedrock for coding, analysis, and complex reasoning.',
    detailedExplanation: 'Billed per million input and output tokens processed through Amazon Bedrock. Output tokens typically cost 3x–5x more than input tokens.',
    whyItCostsMoney: 'Frontier model GPU inference calculated on total prompt context length and generated response length.',
    howToControlCost: 'Enable Bedrock Prompt Caching for long system prompts or documents, trim conversation history, and offload lightweight classification to Claude Haiku.'
  },
  'Claude Sonnet 4.6 (Amazon Bedrock Edition)': {
    friendlyName: 'Anthropic Claude Sonnet 4.6 (Bedrock AI)',
    category: 'AI & ML',
    shortSummary: 'High-capability Anthropic Claude Sonnet model invoked via Amazon Bedrock.',
    detailedExplanation: 'Billed strictly on pay-as-you-go input and output token consumption via Amazon Bedrock APIs.',
    whyItCostsMoney: 'Serverless GPU inference per thousand input and output tokens.',
    howToControlCost: 'Use prompt caching, concise prompts, and route high-volume simple tasks to Claude Haiku.'
  },
  'Claude Haiku 4.5 (Amazon Bedrock Edition)': {
    friendlyName: 'Anthropic Claude Haiku 4.5 (Bedrock AI)',
    category: 'AI & ML',
    shortSummary: 'Fast, cost-efficient Anthropic Claude model on Amazon Bedrock for high-throughput tasks.',
    detailedExplanation: 'Claude Haiku delivers ultra-fast responses at a fraction of the per-token cost of larger models, billed per thousand input and output tokens.',
    whyItCostsMoney: 'Pay-per-token serverless AI inference on Amazon Bedrock.',
    howToControlCost: 'Batch smaller requests where possible and cache static prompt prefixes.'
  },
  'Amazon SageMaker': {
    friendlyName: 'SageMaker Machine Learning Platform',
    category: 'AI & ML',
    shortSummary: 'Managed ML notebooks, model training jobs, and real-time inference endpoints.',
    detailedExplanation: 'SageMaker bills for active notebook instances, training job GPU/CPU hours, and 24/7 real-time inference endpoints.',
    whyItCostsMoney: 'ML instances (especially GPU instances like ml.g5) accrue hourly charges while endpoints or notebooks remain running.',
    howToControlCost: 'Shut down idle SageMaker Studio notebooks and use Serverless Inference endpoints for intermittent traffic.'
  },
  'Amazon CloudWatch': {
    friendlyName: 'CloudWatch Logging & Monitoring',
    category: 'Management',
    shortSummary: 'Monitors the health, metrics, alerts, and logs of your AWS services.',
    detailedExplanation: 'Charges accrue from: 1) Volume of logs ingested (GB), 2) Log retention storage, 3) Custom metrics pushed, and 4) Dashboards and alarms.',
    whyItCostsMoney: 'Ingesting and indexing massive streams of log data requires substantial processing and indexing power in AWS.',
    howToControlCost: 'Set retention policies on log groups (e.g. 7 or 14 days instead of "Never Expire") and avoid debug-level logging in production.'
  },
  'AWS Cost Explorer': {
    friendlyName: 'AWS Cost Explorer API Usage',
    category: 'Management',
    shortSummary: 'Programmatic billing analysis and cost telemetry API requests ($0.01 per request).',
    detailedExplanation: 'While viewing Cost Explorer inside the AWS web console is free, every direct API call to GetCostAndUsage or GetCostForecast costs $0.01.',
    whyItCostsMoney: 'AWS charges $0.01 per paginated Cost Explorer API request made by external tools or scripts.',
    howToControlCost: 'AWS CostLens automatically caches responses locally in ./data/cost-explorer-cache.json to minimize repeat API calls.'
  },
  'Amazon Simple Email Service': {
    friendlyName: 'SES Transactional & Marketing Email',
    category: 'Management',
    shortSummary: 'Cloud email delivery service for transactional notifications and application emails.',
    detailedExplanation: 'Amazon SES charges ~$0.10 per 1,000 emails sent plus $0.12 per GB of email attachments or dedicated IP address fees.',
    whyItCostsMoney: 'High-deliverability SMTP relay infrastructure, DKIM/SPF signing, and reputation management.',
    howToControlCost: 'Remove bouncing email addresses from mailing lists and compress email attachments or link to S3 instead.'
  },
  'Amazon Simple Notification Service': {
    friendlyName: 'SNS Pub/Sub Notifications & SMS',
    category: 'Management',
    shortSummary: 'Push notifications, webhook alerts, and SMS text messaging across services.',
    detailedExplanation: 'SNS charges per million topic publishes and per delivery (with SMS text messages costing significantly more per message depending on destination country).',
    whyItCostsMoney: 'Message fan-out routing and telecom carrier fees for SMS delivery.',
    howToControlCost: 'Filter SNS subscriptions so only relevant events trigger downstream deliveries, and monitor SMS spending limits.'
  },
  'AWS Data Transfer': {
    friendlyName: 'Data Transfer & Network Traffic',
    category: 'Networking',
    shortSummary: 'The cost of moving data out of AWS to the internet, between regions, or between Availability Zones.',
    detailedExplanation: 'AWS charges $0.09/GB for data leaving to the public internet, and $0.01 to $0.02/GB for data moving between different AWS Availability Zones or VPCs.',
    whyItCostsMoney: 'Physical fiber optic cables, internet exchange points, and global AWS backbone networks consume bandwidth capacity.',
    howToControlCost: 'Use CloudFront CDN in front of public websites (lower egress rates), keep chatty services within the same Availability Zone where possible, and use VPC Endpoints.'
  },
  'Amazon Virtual Private Cloud': {
    friendlyName: 'VPC Private Networking & Public IPv4',
    category: 'Networking',
    shortSummary: 'Isolated virtual networks, public IPv4 addresses ($0.005/hr), and NAT Gateways.',
    detailedExplanation: 'Basic VPCs are free, but AWS charges $0.005/hour (~$3.60/month) for every public IPv4 address attached to any resource, plus NAT Gateways ($0.045/hour + $0.045/GB processed).',
    whyItCostsMoney: 'Public IPv4 address scarcity charges and managed NAT Gateway proxy appliances.',
    howToControlCost: 'Release unused Elastic IPs, disable auto-assign public IPv4 on private backend instances, and use VPC Endpoints for S3/DynamoDB.'
  },
  'Amazon Route 53': {
    friendlyName: 'Route 53 DNS & Domain Routing',
    category: 'Networking',
    shortSummary: 'Authoritative DNS hosted zones ($0.50/month per zone) and DNS query resolution.',
    detailedExplanation: 'Route 53 charges $0.50 per Hosted Zone per month for the first 25 zones, plus $0.40 per million DNS queries and optional health checks.',
    whyItCostsMoney: 'Global anycast DNS nameservers with 100% availability SLA.',
    howToControlCost: 'Delete unused hosted zones from retired domains and increase DNS TTLs on static records to reduce query volume.'
  },
  'Amazon CloudFront': {
    friendlyName: 'CloudFront Global Content Delivery Network (CDN)',
    category: 'Networking',
    shortSummary: 'Global edge caching for websites, APIs, and downloadable media.',
    detailedExplanation: 'CloudFront caches content at edge locations worldwide, charging per GB of data transferred out to users and per 10,000 HTTP/HTTPS requests (first 1TB/month often covered by AWS Free Tier).',
    whyItCostsMoney: 'Global edge server delivery and bandwidth to end users.',
    howToControlCost: 'Increase Cache-Control max-age headers to improve cache hit ratios and enable gzip/Brotli compression.'
  },
  'Amazon API Gateway': {
    friendlyName: 'API Gateway REST & HTTP Endpoints',
    category: 'Networking',
    shortSummary: 'Managed API front-door for serverless Lambda functions and backend microservices.',
    detailedExplanation: 'Charges per million API calls received (HTTP APIs cost ~$1.00/million; REST APIs cost ~$3.50/million) plus optional response caching.',
    whyItCostsMoney: 'Managed request routing, throttling, authorization, and TLS termination.',
    howToControlCost: 'Use HTTP APIs instead of REST APIs where possible for ~70% lower cost per million requests.'
  },
  'Elastic Load Balancing': {
    friendlyName: 'ALB / NLB Load Balancers',
    category: 'Networking',
    shortSummary: 'Distributes incoming web and application traffic across multiple backend servers.',
    detailedExplanation: 'Charges are based on hourly load balancer runtime plus "LCU" (Load Balancer Capacity Units) which measure processed traffic and connections.',
    whyItCostsMoney: 'AWS runs a dedicated, fault-tolerant proxy fleet that scales automatically with your visitor traffic.',
    howToControlCost: 'Consolidate multiple microservices onto a single Application Load Balancer using path-based or host-based routing.'
  },
  'AWS Secrets Manager': {
    friendlyName: 'Secrets Manager',
    category: 'Security',
    shortSummary: 'Securely stores database passwords, API keys, and certificates.',
    detailedExplanation: 'Charges $0.40 per secret per month, plus $0.05 per 10,000 API calls to retrieve secrets.',
    whyItCostsMoney: 'AWS manages hardware security modules (HSM) and automated rotation workflows.',
    howToControlCost: 'Cache secret values in application memory so your application does not call GetSecretValue on every HTTP request.'
  },
  'AWS Key Management Service': {
    friendlyName: 'KMS Encryption Keys',
    category: 'Security',
    shortSummary: 'Creates and controls cryptographic keys used to encrypt data across AWS.',
    detailedExplanation: 'Customer-managed KMS keys cost $1.00/month each, plus $0.03 per 10,000 cryptographic API requests (encrypt/decrypt).',
    whyItCostsMoney: 'FIPS 140-2 validated Hardware Security Modules (HSMs) protecting master encryption keys.',
    howToControlCost: 'Enable S3 Bucket Keys to reduce KMS request costs by up to 99%, and schedule deletion of unused customer-managed keys.'
  },
  'AWS Identity and Access Management Access Analyzer': {
    friendlyName: 'IAM Access Analyzer',
    category: 'Security',
    shortSummary: 'Analyzes resource permissions to identify unintended external or unused access.',
    detailedExplanation: 'External access analyzers are free, while Unused Access Analyzers charge per analyzed IAM role or user per month.',
    whyItCostsMoney: 'Continuous automated policy graph analysis and CloudTrail usage inspection.',
    howToControlCost: 'Delete redundant Unused Access Analyzers if not actively used in your security workflow.'
  },
  'Tax': {
    friendlyName: 'Government Taxes (GST / VAT / Sales Tax)',
    category: 'Other',
    shortSummary: 'Applicable national or regional taxes (such as 18% India GST or US Sales Tax) assessed on cloud usage.',
    detailedExplanation: 'AWS calculates and collects statutory taxes (e.g., GST, VAT, Sales Tax) based on your billing address and tax registration status.',
    whyItCostsMoney: 'Mandatory government tax calculated as a percentage of your pre-tax AWS service subtotal.',
    howToControlCost: 'Ensure your GSTIN / VAT / Tax Exemption number is registered in AWS Billing Tax Settings to claim input tax credits.'
  }
};

export const COMMON_USAGE_TYPES: Record<string, {
  friendlyTitle: string;
  simpleExplanation: string;
  costImpact: string;
}> = {
  'BoxUsage': {
    friendlyTitle: 'On-Demand Server Runtime',
    simpleExplanation: 'Standard hourly cost for running virtual servers on-demand.',
    costImpact: 'Direct hourly cost based on instance size (CPU and memory).'
  },
  'SpotUsage': {
    friendlyTitle: 'Spot Server Runtime',
    simpleExplanation: 'Discounted compute capacity (up to 90% cheaper) that AWS can reclaim with 2 minutes notice.',
    costImpact: 'Very low cost compute, ideal for fault-tolerant batch processing.'
  },
  'VolumeUsage': {
    friendlyTitle: 'EBS Storage Volume',
    simpleExplanation: 'Provisioned virtual hard drive capacity (e.g. 50GB gp3 SSD) attached to servers.',
    costImpact: 'Billed per GB-month regardless of whether the server is powered on or off.'
  },
  'EBS:SnapshotUsage': {
    friendlyTitle: 'EBS Disk Backup Snapshots',
    simpleExplanation: 'Incremental backups of your server hard drives saved into S3.',
    costImpact: 'Billed at approximately $0.05 per GB-month for stored backup blocks.'
  },
  'PublicIPv4:InUseAddress': {
    friendlyTitle: 'Active Public IPv4 Address',
    simpleExplanation: 'Hourly AWS charge for every public IPv4 address attached to a running or stopped resource.',
    costImpact: '$0.005 per hour (~$3.60/month) per public IPv4 address.'
  },
  'PublicIPv4:IdleAddress': {
    friendlyTitle: 'Unattached / Idle Elastic IPv4 Address',
    simpleExplanation: 'Hourly charge for an allocated Elastic IP that is not attached to a running instance.',
    costImpact: '$0.005 per hour (~$3.60/month). Release unused Elastic IPs to eliminate this charge.'
  },
  'DataTransfer-Out-Bytes': {
    friendlyTitle: 'Internet Data Outflow (Egress)',
    simpleExplanation: 'Network traffic leaving your AWS account and heading out to the public internet.',
    costImpact: 'Costs roughly $0.09 per gigabyte. High video, file download, or API traffic increases this.'
  },
  'DataTransfer-Regional-Bytes': {
    friendlyTitle: 'Inter-Zone Network Traffic',
    simpleExplanation: 'Data flowing between different data centers (Availability Zones) in the same AWS region.',
    costImpact: 'Costs $0.01 per GB in each direction ($0.02 total). Chatty microservices spread across AZs trigger this.'
  },
  'NatGateway-Bytes': {
    friendlyTitle: 'NAT Gateway Traffic Processed',
    simpleExplanation: 'Data flowing through your VPC NAT Gateway on its way out to the internet.',
    costImpact: 'Costs $0.045 per gigabyte PROCESSED on top of standard data transfer out!'
  },
  'NatGateway-Hours': {
    friendlyTitle: 'NAT Gateway Hourly Availability',
    simpleExplanation: 'Fixed hourly charge just for keeping a NAT Gateway deployed.',
    costImpact: '$0.045 per hour per NAT Gateway (~$32.40/month per gateway just to exist).'
  },
  'TimedStorage-ByteHrs': {
    friendlyTitle: 'S3 Standard File Storage',
    simpleExplanation: 'Active files stored in Amazon S3 standard tier.',
    costImpact: 'Approximately $0.023 per gigabyte per month.'
  },
  'Requests-Tier1': {
    friendlyTitle: 'S3 Upload & Write Requests',
    simpleExplanation: 'API calls to upload or modify files in S3 (PUT, COPY, POST, LIST).',
    costImpact: '$0.005 per 1,000 requests.'
  },
  'Requests-Tier2': {
    friendlyTitle: 'S3 Download & Read Requests',
    simpleExplanation: 'API calls to retrieve files from S3 (GET and SELECT requests).',
    costImpact: '$0.0004 per 1,000 requests.'
  },
  'InstanceUsage': {
    friendlyTitle: 'RDS Database Instance Runtime',
    simpleExplanation: 'Hourly compute runtime for a managed RDS relational database server.',
    costImpact: 'Billed per hour based on database instance class and Single-AZ vs Multi-AZ deployment.'
  },
  'HostedZone': {
    friendlyTitle: 'Route 53 DNS Hosted Zone',
    simpleExplanation: 'Monthly management fee for an active domain DNS zone in Route 53.',
    costImpact: '$0.50 per hosted zone per month.'
  }
};

export const AWS_REGIONS_DIRECTORY: Record<string, { name: string; country: string; flag: string }> = {
  'us-east-1': { name: 'US East (N. Virginia)', country: 'United States', flag: '🇺🇸' },
  'us-east-2': { name: 'US East (Ohio)', country: 'United States', flag: '🇺🇸' },
  'us-west-1': { name: 'US West (N. California)', country: 'United States', flag: '🇺🇸' },
  'us-west-2': { name: 'US West (Oregon)', country: 'United States', flag: '🇺🇸' },
  'eu-west-1': { name: 'Europe (Ireland)', country: 'Ireland', flag: '🇮🇪' },
  'eu-central-1': { name: 'Europe (Frankfurt)', country: 'Germany', flag: '🇩🇪' },
  'eu-central-2': { name: 'Europe (Zurich)', country: 'Switzerland', flag: '🇨🇭' },
  'eu-west-2': { name: 'Europe (London)', country: 'United Kingdom', flag: '🇬🇧' },
  'eu-west-3': { name: 'Europe (Paris)', country: 'France', flag: '🇫🇷' },
  'eu-north-1': { name: 'Europe (Stockholm)', country: 'Sweden', flag: '🇸🇪' },
  'eu-south-1': { name: 'Europe (Milan)', country: 'Italy', flag: '🇮🇹' },
  'ap-southeast-1': { name: 'Asia Pacific (Singapore)', country: 'Singapore', flag: '🇸🇬' },
  'ap-southeast-2': { name: 'Asia Pacific (Sydney)', country: 'Australia', flag: '🇦🇺' },
  'ap-southeast-3': { name: 'Asia Pacific (Jakarta)', country: 'Indonesia', flag: '🇮🇩' },
  'ap-southeast-4': { name: 'Asia Pacific (Melbourne)', country: 'Australia', flag: '🇦🇺' },
  'ap-northeast-1': { name: 'Asia Pacific (Tokyo)', country: 'Japan', flag: '🇯🇵' },
  'ap-northeast-2': { name: 'Asia Pacific (Seoul)', country: 'South Korea', flag: '🇰🇷' },
  'ap-northeast-3': { name: 'Asia Pacific (Osaka)', country: 'Japan', flag: '🇯🇵' },
  'ap-south-1': { name: 'Asia Pacific (Mumbai)', country: 'India', flag: '🇮🇳' },
  'ap-south-2': { name: 'Asia Pacific (Hyderabad)', country: 'India', flag: '🇮🇳' },
  'ap-east-1': { name: 'Asia Pacific (Hong Kong)', country: 'Hong Kong', flag: '🇭🇰' },
  'sa-east-1': { name: 'South America (São Paulo)', country: 'Brazil', flag: '🇧🇷' },
  'ca-central-1': { name: 'Canada (Central)', country: 'Canada', flag: '🇨🇦' },
  'ca-west-1': { name: 'Canada West (Calgary)', country: 'Canada', flag: '🇨🇦' },
  'me-south-1': { name: 'Middle East (Bahrain)', country: 'Bahrain', flag: '🇧🇭' },
  'me-central-1': { name: 'Middle East (UAE)', country: 'United Arab Emirates', flag: '🇦🇪' },
  'af-south-1': { name: 'Africa (Cape Town)', country: 'South Africa', flag: '🇿🇦' },
  'il-central-1': { name: 'Israel (Tel Aviv)', country: 'Israel', flag: '🇮🇱' },
  'global': { name: 'Global (CloudFront, Route53, IAM)', country: 'Worldwide', flag: '🌐' },
  'noregion': { name: 'Global / Non-Regional (Tax, Route53, Support)', country: 'Worldwide', flag: '🌐' }
};

export function getFriendlyRegionName(regionCode: string): string {
  const reg = AWS_REGIONS_DIRECTORY[regionCode.toLowerCase()];
  return reg ? `${reg.name}` : regionCode;
}

export function explainService(serviceName: string): ServiceExplanation {
  const normalized = serviceName.trim();
  const lower = normalized.toLowerCase();

  // 1. Exact match
  if (SERVICE_EXPLANATIONS[normalized]) {
    return SERVICE_EXPLANATIONS[normalized];
  }
  const exactKey = Object.keys(SERVICE_EXPLANATIONS).find(k => k.toLowerCase() === lower);
  if (exactKey) {
    return SERVICE_EXPLANATIONS[exactKey];
  }

  // 2. Substring match (longest key first to avoid partial ambiguity)
  const sortedKeys = Object.keys(SERVICE_EXPLANATIONS).sort((a, b) => b.length - a.length);
  const subKey = sortedKeys.find(
    k => lower.includes(k.toLowerCase()) || k.toLowerCase().includes(lower)
  );
  if (subKey) {
    return SERVICE_EXPLANATIONS[subKey];
  }

  // 3. Smart keyword classification for any newly introduced AWS services
  if (lower.includes('bedrock') || lower.includes('claude') || lower.includes('anthropic') || lower.includes('sagemaker') || lower.includes('titan') || lower.includes('llama') || lower.includes('mistral') || lower.includes('cohere') || lower.includes('rekognition') || lower.includes('comprehend') || lower.includes('lex') || lower.includes('polly') || lower.includes('transcribe')) {
    return {
      friendlyName: `${normalized} (Generative AI / ML)`,
      category: 'AI & ML',
      shortSummary: `Managed AI & Machine Learning model usage: ${normalized}`,
      detailedExplanation: `${normalized} provides managed AI/ML inference or training capacity, billed based on input/output tokens processed, API requests, or compute instance hours.`,
      whyItCostsMoney: 'Serverless GPU/accelerator model inference and token processing.',
      howToControlCost: 'Use prompt caching, route lightweight requests to smaller models (like Haiku), and cap maximum output token lengths.'
    };
  }

  if (lower.includes('lightsail') || lower.includes('compute') || lower.includes('ec2') || lower.includes('fargate') || lower.includes('ecs') || lower.includes('eks') || lower.includes('batch') || lower.includes('apprunner')) {
    return {
      friendlyName: normalized,
      category: 'Compute',
      shortSummary: `Cloud compute and application runtime service: ${normalized}`,
      detailedExplanation: `AWS charges for ${normalized} based on active virtual server hours, vCPU/memory capacity, and provisioned runtime bundles.`,
      whyItCostsMoney: 'Reserved CPU, memory, and execution environments in AWS data centers.',
      howToControlCost: 'Stop or delete unused non-production instances and evaluate AWS Compute Savings Plans for steady 24/7 workloads.'
    };
  }

  if (lower.includes('s3') || lower.includes('storage') || lower.includes('ebs') || lower.includes('efs') || lower.includes('fsx') || lower.includes('glacier') || lower.includes('backup')) {
    return {
      friendlyName: normalized,
      category: 'Storage',
      shortSummary: `Cloud storage and backup retention service: ${normalized}`,
      detailedExplanation: `AWS charges for ${normalized} per gigabyte-month stored, snapshot retention, and read/write storage operations.`,
      whyItCostsMoney: 'Durable multi-facility disk and object storage capacity.',
      howToControlCost: 'Apply lifecycle policies to archive cold data to Glacier and delete orphaned volumes or expired snapshots.'
    };
  }

  if (lower.includes('rds') || lower.includes('database') || lower.includes('dynamodb') || lower.includes('aurora') || lower.includes('elasticache') || lower.includes('redshift') || lower.includes('documentdb') || lower.includes('neptune')) {
    return {
      friendlyName: normalized,
      category: 'Database',
      shortSummary: `Managed cloud database service: ${normalized}`,
      detailedExplanation: `AWS charges for ${normalized} based on database instance hours, provisioned IOPS/storage gigabytes, and backup retention.`,
      whyItCostsMoney: 'High-availability database compute, automated replication, and low-latency SSD storage.',
      howToControlCost: 'Pause development databases outside working hours and right-size oversized database instance classes.'
    };
  }

  if (lower.includes('vpc') || lower.includes('route 53') || lower.includes('cloudfront') || lower.includes('api gateway') || lower.includes('transfer') || lower.includes('network') || lower.includes('direct connect') || lower.includes('global accelerator')) {
    return {
      friendlyName: normalized,
      category: 'Networking',
      shortSummary: `Cloud networking, DNS, and content delivery service: ${normalized}`,
      detailedExplanation: `AWS charges for ${normalized} based on gigabytes of network traffic processed, active public IPv4 addresses, DNS hosted zones, or API requests.`,
      whyItCostsMoney: 'Global backbone bandwidth, edge routing, and managed network appliances.',
      howToControlCost: 'Release unused Elastic IPs, use CloudFront caching to reduce origin egress, and route S3 traffic via free Gateway VPC Endpoints.'
    };
  }

  if (lower.includes('kms') || lower.includes('waf') || lower.includes('guardduty') || lower.includes('shield') || lower.includes('security') || lower.includes('iam') || lower.includes('inspector') || lower.includes('macie') || lower.includes('certificate')) {
    return {
      friendlyName: normalized,
      category: 'Security',
      shortSummary: `Cloud security, encryption, and compliance service: ${normalized}`,
      detailedExplanation: `AWS charges for ${normalized} based on active security rules, encryption keys, or analyzed security events.`,
      whyItCostsMoney: 'Managed cryptographic hardware, threat detection engines, and compliance auditing.',
      howToControlCost: 'Remove unused encryption keys or duplicate security analyzers in non-production environments.'
    };
  }

  if (lower.includes('cloudwatch') || lower.includes('cloudtrail') || lower.includes('cost explorer') || lower.includes('simple email') || lower.includes('notification') || lower.includes('queue') || lower.includes('eventbridge') || lower.includes('config') || lower.includes('systems manager')) {
    return {
      friendlyName: normalized,
      category: 'Management',
      shortSummary: `Cloud operations, messaging, and monitoring service: ${normalized}`,
      detailedExplanation: `AWS charges for ${normalized} based on ingested logs, API requests, or messages/notifications delivered.`,
      whyItCostsMoney: 'Telemetry ingestion, message queuing, and operational automation infrastructure.',
      howToControlCost: 'Set log retention limits and avoid excessive polling of management APIs.'
    };
  }

  return {
    friendlyName: normalized,
    category: 'Other',
    shortSummary: `AWS managed cloud service: ${normalized}`,
    detailedExplanation: `AWS charges for ${normalized} based on resource provisioning, API requests, and duration of usage.`,
    whyItCostsMoney: 'Provisioned cloud infrastructure and operational management.',
    howToControlCost: 'Review active resources in this service and review AWS documentation for pricing tiers.'
  };
}

export function explainUsageType(usageType: string) {
  for (const [key, val] of Object.entries(COMMON_USAGE_TYPES)) {
    if (usageType.includes(key)) {
      return val;
    }
  }
  if (usageType.toLowerCase().includes('inputtoken') || usageType.toLowerCase().includes('outputtoken')) {
    return {
      friendlyTitle: 'Generative AI Token Consumption',
      simpleExplanation: `LLM prompt input or completion output tokens billed by Amazon Bedrock (${usageType}).`,
      costImpact: 'Billed per 1,000 tokens processed.'
    };
  }
  return {
    friendlyTitle: usageType,
    simpleExplanation: `Specific resource usage code: ${usageType}`,
    costImpact: 'Standard AWS pay-as-you-go billing rate.'
  };
}
