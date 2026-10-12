# ☁️ AWS CostLens — Self-Hosted, 100% Read-Only AWS FinOps Dashboard

[![CI & Read-Only Security Audit](https://github.com/rajhegadkar/aws-costlens/actions/workflows/ci.yml/badge.svg)](https://github.com/rajhegadkar/aws-costlens/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Read-Only Safety](https://img.shields.io/badge/AWS%20API-100%25%20Read--Only%20Enforced-emerald.svg)](#-critical-safety-architecture--100-read-only)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev/)
[![Docker Ready](https://img.shields.io/badge/Docker-Ready-2496ed.svg)](#-option-2-docker--docker-compose-recommended-for-servers)

> **A local, privacy-first, 100% read-only AWS Cost Explorer & Cloud Inventory dashboard built for engineering teams, executives, and FinOps practitioners.**

Run it on **any Windows PC, Ubuntu/Linux server, macOS laptop, Docker container, or GitHub Codespace**. Zero third-party SaaS agents, zero telemetry, and zero AWS write permissions required.

---

## ✨ Key Features

- 💬 **Interactive FinOps Q&A Assistant ("Ask CostLens")**: Ask natural-language questions (*"Why did my bill increase?"*, *"How much is EC2?"*, *"How much am I spending on Claude & Bedrock AI?"*, *"Which region costs the most?"*) and receive verified answers with 1-click drilldowns.
- ⚡ **5 Category Deep-Dives**: Dedicated component-level breakdowns and optimization guides for **Compute**, **Storage**, **Databases**, **Data Transfer / Networking**, and **AI & Bedrock (`AI & ML`)**.
- 🧾 **Exact Bill & Invoice Reconciliation**: Reconcile monthly AWS usage charges, credits, and statutory taxes (GST / VAT / Sales Tax) line-by-line against official AWS PDF invoices.
- 🖥️ **Multi-Region Cloud Inventory (EC2, S3 & RDS)**: Parallel discovery across AWS regions showing **EC2 machine names (`Name` tags)**, running vs. stopped states, instance sizes, private/public IPs, **S3 buckets**, and **RDS database instances**.
- 🕵️ **IAM User Activity & CloudTrail Audit**: Inspect recent AWS API activity by IAM user and role without logging into the AWS Management Console.
- 📅 **12-Month Historical Selector & Offline Cache Resilience**: Compare any of the past 12 months with non-destructive disk caching (`data/cost-explorer-cache.json`) that protects against Cost Explorer API throttling ($0.01/request) and works offline using stale-while-offline recovery.
- 🧠 **"Explain This Cost" in Plain English**: Translates cryptic AWS billing codes (`BoxUsage:t3.medium`, `EBS:VolumeUsage.gp3`, `DataTransfer-Out-Bytes`, `InputTokenCount-Units`) into clear business explanations.
- 🔒 **Production Security Hardened**: Timing-safe SHA-256 authentication, HMAC session tokens, sliding-window rate limiting, CSV formula-injection neutralization, HTTP security headers, and an enforced read-only AWS SDK guard.

---

## 🛡️ Critical Safety Architecture — 100% Read-Only

AWS CostLens is **physically incapable of modifying, creating, stopping, starting, or deleting any AWS resource**.

```text
┌───────────────────────────────────────────────────────────────────┐
│                           AWS CostLens                            │
│                                                                   │
│   Browser UI (React 18) ──► Express API Server (TypeScript)       │
│                                     │                             │
│                                     ▼                             │
│                 awsGuard: Strict Read-Only Allowlist              │
│          [ONLY: Get*, Describe*, List*, LookupEvents]             │
│          [BLOCKS: Create*, Delete*, Modify*, Stop*, Start*, Put*] │
│                                     │                             │
│                                     ▼                             │
│                         AWS SDK v3 (Read-Only)                    │
└───────────────────────────────────────────────────────────────────┘
```

1. **Runtime Allowlist Guard ([`server/security/awsGuard.ts`](server/security/awsGuard.ts))**: Every AWS SDK command must pass through `executeSafeReadOnlyOperation()`. Any mutating or unlisted operation throws a `BlockedOperationError` before reaching the AWS SDK.
2. **Static Codebase Mutation Audit ([`scripts/audit-mutations.ts`](scripts/audit-mutations.ts))**: Run `npm run security:audit-mutations` at any time (and automatically in CI) to verify zero mutating AWS SDK commands exist anywhere in the repository.
3. **Zero Credential Exposure**: AWS credentials never leave your server or local machine and are never transmitted to the browser.

---

## 🚀 Self-Hosting Guide

You can self-host AWS CostLens on **Windows**, **Ubuntu / Linux**, **macOS**, **Docker**, or **GitHub Codespaces**.

### Prerequisites
- **Node.js 20+** (or **Node.js 18+**) — [Download Node.js](https://nodejs.org/) *(Not required if using Docker)*
- **Git** — [Download Git](https://git-scm.com/)
- **Optional**: Read-only AWS IAM credentials (or explore immediately using the built-in **Demo Mode**)

---

### Option 1: One-Touch Launch (Windows, Ubuntu/Linux, macOS)

#### 🪟 Windows (PowerShell or Command Prompt)
```powershell
git clone https://github.com/rajhegadkar/aws-costlens.git
cd aws-costlens

# One-touch launch (installs dependencies, builds, starts server, and opens browser)
.\start.ps1
```
*(Or double-click `start.bat` in Windows File Explorer.)*

#### 🐧 Ubuntu / Debian / Linux / macOS
```bash
git clone https://github.com/rajhegadkar/aws-costlens.git
cd aws-costlens

chmod +x start.sh
./start.sh
```

Once started, open **`http://localhost:4000`** in your browser.

---

### Option 2: Docker & Docker Compose (Recommended for Servers)

Run AWS CostLens in an isolated production Alpine container with automatic health checks and persistent disk cache:

```bash
git clone https://github.com/rajhegadkar/aws-costlens.git
cd aws-costlens

# 1. Create your environment file
cp .env.example .env
# Edit .env to set APP_ADMIN_PASSWORD and optional AWS credentials

# 2. Build and start in background
docker compose up -d --build
```

- **Web UI**: `http://localhost:4000`
- **Health Check**: `http://localhost:4000/health`
- **View Logs**: `docker compose logs -f`
- **Stop Container**: `docker compose down`

---

### Option 3: Production Ubuntu Server with PM2 (24/7 Background Service)

To host AWS CostLens permanently on an Ubuntu VM or AWS EC2 instance:

```bash
# 1. Install Node.js 20 LTS on Ubuntu
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git

# 2. Clone and build
git clone https://github.com/rajhegadkar/aws-costlens.git
cd aws-costlens
npm ci
cp .env.example .env
npm run build

# 3. Run as a managed background daemon with PM2
sudo npm install -g pm2
pm2 start dist/server/server/index.js --name "aws-costlens"
pm2 save
pm2 startup
```

> **💡 Running on an AWS EC2 Instance?**
> You do **not** need to put `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY` in `.env`. Simply attach the [Read-Only IAM Role](#-recommended-read-only-aws-iam-policy) directly to your EC2 instance and AWS CostLens will authenticate automatically via the instance metadata service (IMDS).

---

### Option 4: Run on GitHub Codespaces (Zero Local Setup)

1. Click the green **Code** button at the top of this GitHub repository.
2. Select the **Codespaces** tab → **Create codespace on main**.
3. In the Codespace terminal, run:
   ```bash
   npm ci && npm run build && npm start
   ```
4. GitHub Codespaces will automatically forward port `4000` to your browser over a private, authenticated HTTPS URL.

---

## 🔑 Dashboard Login & Environment Variables

By default, the web interface is protected by a local login screen:

| Setting | Default Value | Environment Variable | Description |
| :--- | :--- | :--- | :--- |
| **Username** | `admin` | `APP_ADMIN_USER` | Dashboard login username |
| **Password** | `admin123` | `APP_ADMIN_PASSWORD` | Dashboard login password *(change in production!)* |
| **Session Secret** | *(built-in fallback)* | `JWT_SECRET` | Secret key used to sign 7-day HMAC session tokens |
| **Server Port** | `4000` | `PORT` | HTTP port for the web UI and REST API |
| **Bind Address** | `0.0.0.0` | `HOST` | `0.0.0.0` allows LAN access; set `127.0.0.1` for localhost-only |
| **AWS Region** | `us-east-1` | `AWS_REGION` | Default region for STS and inventory discovery |
| **AWS Profile** | `default` | `AWS_PROFILE` | Named profile from `~/.aws/credentials` |
| **Cache TTL** | `3600000` (1 hour) | `CACHE_TTL_MS` | Cache duration in ms to minimize AWS Cost Explorer API fees |
| **Demo Mode** | `false` | `DEMO_MODE` | Set `true` to force sample FinOps data without AWS keys |

---

## ⚙️ Connecting Your AWS Account

AWS CostLens supports the standard **AWS SDK v3 Credential Provider Chain**:

1. **AWS CLI Profile (`~/.aws/credentials`)**: Run `aws configure` on your machine, or mount `~/.aws:/root/.aws:ro` in Docker. You can switch between multiple named profiles directly from the top-right navbar in the UI.
2. **Environment Variables (`.env`)**:
   ```env
   AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
   AWS_SECRET_ACCESS_KEY=your_secret_access_key
   AWS_REGION=us-east-1
   ```
3. **IAM Instance Profile / ECS Task Role**: Automatically detected when hosted inside AWS.
4. **Demo Mode**: Click the connection badge in the top-right navbar at any time to toggle between **Live AWS Credential Chain** and **Demo Mode**.

---

## 📋 Recommended Read-Only AWS IAM Policy

Follow least-privilege best practices by attaching this **100% Read-Only IAM Policy** to the IAM User or Role used by AWS CostLens:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CostLensCostExplorerReadOnly",
      "Effect": "Allow",
      "Action": [
        "ce:GetCostAndUsage",
        "ce:GetCostForecast",
        "ce:GetDimensionValues",
        "ce:GetTags",
        "ce:GetReservationUtilization",
        "ce:GetSavingsPlansUtilization",
        "ce:GetSavingsPlansCoverage"
      ],
      "Resource": "*"
    },
    {
      "Sid": "CostLensResourceInventoryReadOnly",
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeInstances",
        "ec2:DescribeRegions",
        "ec2:DescribeTags",
        "rds:DescribeDBInstances",
        "s3:ListAllMyBuckets",
        "s3:ListBucket",
        "cloudtrail:LookupEvents",
        "sts:GetCallerIdentity"
      ],
      "Resource": "*"
    }
  ]
}
```

---

## 🌐 Accessing Across Your Local Wi-Fi / LAN

By default, AWS CostLens binds to `0.0.0.0:4000` and prints your local network IP address on startup:

```text
=====================================================
🔒 AWS COST EXPLORER (READ-ONLY) SERVER STARTED
📡 Local URL:   http://localhost:4000
🌐 Network LAN: http://192.168.1.100:4000
🛡️  Read-Only Safety Guard: ENFORCED
=====================================================
```

- Open `http://<YOUR-LAN-IP>:4000` from any phone, tablet, or laptop on the same network.
- **Windows Firewall Tip**: If other devices on your Wi-Fi cannot connect, allow port `4000` in PowerShell (Admin):
  ```powershell
  New-NetFirewallRule -DisplayName "AWS CostLens Port 4000" -Direction Inbound -LocalPort 4000 -Protocol TCP -Action Allow
  ```
- **Ubuntu UFW Firewall Tip**:
  ```bash
  sudo ufw allow 4000/tcp
  ```

---

## 🛠️ Development & Verification Commands

```bash
# Install dependencies
npm ci

# Start full-stack development server with hot-reload (Frontend :5173 + API :4000)
npm run dev

# Run TypeScript typechecking across frontend and backend
npm run typecheck

# Run unit & integration test suite (Vitest)
npm test

# Run static AWS mutation security audit
npm run security:audit-mutations

# Build production frontend & backend bundles into dist/
npm run build

# Start production server on port 4000
npm start
```

---

## 📁 Project Structure

```text
aws-costlens/
├── server/                         # Node.js + Express + TypeScript Backend
│   ├── aws/
│   │   ├── awsClients.ts           # Modular AWS SDK v3 client factory
│   │   ├── costExplorerService.ts  # Cost Explorer queries, UTC periods & search
│   │   ├── inventoryService.ts     # Multi-region EC2, S3, RDS & CloudTrail scanner
│   │   └── mockDataService.ts      # Realistic FinOps fallback & demo dataset
│   ├── cache/
│   │   └── fileCache.ts            # Non-destructive atomic file cache + stale fallback
│   ├── security/
│   │   ├── auth.ts                 # Timing-safe authentication & HMAC session tokens
│   │   ├── awsGuard.ts             # Strict read-only AWS operation allowlist guard
│   │   └── rateLimiter.ts          # Sliding-window login & API rate limiters
│   ├── routes/
│   │   └── api.ts                  # REST API routes & CSV/JSON report exporter
│   └── index.ts                    # Express server entrypoint & graceful shutdown
├── shared/
│   ├── explanationDictionary.ts    # Plain-English AWS service, usage type & region guide
│   └── types.ts                    # Shared TypeScript interfaces
├── src/                            # React 18 + Tailwind CSS + Recharts Frontend
│   ├── api/client.ts               # Authenticated API client
│   ├── components/                 # Navbar, Sidebar, ExplainModal, ErrorBoundary, etc.
│   └── pages/                      # 16 FinOps views (Overview, Invoice, Inventory, Q&A...)
├── scripts/
│   └── audit-mutations.ts          # Automated read-only AWS security verifier
├── tests/                          # Vitest test suites (Guard, Auth, Cache, FinOps)
├── Dockerfile                      # Multi-stage Node 20 Alpine production image
├── docker-compose.yml              # One-command container orchestration
├── start.ps1 / start.bat / start.sh# Cross-platform one-touch launchers
└── .env.example                    # Environment configuration template
```

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for full details.
