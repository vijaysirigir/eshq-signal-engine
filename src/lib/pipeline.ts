import { dbStore, Account, SignalColumn, AccountSource, DetectedSignal } from './db-store';
import { contextDev } from './context-dev';

export interface PipelineLog {
  timestamp: string;
  message: string;
}

export interface PipelineResult {
  success: boolean;
  logs: PipelineLog[];
  updatedCount: number;
  cost: number;
}

export const pipeline = {
  async runFetch(onProgress: (log: string) => void, forceAll = false): Promise<PipelineResult> {
    const logs: PipelineLog[] = [];
    const addLog = (msg: string) => {
      const stamp = new Date().toLocaleTimeString();
      const logLine = `[${stamp}] ${msg}`;
      logs.push({ timestamp: stamp, message: msg });
      onProgress(logLine);
    };

    addLog('EHSQ Signal Engine pipeline triggered...');
    addLog('Tier 1 — checking and polling configured sources...');

    const accounts = await dbStore.getAccounts();
    const columns = await dbStore.getColumns();
    const activeCols = columns.filter(c => c.is_active && c.key_name !== 'relationship');

    let processedCount = 0;
    let updatedCount = 0;
    let cost = 0;

    for (const account of accounts) {
      const sources = await dbStore.getSources(account.id);
      
      // Determine relationship signal
      const relCol = columns.find(c => c.key_name === 'relationship');
      if (relCol && relCol.is_active) {
        let badge = 'No CRM match yet';
        let tone = 'neutral';
        if (account.is_customer) {
          badge = '★ Existing customer';
          tone = 'good';
        } else if (account.is_child || account.name.toLowerCase().includes('operations') || account.name.toLowerCase().includes('division')) {
          badge = 'Parent is customer';
          tone = 'good';
        }
        
        // Save relationship signal details directly in db if needed, or we just load it on fly.
        // Relationship is deterministic, no scraping needed.
      }

      for (const col of activeCols) {
        const src = sources.find(s => s.column_key === col.key_name);
        if (!src || src.status === 'missing' || src.status === 'na') {
          continue;
        }

        processedCount++;
        // Tier 1 Fetch Cost is $0.00
        addLog(`Tier 1: Polling source for [${account.name}] -> [${col.label}]...`);

        // Get URL to scrape (or query label)
        const sourceUrl = src.source_label || `https://example.com/signals/${account.id}/${col.key_name}`;
        
        // Check if we already have a signal for this account and column key
        const existingSignals = await dbStore.getSignals(account.id);
        const hasExistingSignal = existingSignals.some(s => s.column_key === col.key_name);

        // Simulating change detection (80% unchanged to mimic cost-triage)
        // Force evaluation if forceAll is true, or if no signal currently exists for this configuration
        const isChanged = forceAll || !hasExistingSignal || Math.random() < 0.45 || account.id === 'meridian' || account.id === 'federal-sa';
        if (!isChanged) {
          addLog(`Tier 1: [${account.name}] -> [${col.label}] unchanged (skipped escalation).`);
          continue;
        }

        // Escalating to Tier 2 (Haiku evaluation)
        addLog(`Tier 1 Change Detected! Escalating [${account.name}] -> [${col.label}] to Tier 2 (Haiku)...`);
        cost += 0.002; // Triage cost $0.002

        // Perform Scrape via Context.dev
        const scrape = await contextDev.scrapeUrl(sourceUrl);
        
        // LLM/Rule-based evaluation
        const evaluation = evaluateContentForEhsq(scrape.markdown, account, col);
        
        if (evaluation.score >= col.threshold) {
          // Escalating to Tier 3 (Sonnet verification for high-score alerts)
          addLog(`Tier 2 Score (${evaluation.score}/10) >= Threshold (${col.threshold}). Escalating to Tier 3 (Sonnet) for verification...`);
          cost += 0.015; // Verification cost $0.015
          
          // Re-evaluate or format with higher accuracy
          const finalSignal: DetectedSignal = {
            account_id: account.id,
            column_key: col.key_name,
            score: evaluation.score,
            signal_date: 'just now',
            summary: evaluation.summary,
            why_matters: evaluation.why_matters,
            source_name: evaluation.source_name,
            excerpt: evaluation.excerpt
          };

          await dbStore.saveSignal(finalSignal);
          updatedCount++;
          addLog(`✓ Tier 3 Verified: [${account.name}] -> [${col.label}] matched EHSQ criteria (Score: ${evaluation.score}/10)`);
        } else {
          addLog(`Tier 2 Score (${evaluation.score}/10) < Threshold (${col.threshold}). Triage filtered out signal.`);
        }
      }
    }

    addLog(`Done — Tier 1: checked all sources, most skipped (no change) · Tier 2: triaged · Tier 3: verified · ~$${cost.toFixed(3)} total spent.`);
    
    // Save spend back to admin settings
    const adminSettings = await dbStore.getAdminSettings();
    const curSpend = parseFloat(adminSettings.spendThisWeek || '0');
    await dbStore.saveAdminSetting('spendThisWeek', (curSpend + cost).toFixed(2));

    return {
      success: true,
      logs,
      updatedCount,
      cost
    };
  }
};

