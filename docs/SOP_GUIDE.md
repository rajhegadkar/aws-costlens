# Standard Operating Procedure (SOP) — AWS CostLens

> **Document ID:** SOP-OPS-001  
> **Effective Date:** October 2026  
> **Review Cycle:** Quarterly  
> **System:** AWS CostLens (Self-Hosted Cloud FinOps & Cost Observability Platform)

---

## 1. Scope & Objective

This Standard Operating Procedure (SOP) defines the operational guidelines, security standards, deployment routines, and maintenance procedures for **AWS CostLens**. 

### 1.1 Objective
To ensure secure, consistent, and resilient operation of AWS CostLens across enterprise environments, ensuring 100% read-only access to AWS billing telemetry and zero risk to cloud workloads.

---

## 2. System Architecture & Safety Model

AWS CostLens operates on an air-gapped, zero-mutation security architecture:

```
┌────────────────────────────────────────────────────────┐
│                   AWS Cloud Boundary                   │
│   Cost Explorer API │ EC2 Describe │ S3 List │ STS     │
└───────────────────────────▲────────────────────────────┘
                            │ (HTTPS TLS 1.3 / SigV4)
                            │ 100% Read-Only Allowed
┌───────────────────────────┴────────────────────────────┐
│         AWS CostLens Security Layer (awsGuard.ts)       │
│  • Strictly checks all operations against read-only list│
│  • AST validation rejects any mutating commands         │
└───────────────────────────▲────────────────────────────┘
                            │
┌───────────────────────────┴────────────────────────────┐
│             Local Server Runtime (:5000)               │
│  • Express API + Vite React Frontend                   │
│  • Non-Destructive File Cache (data/cache.json)        │
│  • Sliding-Window Rate Limiter                         │
│  • PBKDF2 Session Authentication                       │
└────────────────────────────────────────────────────────┘
```

### 2.1 Non-Negotiable Operational Principles
1. **Zero Write Permissions**: The application must never be granted IAM write, create, update, delete, reboot, or stop permissions.
2. **Local Data Custody**: All billing data and credentials reside on the host system or container; no telemetry is sent to any external SaaS.
3. **Cache-First Performance**: AWS Cost Explorer API queries must be cached locally to prevent API charges ($0.01/call) on repeat views.

---

## 3. Prerequisites & Infrastructure Requirements

### 3.1 Host System Requirements
| Component | Minimum Specification | Recommended Specification |
|---|---|---|
| **CPU** | 1 vCPU / Core | 2 vCPU / Cores |
| **Memory (RAM)** | 1 GB | 2 GB+ |
| **Disk Storage** | 500 MB free space | 2 GB+ SSD free space |
| **Operating System** | Windows 10/11/Server, Ubuntu 20.04+, Debian 11+, RHEL/Rocky 8+, macOS 12+ |
| **Node.js** | Node.js v20.x or v22.x LTS | Node.js v22 LTS |
| **Container Engine** | (Optional) Docker 24+ & Docker Compose v2+ | Docker Engine & Compose |

### 3.2 AWS IAM Read-Only Policy
Attach this policy to the IAM user or EC2 Instance Role running CostLens:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CostLensReadOnlyBillingAndInventory",
      "Effect": "Allow",
      "Action": [
        "ce:GetCostAndUsage",
        "ce:GetCostForecast",
        "ce:GetDimensionValues",
        "ce:GetTags",
        "ce:GetAnomalies",
        "ce:GetSavingsPlansUtilization",
        "ce:GetReservationUtilization",
        "sts:GetCallerIdentity",
        "ec2:DescribeInstances",
        "ec2:DescribeRegions",
        "ec2:DescribeVolumes",
        "s3:ListAllMyBuckets",
        "s3:ListBucket",
        "s3:GetBucketLocation",
        "rds:DescribeDBInstances",
        "cloudtrail:LookupEvents"
      ],
      "Resource": "*"
    }
  ]
}
```

---

## 4. Standard Deployment & Startup Routines

### 4.1 Native Host Deployment

#### Windows Environment
1. Open PowerShell or Command Prompt in the project directory.
2. Execute the automated launcher:
   ```cmd
   start.bat
   ```
   *Alternatively via PowerShell:*
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\start.ps1
   ```
3. The launcher will automatically verify Node.js, install dependencies if missing, build the bundle, and launch the server at `http://localhost:5000`.

#### Linux / macOS Environment
1. Ensure the shell script has execution permissions:
   ```bash
   chmod +x start.sh
   ```
