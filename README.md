# EHSQ Signal Engine

A production-ready Business Insights and Opportunity Intelligence platform focused on identifying government and enterprise buying signals related to EHSQ / ESHQ (Environmental, Health, Safety, and Quality) solutions.

## Overview
**EHSQ Signal Engine** helps revenue teams identify public and private sector accounts showing signs of buying intent for safety-critical, compliance-driven, and environmental software. The platform:
1. **Monitors Buying Signals**: Automatically polls and scrapes government RFPs, regulatory enforcement actions (e.g. EPA/OSHA fines), hiring signals, and public budget justifications.
2. **AI Triage & Relevance Scoring**: Employs a multi-tier AI evaluation pipeline (using Context.dev scraping APIs and LLM/rule-based scoring) to filter out noise and prioritize high-value leads.
3. **Sales-Ready Insights**: Generates custom sales conversation outreach angles detailing the triggered EHSQ issue, how it maps to Cority-like solutions, and what sales representatives should say.
4. **CRM Synchronizer**: Pushes verified buying signals directly into Salesforce (mocked as tasks or custom objects) with clear source tracking.

---

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm (v10 or higher)

### Setup & Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the Next.js development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Running Verification Tests

To verify backend schemas, pipeline execution, CRM sync formatting, and branded digest outputs, run the standalone verification script:
```bash
node scripts/verify-engine.js
```
The script will run in standalone offline mode (reading/writing to `.db_store/db.json`) if the server is offline, or test the live endpoints directly if the server is running.

---

## Technical Architecture

### 1. Dual-Database Resiliency
The platform supports a production-ready **Supabase Cloud PostgreSQL** setup and transparently falls back to a **local JSON database (`.db_store/db.json`)** if Supabase credentials are not set. This guarantees instant, offline-first runnability.

### 2. Multi-Tier AI Triage Pipeline
- **Tier 1 (Fetch)**: Polls registered urls/feeds (Free).
- **Tier 2 (Triage)**: Invokes fast, low-cost triage models (Haiku) on changed files.
- **Tier 3 (Verification)**: Runs advanced models (Sonnet/Opus) on items above the threshold to verify intent.

### 3. Context.dev API Scraping
Calls Context.dev scrape API (`https://api.context.dev/v1/scrape`) to clean HTML pages into token-efficient Markdown context for LLM processing.