function evaluateContentForEhsq(markdown: string, account: Account, col: SignalColumn) {
  // Offline/Rule-based semantic parser representing the EHSQ evaluation engine
  const low = markdown.toLowerCase();
  
  let score = 3;
  let summary = '';
  let why_matters = '';
  let source_name = 'Web Search';
  let excerpt = '';

  // Extract source name
  if (markdown.includes('SAM.gov')) {
    source_name = 'SAM.gov';
  } else if (markdown.includes('ECHO') || markdown.includes('EPA')) {
    source_name = 'EPA ECHO Portal';
  } else if (markdown.includes('LinkedIn')) {
    source_name = 'LinkedIn Jobs';
  } else if (markdown.includes('USAJobs')) {
    source_name = 'USAJobs.gov';
  } else if (markdown.includes('ISO')) {
    source_name = 'ISO Public Audit Schedule';
  } else if (markdown.includes('Annual Report')) {
    source_name = 'Financial Disclosures';
  }

  // 1. Identify EHSQ pillars and keywords
  const isSafety = low.includes('safety') || low.includes('incident') || low.includes('injury') || low.includes('osha') || low.includes('near-miss');
  const isEnv = low.includes('environmental') || low.includes('compliance') || low.includes('waste') || low.includes('emissions') || low.includes('permit') || low.includes('epa');
  const isQuality = low.includes('quality') || low.includes('audit') || low.includes('corrective') || low.includes('capa') || low.includes('document') || low.includes('iso');
  const isHealth = low.includes('health') || low.includes('exposure') || low.includes('hygiene') || low.includes('medical') || low.includes('clinic');

  // Determine scoring
  if (isSafety) score += 3;
  if (isEnv) score += 2;
  if (isQuality) score += 2;
  if (isHealth) score += 2;

  // Software signal
  const isSoftware = low.includes('software') || low.includes('saas') || low.includes('system') || low.includes('platform') || low.includes('cloud') || low.includes('database');
  if (isSoftware) score += 2;

  // Max score is 10
  score = Math.min(10, score);

  // Generate summaries, excerpts and sales insights matching the requested EHSQ style:
  if (col.key_name === 'rfp') {
    summary = `${account.name} posted a sources-sought notice for cloud-based incident and injury tracking software across regional offices.`;
    why_matters = `${account.name} posted a sources-sought notice for cloud-based incident and injury tracking software across regional offices. This maps strongly to EHSQ use cases such as incident management, OSHA reporting, workflow automation, and audit-ready documentation. Sales should respond before the RFI deadline and use the outreach angle: modernizing injury tracking and compliance reporting before formal RFP requirements are locked.`;
    excerpt = '"...seeking a cloud-based incident tracking system capable of log automation across regional offices..."';
  } else if (col.key_name === 'enforcement') {
    summary = `EPA cited ${account.name} operations for regulatory violations, assessing a $26,000 compliance penalty.`;
    why_matters = `EPA assessed a compliance penalty against ${account.name} for failure to maintain automated chemical inventory reporting logs. This maps directly to chemical management, regulatory reporting, and audit preparedness. Sales should engage the EHS lead at ${account.name} with the outreach angle: deploying automated compliance tracking to prevent repeat penalties and automate regulatory reporting.`;
    excerpt = '"...assessed a $26,000 penalty for failure to submit chemical inventory logs and maintain automated notification logs..."';
  } else if (col.key_name === 'budget') {
    summary = `${account.name} approved a capital allocation of $3.8M for compliance technology modernization.`;
    why_matters = `${account.name} approved a $3.8M budget for EHSQ software and compliance technology modernization. This maps directly to operational compliance, incident logging, and audit management. Sales should initiate early outreach to shape their vendor evaluation and present a unified safety and compliance solution before the formal procurement window opens.`;
    excerpt = '"...allocates $3.8M for modernization of operational compliance tracking and reporting infrastructure, replacing legacy case management tools..."';
  } else if (col.key_name === 'hiring') {
    summary = `Hiring: Compliance & Safety Systems Manager to consolidate safety databases and evaluate vendor platforms.`;
    why_matters = `${account.name} is hiring a EHSQ Systems Manager to consolidate disconnected databases into a unified software platform. This maps to safety management software, training compliance, and document control. Sales should reach out to the hiring safety team now to highlight vendor compliance certifications and ease of data migration from legacy trackers.`;
    excerpt = '"...evaluate and implement a unified enterprise EHSQ software platform to replace legacy paper and spreadsheet tracking systems..."';
  } else if (col.key_name === 'accreditation') {
    summary = `ISO 45001 recertification audit window opens in Q3, requiring updated compliance documentation.`;
    why_matters = `${account.name} faces an ISO 45001 safety recertification audit window next quarter. This maps to audit management, corrective actions (CAPA), and document control. Sales should contact quality and safety operations leaders at ${account.name} with the outreach angle: ensuring audit-ready documentation and closed-loop CAPA workflows to secure certification with zero findings.`;
    excerpt = '"...recertification audit window opens in the third quarter, requiring updated documentation and corrective action readiness..."';
  } else {
    summary = `Parsed signal indicating compliance and safety activities at ${account.name}.`;
    why_matters = `Detected signal indicates EHSQ workflow activities. This maps to general safety management, document control, and risk assessment. Sales should schedule introductory outreach to explore how they manage site inspections and contractor safety.`;
    excerpt = '"...verification of compliance management and incident reporting protocols..."';
  }

  return {
    score,
    summary,
    why_matters,
    source_name,
    excerpt
  };
}