2. Run the startup script:
   ```bash
   ./start.sh
   ```

### 4.2 Docker / Containerized Deployment
For production background execution or server hosting:

```bash
# Build and start container in detached mode
docker-compose up -d --build

# View real-time container logs
docker-compose logs -f

# Verify container health
docker-compose ps
```

---

## 5. Configuration & Environment Standards

All configurable settings are managed via `.env` in the root directory.

### 5.1 Standard `.env` Parameter Matrix
| Parameter | Default Value | Purpose & Production Guidance |
|---|---|---|
| `PORT` | `5000` | Port on which the web application listens. |
| `NODE_ENV` | `production` | Set to `production` for security headers and optimized assets. |
| `APP_ADMIN_USER` | `admin` | Application administrator username for web access. |
| `APP_ADMIN_PASSWORD` | *(set securely)* | Application administrator password (min 10 characters). |
| `APP_SESSION_SECRET` | *(random 32+ hex)* | Used to sign session tokens. Must be changed in production. |
| `AWS_PROFILE` | `default` | Name of AWS CLI profile in `~/.aws/credentials` to load. |
| `AWS_REGION` | `ap-south-1` | Primary region for Cost Explorer and inventory discovery. |

---

## 6. Routine Operational Verification & Security Audits

Execute these verification checks after any software update or credential rotation.

### 6.1 Automated Security Audit
Verify that no mutating AWS operations exist anywhere in the application source code:

```bash
npm run security:audit-mutations
```
*Expected Result:*
```
=====================================================
🛡️  RUNNING AWS MUTATION SAFETY AUDIT
=====================================================
✅ AUDIT PASSED: ZERO AWS MUTATION COMMANDS FOUND IN CODEBASE.
   The application is guaranteed 100% read-only.
```

### 6.2 Health & Session Verification
1. Access `http://localhost:5000/api/auth/status` in your browser or via curl:
   ```bash
   curl -s http://localhost:5000/api/auth/status
   ```
2. Confirm `readOnlyMode: true` and that `permissions` are marked `accessible`.

---

## 7. Operational Workflows

### 7.1 Switching AWS Profiles
CostLens supports multi-account management:
1. In the top navigation bar, locate the **AWS Profile** selector.
2. Select any configured AWS CLI profile (e.g., `production`, `staging`, `shared-services`).
3. Click **Re-Scan Cloud Resources** to refresh inventory for the active profile.

### 7.2 Forcing Data Cache Invalidation
By default, billing telemetry is cached for up to 6 hours and machine inventory for 15 minutes to minimize API calls.
* **To force a fresh live fetch:**
  1. Click the **Refresh Data** button in the top navigation bar, or
  2. Send an authenticated POST request to `/api/cost/refresh?month=2026-10`.

### 7.3 Exporting FinOps Reports
1. Navigate to the **Export Report** screen in the left sidebar.
2. Select the billing period (current month or historical YYYY-MM).
3. Click **Download Executive CSV** for spreadsheet analysis or **Download Full JSON** for data pipelines.

---

## 8. Incident Response & Troubleshooting Guide

| Symptom | Root Cause | Remediation Procedure |
|---|---|---|
| **Login fails with 401 Unauthorized** | Incorrect credentials or default password changed. | Check `APP_ADMIN_USER` and `APP_ADMIN_PASSWORD` in `.env`. Restart the server. |
| **Login fails with 429 Too Many Requests** | Rate limiter triggered due to 5+ failed attempts in 15 mins. | Wait 15 minutes for the window to reset, or restart the application process. |
| **"Credentials not found" warning on dashboard** | AWS credentials missing or expired in `~/.aws/credentials`. | Run `aws configure` or refresh AWS SSO session via `aws sso login --profile <name>`. Alternatively, enable **Demo Mode** in the navbar. |
| **Port 5000 already in use error** | Another service or previous instance is running on port 5000. | Change `PORT=5001` in `.env` and restart, or terminate the existing process (`netstat -ano \| findstr :5000` on Windows). |
| **Per-resource inventory shows 0 machines** | Selected AWS region has no EC2 instances or region lacks permissions. | Verify default region in `.env` or click profile settings to switch regions. |

---

## 9. Document Control & Sign-Off

| Role | Responsibility | Status |
|---|---|---|
| **Author** | Antigravity AI Systems / FinOps Operations | Complete |
| **Security Review** | Automated AST Mutation Audit (`awsGuard.ts`) | Passed (100% Read-Only) |
| **Operational Approval** | Enterprise Infrastructure Team | Approved for Self-Hosting |
