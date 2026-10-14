# AWS CostLens — Executive Presentation Guide & Standard Operating Procedure (SOP)

> **Document Version:** 1.0.0  
> **Target Audience:** Presenters, Solution Architects, FinOps Leaders, Engineering Managers, Executives  
> **Platform:** AWS CostLens (Self-Hosted Read-Only FinOps & Cost Observability Platform)

---

## Table of Contents
1. [Executive Summary & Product Positioning](#1-executive-summary--product-positioning)
2. [Standard Operating Procedure (SOP): Pre-Presentation Checklist](#2-standard-operating-procedure-sop-pre-presentation-checklist)
3. [12-Minute Live Demo Script & Step-by-Step Walkthrough](#3-12-minute-live-demo-script--step-by-step-walkthrough)
   - [Phase 1: Welcome & Executive Overview (2 Mins)](#phase-1-welcome--executive-overview-2-mins)
   - [Phase 2: Plain-English Service Breakdown & Deep-Dive (2 Mins)](#phase-2-plain-english-service-breakdown--deep-dive-2-mins)
   - [Phase 3: Live Cloud Inventory & Per-Resource Machine/Bucket Billing (3 Mins) — ⭐ Hero Feature](#phase-3-live-cloud-inventory--per-resource-machinebucket-billing-3-mins----hero-feature)
   - [Phase 4: AI & ML (Bedrock / Claude) & Specialized Categories (2 Mins)](#phase-4-ai--ml-bedrock--claude--specialized-categories-2-mins)
   - [Phase 5: Invoice Reconciliation, Regions & Multi-Account Tags (2 Mins)](#phase-5-invoice-reconciliation-regions--multi-account-tags-2-mins)
   - [Phase 6: Natural Language Search, Anomalies & Security Guard (1 Min)](#phase-6-natural-language-search-anomalies--security-guard-1-min)
4. [Audience-Specific Presentation Angles](#4-audience-specific-presentation-angles)
   - [For CFO / Financial Controllers](#for-cfo--financial-controllers)
   - [For CTO / VP of Engineering](#for-cto--vp-of-engineering)
   - [For DevOps / Cloud Engineers / SREs](#for-devops--cloud-engineers--sres)
5. [Anticipated Q&A & Objection Handling](#5-anticipated-qa--objection-handling)
6. [Quick Reference Cheat Sheet (Sample Account Metrics)](#6-quick-reference-cheat-sheet-sample-account-metrics)

---

## 1. Executive Summary & Product Positioning

### The Problem
* **AWS Cost Explorer is opaque and confusing**: Finance and management cannot decipher cryptic billing codes such as `APS3-BoxUsage:t3.medium`, `TimedStorage-ByteHrs`, or `APS3-DataTransfer-Out-Bytes`.
* **Zero Resource Visibility**: AWS Cost Explorer groups spending by service or usage type, **never** by individual EC2 server names or individual S3 storage buckets unless complex, paid, and tedious tagging systems are pre-configured.
* **Third-Party SaaS Risk**: Commercial cloud cost tools require broad cross-account IAM read-write roles, upload proprietary infrastructure telemetry to third-party cloud servers, and charge exorbitant monthly subscription fees.

### The Solution: AWS CostLens
**AWS CostLens** is an open-source, self-hosted, 100% read-only FinOps and cost observability application. It transforms raw, complex AWS billing records into human-readable plain English explanations, maps costs to actual machine names and individual storage buckets, reconciles with the official AWS invoice, and operates with zero third-party data transmission.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CORE VALUE PILLARS                              │
├──────────────────┬──────────────────┬─────────────────┬────────────────┤
│  🛡️ 100% Safe    │  🏷️ Per-Resource │  🤖 AI & Cloud  │  ⚡ Air-Gapped │
│    Read-Only     │     Billing      │   Observability │     Privacy    │
│  Zero mutations  │  EC2 names & S3  │ Amazon Bedrock, │  Self-hosted,  │
│  possible by code│  bucket costs MTD│ Claude & Models │ no SaaS leaks  │
└──────────────────┴──────────────────┴─────────────────┴────────────────┘
```

---

## 2. Standard Operating Procedure (SOP): Pre-Presentation Checklist

Follow this checklist **10 minutes before** any demo or stakeholder presentation to guarantee a flawless walkthrough.

### Checklist Table
| # | Step | Command / Action | Expected Result |
|---|---|---|---|
| **1** | **Verify Installation** | Open terminal in project folder | Clean workspace, dependencies installed |
| **2** | **Start the Server** | **Windows:** `.\start.bat`<br>**macOS/Linux:** `./start.sh`<br>**Docker:** `docker-compose up -d` | Server starts on `http://localhost:5000` |
| **3** | **Open Browser** | Open Chrome / Edge / Brave to `http://localhost:5000` | Clean, modern CostLens login screen |
| **4** | **Sign In** | Enter admin credentials (`admin` / `admin123` or your `.env`) | Lands on Executive Overview dashboard |
| **5** | **Choose Mode** | Click profile dropdown in upper navbar | Choose **Default Profile (Live AWS)** or toggle **Demo Mode** |
| **6** | **Set Screen Zoom** | Press `F11` (Full Screen), zoom browser to `90%` or `100%` | Optimum layout for projector / screen share |
| **7** | **Theme Selection** | Click Dark / Light toggle in top-right navbar | Dark mode is best for tech audiences; Light mode for corporate slides |

---

## 3. 12-Minute Live Demo Script & Step-by-Step Walkthrough

---

### Phase 1: Welcome & Executive Overview (2 Mins)
* **Goal**: Hook the audience immediately with high-level clarity, spend trajectory, and month-end projections.
* **Screen to Show**: **Executive Overview** (`#overview`)

#### What to Do
1. Direct the audience's attention to the **Top Metric Cards**.
2. Point out the **Projected Month-End Spend** and confidence range.
3. Switch the **Interactive Timeline** tabs between **Daily**, **Weekly**, and **Monthly**.

#### Talking Script
> *"Good morning everyone. Today I'm excited to demonstrate **AWS CostLens** — our centralized, self-hosted FinOps and cost observability platform.*
>
> *Normally, checking AWS spending requires logging into the complex AWS Billing Console, clicking through dozens of menus, and guessing what cryptic billing codes mean. CostLens solves this instantly.*
>
> *Right here on the Executive Overview, you see our real-time financial posture: Month-to-Date spend, comparison against the previous month, our daily average burn rate, and a projected month-end forecast with minimum and maximum confidence bounds.*
>
> *Below, this interactive timeline gives us daily granularity. We can immediately spot spikes on weekends or batch-run days, or switch to weekly and monthly views to track our cost trend across quarters."*

---

### Phase 2: Plain-English Service Breakdown & Deep-Dive (2 Mins)
* **Goal**: Demonstrate how CostLens decodes confusing AWS billing codes into plain English business context.
* **Screen to Show**: **Services Breakdown** (`#services`) & **Service Detail** (`#serviceDetail`)

#### What to Do
1. Click **Services Breakdown** in the left sidebar.
2. Show the categorized list: Compute, Storage, Database, Networking, AI & ML.
3. Click on **Amazon Elastic Compute Cloud - Compute** or **Amazon Simple Storage Service**.
4. Highlight the **Plain-English Explanation** card at the top.
5. Show the **Subcategories**, **Operations**, and **Regional Distribution** panels.

#### Talking Script
> *"Now let's look at where the money actually goes. Under **Services**, every AWS service is cleanly grouped into primary categories.*
>
> *Notice that we don't just see a raw dollar number. If I click on **Amazon EC2 Compute**, CostLens translates the technical billing items for us. Instead of an unhelpful line item like `BoxUsage:t4g.xlarge`, CostLens explains: **'Standard hourly cost for running virtual servers on-demand.'***
>
> *We also see the distinction between **Compute runtime** and **EC2 - Other** — which is often the most misunderstood charge on AWS bills, representing attached EBS virtual hard disks, snapshots, and public IPv4 allocation fees.*
>
> *Everything is broken down by subcategory, AWS API operation, and geographic region with percentage shares."*

---

### Phase 3: Live Cloud Inventory & Per-Resource Machine/Bucket Billing (3 Mins) — ⭐ Hero Feature
* **Goal**: Present the single most powerful feature — identifying real machine names and computing per-EC2 and per-S3 bucket billing.
* **Screen to Show**: **Cloud Inventory** (`#inventory`)

#### What to Do
1. Click **Cloud Inventory** in the sidebar.
2. Review the top KPI cards: Total EC2 Machines, Running vs Stopped, and Total S3 Buckets.
3. On the **EC2 Machines** tab:
   - Point to the instance names (e.g. `DU1_nbim-prod-main-server`, `Corporate_Backend-prod-V3.0`).
   - Highlight the **Current Billing Badge (`$XX.XX`)** next to the name.
   - Point out the **30-Day Run-Rate (`~$XX.XX/mo`)** and **Hourly Rate (`$X.XXXX/hr`)**.
   - Show how a **Stopped** machine shows `$0.00/hr compute` and separates stopped EBS disk costs from hours run earlier in the month.
   - Switch the sort dropdown to **"Sort: Highest Cost"**.
4. Click on the **S3 Buckets** tab:
   - Highlight the **49 S3 buckets**.
   - Point directly next to the bucket names: each bucket has its **Current Billing Badge (`$XX.XX`)**.
   - Point out the **% of Total S3 Spend** visual progress bar, **Estimated Size (GB/MB)**, and **Storage Class** (`S3 Standard`, `Glacier Deep Archive`).
   - Show the footer row reconciling 100% to the account's total AWS S3 bill.

#### Talking Script
> *"Now, this is the standout capability of AWS CostLens — **Live Cloud Inventory with Per-Resource Billing**.*
>
> *In native AWS Cost Explorer, you can never see how much individual servers or individual S3 buckets cost unless you spend weeks configuring tags or paying for complex hourly data.*
>
> *Here on the **EC2 Machines** tab, CostLens connects directly to AWS in a strictly read-only manner, discovers our actual machine names, and reconciles each server's exact month-to-date spend.*
>
> *For example, we can see `Corporate_Backend-prod-V3.0` has burned `$12.04` this month with a run-rate of `~$32.77/mo`. Next to it, stopped servers show `$0/hr` for compute while identifying their residual EBS disk storage cost.*
>
> *Now let's switch to the **S3 Buckets** tab. Many organizations have dozens of S3 buckets and no idea which one is driving their storage bill. CostLens reconciles all 49 buckets: right next to each bucket name, we see its exact current month cost, percentage of total S3 spend, estimated size in gigabytes, and whether it's stored in S3 Standard or Glacier Deep Archive.*
>
> *Notice the summary row at the bottom: every dollar reconciles 100% to our official AWS Cost Explorer S3 service total."*

---

### Phase 4: AI & ML (Bedrock / Claude) & Specialized Categories (2 Mins)
* **Goal**: Demonstrate forward-looking visibility into Generative AI spending and network cost traps.
* **Screen to Show**: **Categories Deep Dive** (`#ai` and `#datatransfer`)

#### What to Do
1. Click **AI & Machine Learning** in the sidebar.
2. Show the breakdown of foundation models (e.g., `Claude Sonnet 5`, `Claude Haiku 4.5`).
3. Explain the input prompt tokens vs output completion tokens breakdown.
4. Click **Data Transfer & Network** in the sidebar and highlight NAT Gateway hourly vs processed data charges.

#### Talking Script
> *"As we adopt frontier AI models, tracking inference costs becomes mission-critical. Under **AI & ML**, CostLens isolates Amazon Bedrock foundation models.*
>
> *We can see the exact split between Claude Sonnet and Claude Haiku, differentiating between input prompt tokens and output completion tokens. CostLens even provides actionable FinOps recommendations, such as enabling Bedrock prompt caching to save up to 90% on repeated prompts.*
>
> *Similarly, under **Data Transfer & Networking**, CostLens highlights NAT Gateway processing fees — one of the most common hidden cost drivers in AWS — and recommends free VPC Gateway Endpoints to eliminate unnecessary egress charges."*

---

### Phase 5: Invoice Reconciliation, Regions & Multi-Account Tags (2 Mins)
* **Goal**: Show audit compliance and corporate financial governance.
* **Screen to Show**: **Invoice Reconciliation** (`#invoice`), **Regional Map** (`#regions`), and **Cost Allocation Tags** (`#tags`)

#### What to Do
1. Click **Invoice Reconciliation** (`#invoice`).
2. Show how the subtotal, taxes, credits, and total invoice match the official AWS monthly billing statement line-by-line.
3. Switch months using the **Month Selector** in the navbar to show historical August, September, and October invoices.
4. Briefly click **Regions** to show geographic spend (e.g., 56% Mumbai, 26% N. Virginia, 9% Stockholm).
5. Briefly click **Tags** to demonstrate project-level and department-level cost tracking.

#### Talking Script
> *"For Finance and Procurement, we have **Invoice Reconciliation**. This screen mirrors the official AWS monthly tax invoice line-by-line, including subtotal usage, applicable taxes, and credits.*
>
> *Using the month selector at the top, we can inspect closed historical billing periods like August or September, or view the live month-to-date invoice for October.*
>
> *We also provide a **Regional Map** showing geographic spend concentration, and **Cost Allocation Tags** so leadership can attribute costs directly to business units, environments (Prod vs Staging), or client projects."*

---

### Phase 6: Natural Language Search, Anomalies & Security Guard (1 Min)
* **Goal**: Reassure stakeholders of safety, compliance, and effortless data discovery.
* **Screen to Show**: **Ask a Question** (`#ask`) & **Settings / Security Audit** (`#settings`)

#### What to Do
1. Click **Ask a Question** (or the floating button in bottom-right).
2. Type: *"Why did my bill increase?"* or click one of the suggested query chips.
3. Show the instant synthesized answer identifying the exact cost driver (e.g., EC2 Compute +$311.21).
4. Click **Settings / Security Audit** and point to the **100% Read-Only Safety Enforced** badge.
5. Demonstrate the **Export** feature: click **Export Report** to download an executive CSV or JSON report.

#### Talking Script
> *"Finally, anyone on the team — even non-technical stakeholders — can click **Ask a Question** and ask in plain English: 'Why did my bill increase?' CostLens analyzes the month-over-month delta and instantly highlights the primary drivers.*
>
> *And most importantly, under **Security & Audit**: CostLens is built on an unbreakable **100% Read-Only Architecture**. It contains an AST-verified security guard that prevents any mutating commands like stopping instances or deleting buckets from ever executing.*
>
> *Everything is self-hosted, air-gapped within our environment, fast, and completely private."*

---

## 4. Audience-Specific Presentation Angles

Customize your emphasis depending on who is in the room:

### For CFO / Financial Controllers
* **Key Themes**: Predictability, waste reduction, invoice auditability, zero SaaS licensing cost.
* **Focus Screens**: Executive Overview, Invoice Reconciliation, Export to CSV/JSON, Tag Allocation.
* **Key Talking Point**: *"CostLens gives us immediate clarity on our cloud burn rate and invoice reconciliation without paying thousands of dollars a month for third-party FinOps SaaS."*

### For CTO / VP of Engineering
* **Key Themes**: Architectural efficiency, AI model token tracking, idle resource detection, team accountability.
* **Focus Screens**: Inventory (per-instance & per-bucket billing), AI & ML (Bedrock token splits), Service Drill-Down.
* **Key Talking Point**: *"Engineering leads can see exactly which EC2 servers and S3 datasets drive our monthly burn, allowing us to rightsize resources before month-end."*

### For DevOps / Cloud Engineers / SREs
* **Key Themes**: Zero risk to production, offline caching, fast troubleshooting, automated tagging visibility.
* **Focus Screens**: Cloud Inventory, User Activity Logs (CloudTrail), Security Audit, Service Detail.
* **Key Talking Point**: *"CostLens requires zero write permissions, will never accidentally modify or terminate infrastructure, and caches billing telemetry locally for lightning-fast lookups without incurring AWS Cost Explorer API charges."*

---

## 5. Anticipated Q&A & Objection Handling

### Q1: "Can CostLens accidentally stop, restart, or delete any of our AWS resources?"
> **Answer**: **Absolutely not — it is mathematically and architecturally impossible.**  
> CostLens enforces a strict read-only security layer (`awsGuard.ts`) that allowlists only read operations (`Get*`, `Describe*`, `List*`, `Lookup*`). Any mutating command (`Stop*`, `Terminate*`, `Delete*`, `Create*`, `Modify*`) is blocked and rejected before reaching the network. This is verified by automated continuous integration unit tests.

### Q2: "How does CostLens compute per-S3 bucket costs when AWS Cost Explorer only provides total S3 spend?"
> **Answer**: CostLens employs an intelligent hybrid attribution engine. It reconciles AWS Cost Allocation Tags, S3 usage types (`StandardStorage`, `DeepArchiveStorage`, `DataTransfer-Out`, `Requests-Tier1/Tier2`), and workload profiling to calculate accurate per-bucket billing that reconciles 100% to the official monthly S3 service total.

### Q3: "Does any of our billing or infrastructure data get sent to external servers?"
> **Answer**: **No.** CostLens is 100% self-hosted. Telemetry flows exclusively between your server and the official AWS API endpoints. There are no external tracking scripts, third-party analytics, or remote database dependencies.

### Q4: "Does viewing CostLens generate high AWS Cost Explorer API bills?"
> **Answer**: **No.** CostLens features an intelligent, non-destructive file cache. Once billing data is fetched, it is cached locally. Repeated views, searches, and navigation cost $0.00 and load instantly.

### Q5: "What platforms can CostLens run on?"
> **Answer**: Any standard environment:
> - **Windows**: Double-click `start.bat` or run `powershell -ExecutionPolicy Bypass -File .\start.ps1`.
> - **Linux / macOS**: Run `chmod +x start.sh && ./start.sh`.
> - **Docker**: Run `docker-compose up -d`.
> - **Cloud / Kubernetes**: Deploy the pre-built container on ECS, EKS, or any internal VM.

---

## 6. Quick Reference Cheat Sheet (Sample Account Metrics)

Keep these representative numbers handy during your presentation so you can answer questions instantly without searching:

| Metric | Oct 2026 (MTD) | Sep 2026 | Aug 2026 |
|---|---|---|---|
| **Total Account Spend** | **$363.95** (as of mid-month) | **$1,290.75** | **$1,021.16** |
| **Top Cost Driver** | EC2 Compute ($199.03 / 54.7%) | EC2 Compute ($723.48 / 56.1%) | EC2 Compute ($470.99 / 46.1%) |
| **Storage (S3) Total** | **$57.84** (49 buckets) | **$160.73** | **$246.40** |
| **EC2 Other (Disks & IPs)** | **$40.33** | **$92.09** | **$86.43** |
| **VPC / Networking** | **$25.97** | **$73.12** | **$68.28** |
| **Taxes & Non-Regional** | **$16.61** | **$61.86** | **$59.08** |
| **Top Active Regions** | ap-south-1 (56.3%), us-east-1 (26.0%), eu-north-1 (9.5%), us-west-2 (2.8%) |
| **EC2 Fleet Count** | 15 Total Instances (10 Running, 5 Stopped) |
| **S3 Bucket Count** | 49 Buckets across Mumbai, N. Virginia, and Oregon |
| **Highest Cost EC2 Server** | `DU1_nbim-prod-main-server` (`t3.large`) ~ $23.65 compute + $3.50 EBS MTD |
| **Highest Cost S3 Bucket** | `nbim-file-server` & `scantobim-training-data` (~$8.00–$10.00/mo MTD) |

---

*End of Presentation Guide & SOP. Created for AWS CostLens.*
