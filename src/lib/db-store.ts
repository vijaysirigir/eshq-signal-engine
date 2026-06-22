import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Define TS Interfaces
export interface Account {
  id: string;
  name: string;
  group_code: string;
  is_child: boolean;
  is_customer: boolean;
  segments: string[];
  owner_email: string;
  crm_connected: boolean;
}

export interface SignalColumn {
  key_name: string;
  label: string;
  has_prompt: boolean;
  is_active: boolean;
  prompt: string;
  source_type: 'api' | 'websearch' | 'crm' | 'paid';
  context_depth: boolean;
  threshold: number;
  budget: number;
  cadence: string;
  segments: string[];
}

export interface AccountSource {
  account_id: string;
  column_key: string;
  status: 'configured' | 'auto' | 'missing' | 'na';
  source_label?: string;
}

export interface DetectedSignal {
  account_id: string;
  column_key: string;
  score: number;
  signal_date: string;
  summary: string;
  why_matters: string;
  source_name: string;
  excerpt: string;
}

export interface CrmSettings {
  account_id: string;
  crm_type: 'salesforce' | 'hubspot' | 'dynamics' | 'none';
  sync_direction: 'write' | 'read' | 'none';
  sync_field: string;
}

export interface KnowledgeBaseItem {
  id: string;
  title: string;
  source_type: 'website' | 'reviews' | 'community' | 'upload';
  description: string;
  excerpt: string;
  frequency_lbl: string;
  updated_at: string;
}

export interface CrmSyncLog {
  id: string;
  account_id: string;
  signal_id: string;
  synced_at: string;
  status: 'success' | 'failed';
  log_details: string;
}

// Local JSON File DB Config
const DB_DIR = path.join(process.cwd(), '.db_store');
const DB_FILE = path.join(DB_DIR, 'db.json');

// Supabase Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const isSupabaseConfigured = supabaseUrl && supabaseAnonKey;

const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;

// Initial Seed Data Definitions
const seedAccounts: Account[] = [
  { id: 'acme-parent', name: 'Acme Industrial Group', group_code: 'MW', is_child: false, is_customer: true, segments: ['commercial', 'enterprise'], owner_email: 'sarah.chen@yourcompany.io', crm_connected: true },
  { id: 'acme-ops', name: 'Acme Industrial — Operations Div.', group_code: 'MW', is_child: true, is_customer: false, segments: ['commercial'], owner_email: 'sarah.chen@yourcompany.io', crm_connected: true },
  { id: 'meridian', name: 'Meridian Environmental Services', group_code: 'SW', is_child: false, is_customer: false, segments: ['commercial', 'enterprise'], owner_email: 'james.wu@yourcompany.io', crm_connected: true },
  { id: 'westbrook', name: 'Westbrook Health System', group_code: 'SE', is_child: false, is_customer: false, segments: ['healthcare', 'enterprise'], owner_email: 'priya.nair@yourcompany.io', crm_connected: true },
  { id: 'federal-sa', name: 'Federal Safety Agency', group_code: 'FED', is_child: false, is_customer: false, segments: ['gov'], owner_email: 'james.wu@yourcompany.io', crm_connected: false },
  { id: 'apex-ind', name: 'Apex Industrial — Quality Div.', group_code: 'MW', is_child: false, is_customer: false, segments: ['commercial'], owner_email: 'sarah.chen@yourcompany.io', crm_connected: true },
];

const seedColumns: SignalColumn[] = [
  {
    key_name: 'rfp',
    label: 'RFP / Tender',
    has_prompt: true,
    is_active: true,
    prompt: 'Score 1-10: does this notice describe a software RFP/RFI for EHSQ/ESHQ solutions (safety, compliance, quality, audit, incident tracking)? Cite notice ID and issuing organization.',
    source_type: 'api',
    context_depth: false,
    threshold: 7,
    budget: 10,
    cadence: 'Daily',
    segments: ['commercial', 'enterprise', 'gov', 'healthcare']
  },
  {
    key_name: 'enforcement',
    label: 'Enforcement / Fines',
    has_prompt: true,
    is_active: true,
    prompt: 'Identify enforcement actions against the account\'s own facilities. Score severity 1-10 and note if it represents an EHSQ risk (OSHA, EPA citations) that safety software could prevent.',
    source_type: 'api',
    context_depth: true,
    threshold: 6,
    budget: 10,
    cadence: 'Weekly',
    segments: ['commercial', 'enterprise', 'gov', 'healthcare']
  },
  {
    key_name: 'budget',
    label: 'Budget signal',
    has_prompt: true,
    is_active: true,
    prompt: 'Extract any budget line item referencing compliance, safety, environmental, quality, or technology modernization. Score 1-10 on dollar amount and EHSQ systems relevance.',
    source_type: 'websearch',
    context_depth: true,
    threshold: 7,
    budget: 8,
    cadence: 'Monthly',
    segments: ['commercial', 'enterprise', 'gov', 'healthcare']
  },
  {
    key_name: 'hiring',
    label: 'Hiring',
    has_prompt: true,
    is_active: true,
    prompt: 'Score 1-10: does this job posting indicate investment in EHSQ (e.g. Director of Safety, Environmental Compliance Lead, EHSQ Administrator)? Note stated tech initiatives.',
    source_type: 'api',
    context_depth: false,
    threshold: 6,
    budget: 6,
    cadence: 'Every 3 days',
    segments: ['commercial', 'enterprise', 'gov', 'healthcare']
  },
  {
    key_name: 'relationship',
    label: 'Relationship',
    has_prompt: false,
    is_active: true,
    prompt: '(Deterministic) Match account against CRM database. No LLM query.',
    source_type: 'crm',
    context_depth: false,
    threshold: 0,
    budget: 2,
    cadence: 'Monthly',
    segments: ['commercial', 'enterprise', 'gov', 'healthcare']
  },
  {
    key_name: 'accreditation',
    label: 'Accreditation cycle',
    has_prompt: true,
    is_active: true,
    prompt: 'Score 1-10: does this indicate an upcoming accreditation survey (like ISO 45001, Joint Commission) creating urgency for audit-ready documentation systems?',
    source_type: 'websearch',
    context_depth: true,
    threshold: 6,
    budget: 5,
    cadence: 'Monthly',
    segments: ['healthcare', 'commercial', 'enterprise']
  }
];

const seedSources: AccountSource[] = [
  { account_id: 'acme-parent', column_key: 'rfp', status: 'na' },
  { account_id: 'acme-parent', column_key: 'enforcement', status: 'na' },
  { account_id: 'acme-parent', column_key: 'budget', status: 'na' },
  { account_id: 'acme-parent', column_key: 'hiring', status: 'na' },
  { account_id: 'acme-parent', column_key: 'accreditation', status: 'na' },
  
  { account_id: 'acme-ops', column_key: 'rfp', status: 'auto', source_label: 'Auto: state procurement portal' },
  { account_id: 'acme-ops', column_key: 'enforcement', status: 'configured', source_label: 'Regulatory enforcement feed — Acme facilities' },
  { account_id: 'acme-ops', column_key: 'budget', status: 'configured', source_label: 'Public financial disclosures' },
  { account_id: 'acme-ops', column_key: 'hiring', status: 'configured', source_label: 'LinkedIn Jobs — Acme Ops' },
  { account_id: 'acme-ops', column_key: 'accreditation', status: 'na' },

  { account_id: 'meridian', column_key: 'rfp', status: 'configured', source_label: 'State procurement portal — Meridian' },
  { account_id: 'meridian', column_key: 'enforcement', status: 'configured', source_label: 'EPA ECHO — Meridian facilities' },
  { account_id: 'meridian', column_key: 'budget', status: 'auto', source_label: 'Auto: company financial filings' },
  { account_id: 'meridian', column_key: 'hiring', status: 'missing' },
  { account_id: 'meridian', column_key: 'accreditation', status: 'na' },

  { account_id: 'westbrook', column_key: 'rfp', status: 'configured', source_label: 'Regional hospital procurement board' },
  { account_id: 'westbrook', column_key: 'enforcement', status: 'configured', source_label: 'State health dept enforcement log' },
  { account_id: 'westbrook', column_key: 'budget', status: 'auto', source_label: 'Auto: hospital financial disclosures' },
  { account_id: 'westbrook', column_key: 'hiring', status: 'missing' },
  { account_id: 'westbrook', column_key: 'accreditation', status: 'missing' },

  { account_id: 'federal-sa', column_key: 'rfp', status: 'configured', source_label: 'SAM.gov Opportunities API' },
  { account_id: 'federal-sa', column_key: 'enforcement', status: 'na' },
  { account_id: 'federal-sa', column_key: 'budget', status: 'configured', source_label: 'Federal budget justification docs' },
  { account_id: 'federal-sa', column_key: 'hiring', status: 'configured', source_label: 'USAJobs.gov API' },
  { account_id: 'federal-sa', column_key: 'accreditation', status: 'na' },

  { account_id: 'apex-ind', column_key: 'rfp', status: 'auto', source_label: 'Auto: state procurement portal' },
  { account_id: 'apex-ind', column_key: 'enforcement', status: 'missing' },
  { account_id: 'apex-ind', column_key: 'budget', status: 'missing' },
  { account_id: 'apex-ind', column_key: 'hiring', status: 'auto', source_label: 'Auto: Indeed / LinkedIn Jobs' },
  { account_id: 'apex-ind', column_key: 'accreditation', status: 'na' }
];

const seedCrmSettings: CrmSettings[] = [
  { account_id: 'acme-parent', crm_type: 'salesforce', sync_direction: 'write', sync_field: 'Signal_Alert__c' },
  { account_id: 'acme-ops', crm_type: 'salesforce', sync_direction: 'write', sync_field: 'Signal_Alert__c' },
  { account_id: 'meridian', crm_type: 'salesforce', sync_direction: 'write', sync_field: 'Signal_Alert__c' },
  { account_id: 'westbrook', crm_type: 'salesforce', sync_direction: 'write', sync_field: 'Signal_Alert__c' },
  { account_id: 'federal-sa', crm_type: 'none', sync_direction: 'none', sync_field: '' },
  { account_id: 'apex-ind', crm_type: 'salesforce', sync_direction: 'write', sync_field: 'Signal_Alert__c' },
];

const seedSignals: DetectedSignal[] = [
  {
    account_id: 'acme-ops',
    column_key: 'budget',
    score: 8,
    signal_date: '1w ago',
    summary: 'Acme Industrial Group allocates $3.8M for modernization of operational compliance tracking and reporting infrastructure, replacing legacy case management tools.',
    why_matters: 'Modernizing operational compliance and incident tracking is a direct EHSQ software requirement. Sales should target Acme Ops division before formal procurement starts.',
    source_name: 'Public financial disclosures',
    excerpt: '"...allocates $3.8M for modernization of operational compliance tracking and reporting infrastructure, replacing legacy case management tools..."'
  },
  {
    account_id: 'acme-ops',
    column_key: 'hiring',
    score: 8,
    signal_date: '4d ago',
    summary: 'Hiring: Compliance Systems Manager to lead modernization of safety and compliance systems.',
    why_matters: 'Pairs with the approved $3.8M compliance budget modernization initiative. Reach out directly to this new systems manager to guide their vendor evaluation.',
    source_name: 'LinkedIn Jobs',
    excerpt: '"...will lead modernization of the division\'s compliance tracking systems, partnering with IT on vendor selection..."'
  },
  {
    account_id: 'meridian',
    column_key: 'enforcement',
    score: 5,
    signal_date: '2w ago',
    summary: 'Meridian cited $2,100 for late incident-report filings.',
    why_matters: 'Low dollar amount administrative penalty. Indicates potential workflow gaps in filing, but not yet an urgent enterprise software evaluation trigger.',
    source_name: 'Regulatory enforcement feed',
    excerpt: '"...assessed a $2,100 administrative penalty for failure to file timely incident reports within the required window..."'
  },
  {
    account_id: 'westbrook',
    column_key: 'rfp',
    score: 9,
    signal_date: '4d ago',
    summary: 'RFP: Quality Management System (QMS) supporting documentation, audit trail, and corrective actions (CAPA) tracking across regional health facilities.',
    why_matters: 'Strong direct fit for Quality management solution. Sales should immediately coordinate response matching Westbrook\'s explicit bid timeline.',
    source_name: 'Regional hospital procurement board',
    excerpt: '"Westbrook Health seeks a quality management system supporting documentation, audit trail, and corrective action tracking across all regional facilities..."'
  },
  {
    account_id: 'westbrook',
    column_key: 'enforcement',
    score: 9,
    signal_date: '6d ago',
    summary: 'State health audit issues $26,000 compliance penalty for inadequate records management and audit trail.',
    why_matters: 'This fine occurred a few days before Westbrook issued the QMS RFP. The combination of a recent audit fine and an active RFP indicates extreme urgency and budget approval.',
    source_name: 'State health dept enforcement log',
    excerpt: '"...enforcement action cites inadequate records management and audit trail at a regional health facility..."'
  },
  {
    account_id: 'federal-sa',
    column_key: 'rfp',
    score: 9,
    signal_date: '2d ago',
    summary: 'Federal Safety Agency posted a sources-sought notice for cloud-based incident and injury tracking software across regional offices.',
    why_matters: 'This maps strongly to EHSQ use cases such as incident management, OSHA reporting, workflow automation, and audit-ready documentation. Sales should respond before the RFI deadline and use the outreach angle: modernizing injury tracking and compliance reporting before formal RFP requirements are locked.',
    source_name: 'SAM.gov',
    excerpt: '"Agency seeks information from vendors offering cloud-based incident tracking systems capable of log automation across regional offices..."'
  },
  {
    account_id: 'federal-sa',
    column_key: 'hiring',
    score: 7,
    signal_date: '1w ago',
    summary: 'Hiring: Safety & Compliance Technology Specialist to support regional compliance system modernization.',
    why_matters: 'Perfect operational pairing with the active incident tracking software sources-sought notice. The candidate will help run the new software.',
    source_name: 'USAJobs.gov',
    excerpt: '"...supporting a new compliance technology modernization initiative across regional field offices..."'
  },
  {
    account_id: 'apex-ind',
    column_key: 'accreditation',
    score: 7,
    signal_date: '5d ago',
    summary: 'ISO 45001 safety recertification audit window opening in Q3.',
    why_matters: 'Recertification prep is the prime window to sell audit management and corrective action tracking (CAPA) software, as manual documentation becomes a major risk.',
    source_name: 'ISO body public schedule',
    excerpt: '"...the triennial recertification audit window for this facility opens in the third quarter, requiring updated documentation and corrective action readiness..."'
  }
];

const seedKnowledgeBase: KnowledgeBaseItem[] = [
  {
    id: 'kb-site',
    title: 'Website',
    source_type: 'website',
    description: 'ehsq-signal-engine.io — 42 pages crawled',
    excerpt: '"EHSQ Signal Engine unifies signal detection, account intelligence, and pipeline triggers for revenue teams targeting safety-critical, regulated, and compliance-driven buyers across commercial, enterprise, and public-sector verticals..."',
    frequency_lbl: 'Re-crawled weekly',
    updated_at: '3d ago'
  },
  {
    id: 'kb-reviews',
    title: 'Reviews',
    source_type: 'reviews',
    description: 'Pasted excerpts — G2 / Capterra',
    excerpt: '"Buyers consistently cite ease of standardizing safety workflows across sites and departments, and audit-readiness for regulatory inspections, as top reasons for adoption..."',
    frequency_lbl: '18 excerpts',
    updated_at: '1w ago'
  },
  {
    id: 'kb-comm',
    title: 'Community',
    source_type: 'community',
    description: 'Pasted excerpts — practitioner forums and LinkedIn groups',
    excerpt: '"Teams across regulated industries discuss disconnected, spreadsheet-based workflows ahead of audits and renewal cycles, frequently citing budget approvals as the trigger to evaluate alternatives..."',
    frequency_lbl: '12 excerpts',
    updated_at: '1w ago'
  }
];

// Helper to Load/Save JSON DB
interface LocalDatabase {
  accounts: Account[];
  columns: SignalColumn[];
  sources: AccountSource[];
  crmSettings: CrmSettings[];
  signals: DetectedSignal[];
  knowledgeBase: KnowledgeBaseItem[];
  adminSettings: Record<string, any>;
  crmSyncLogs: CrmSyncLog[];
}

function getLocalDB(): LocalDatabase {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initialDB: LocalDatabase = {
      accounts: seedAccounts,
      columns: seedColumns,
      sources: seedSources,
      crmSettings: seedCrmSettings,
      signals: seedSignals,
      knowledgeBase: seedKnowledgeBase,
      adminSettings: {
        modelSpeed: 'standard',
        resolverEnabled: true,
        outputCrmEnabled: true,
        outputOwnerEnabled: true,
        outputRevopsEnabled: true,
        revopsEmail: 'revops@ehsqsignalengine.com',
        spendThisWeek: 28.40,
        syncsToday: 3,
        autoResolvedThisWeek: 9,
        pendingReviewThisWeek: 3
      },
      crmSyncLogs: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDB, null, 2), 'utf-8');
    return initialDB;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch (e) {
    console.error('Failed to read db.json, returning empty database', e);
    return {
      accounts: [],
      columns: [],
      sources: [],
      crmSettings: [],
      signals: [],
      knowledgeBase: [],
      adminSettings: {},
      crmSyncLogs: []
    };
  }
}

function saveLocalDB(db: LocalDatabase) {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

// Database Interfaces Exposed
export const dbStore = {
  // Accounts
  async getAccounts(): Promise<Account[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('accounts').select('*');
        if (!error && data) return data;
        console.warn('[Supabase] Failed to fetch accounts, falling back to local DB:', error?.message || error);
      } catch (e: any) {
        console.warn('[Supabase] Exception fetching accounts, falling back to local DB:', e.message);
      }
    }
    return getLocalDB().accounts;
  },

  async saveAccount(account: Account): Promise<void> {
    if (supabase) {
      try {
        const { error } = await supabase.from('accounts').upsert(account);
        if (!error) return;
        console.warn('[Supabase] Failed to save account, falling back to local DB:', error.message);
      } catch (e: any) {
        console.warn('[Supabase] Exception saving account, falling back to local DB:', e.message);
      }
    }
    const db = getLocalDB();
    const idx = db.accounts.findIndex(a => a.id === account.id);
    if (idx >= 0) {
      db.accounts[idx] = account;
    } else {
      db.accounts.push(account);
    }
    saveLocalDB(db);
  },

  async deleteAccount(id: string): Promise<void> {
    if (supabase) {
      try {
        const { error } = await supabase.from('accounts').delete().eq('id', id);
        if (!error) return;
        console.warn('[Supabase] Failed to delete account, falling back to local DB:', error.message);
      } catch (e: any) {
        console.warn('[Supabase] Exception deleting account, falling back to local DB:', e.message);
      }
    }
    const db = getLocalDB();
    db.accounts = db.accounts.filter(a => a.id !== id);
    db.sources = db.sources.filter(s => s.account_id !== id);
    db.signals = db.signals.filter(s => s.account_id !== id);
    db.crmSettings = db.crmSettings.filter(c => c.account_id !== id);
    saveLocalDB(db);
  },

  async bulkDeleteAccounts(ids: string[]): Promise<void> {
    if (supabase) {
      try {
        const { error } = await supabase.from('accounts').delete().in('id', ids);
        if (!error) return;
        console.warn('[Supabase] Failed to bulk delete accounts, falling back to local DB:', error.message);
      } catch (e: any) {
        console.warn('[Supabase] Exception bulk deleting accounts, falling back to local DB:', e.message);
      }
    }
    const db = getLocalDB();
    db.accounts = db.accounts.filter(a => !ids.includes(a.id));
    db.sources = db.sources.filter(s => !ids.includes(s.account_id));
    db.signals = db.signals.filter(s => !ids.includes(s.account_id));
    db.crmSettings = db.crmSettings.filter(c => !ids.includes(c.account_id));
    saveLocalDB(db);
  },

  // Signal Columns
  async getColumns(): Promise<SignalColumn[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('signal_columns').select('*');
        if (!error && data) return data;
        console.warn('[Supabase] Failed to fetch columns, falling back to local DB:', error?.message || error);
      } catch (e: any) {
        console.warn('[Supabase] Exception fetching columns, falling back to local DB:', e.message);
      }
    }
    return getLocalDB().columns;
  },

  async saveColumn(col: SignalColumn): Promise<void> {
    if (supabase) {
      try {
        const { error } = await supabase.from('signal_columns').upsert(col);
        if (!error) return;
        console.warn('[Supabase] Failed to save column, falling back to local DB:', error.message);
      } catch (e: any) {
        console.warn('[Supabase] Exception saving column, falling back to local DB:', e.message);
      }
    }
    const db = getLocalDB();
    const idx = db.columns.findIndex(c => c.key_name === col.key_name);
    if (idx >= 0) {
      db.columns[idx] = col;
    } else {
      db.columns.push(col);
    }
    saveLocalDB(db);
  },

  // Account Sources
  async getSources(accountId?: string): Promise<AccountSource[]> {
    if (supabase) {
      try {
        const query = supabase.from('account_sources').select('*');
        if (accountId) query.eq('account_id', accountId);
        const { data, error } = await query;
        if (!error && data) return data;
        console.warn('[Supabase] Failed to fetch sources, falling back to local DB:', error?.message || error);
      } catch (e: any) {
        console.warn('[Supabase] Exception fetching sources, falling back to local DB:', e.message);
      }
    }
    const sources = getLocalDB().sources;
    if (accountId) return sources.filter(s => s.account_id === accountId);
    return sources;
  },

  async saveSource(src: AccountSource): Promise<void> {
    if (supabase) {
      try {
        const { error } = await supabase.from('account_sources').upsert(src);
        if (!error) return;
        console.warn('[Supabase] Failed to save source, falling back to local DB:', error.message);
      } catch (e: any) {
        console.warn('[Supabase] Exception saving source, falling back to local DB:', e.message);
      }
    }
    const db = getLocalDB();
    const idx = db.sources.findIndex(s => s.account_id === src.account_id && s.column_key === src.column_key);
    if (idx >= 0) {
      db.sources[idx] = src;
    } else {
      db.sources.push(src);
    }
    saveLocalDB(db);
  },

  // Detected Signals
  async getSignals(accountId?: string): Promise<DetectedSignal[]> {
    if (supabase) {
      try {
        const query = supabase.from('detected_signals').select('*');
        if (accountId) query.eq('account_id', accountId);
        const { data, error } = await query;
        if (!error && data) return data;
        console.warn('[Supabase] Failed to fetch signals, falling back to local DB:', error?.message || error);
      } catch (e: any) {
        console.warn('[Supabase] Exception fetching signals, falling back to local DB:', e.message);
      }
    }
    const signals = getLocalDB().signals;
    if (accountId) return signals.filter(s => s.account_id === accountId);
    return signals;
  },

  async saveSignal(sig: DetectedSignal): Promise<void> {
    if (supabase) {
      try {
        const { error } = await supabase.from('detected_signals').upsert(sig);
        if (!error) return;
        console.warn('[Supabase] Failed to save signal, falling back to local DB:', error.message);
      } catch (e: any) {
        console.warn('[Supabase] Exception saving signal, falling back to local DB:', e.message);
      }
    }
    const db = getLocalDB();
    const idx = db.signals.findIndex(s => s.account_id === sig.account_id && s.column_key === sig.column_key);
    if (idx >= 0) {
      db.signals[idx] = sig;
    } else {
      db.signals.push(sig);
    }
    saveLocalDB(db);
  },

  // CRM settings per account
  async getCrmSettings(accountId?: string): Promise<CrmSettings[]> {
    if (supabase) {
      try {
        const query = supabase.from('account_crm_settings').select('*');
        if (accountId) query.eq('account_id', accountId);
        const { data, error } = await query;
        if (!error && data) return data;
        console.warn('[Supabase] Failed to fetch CRM settings, falling back to local DB:', error?.message || error);
      } catch (e: any) {
        console.warn('[Supabase] Exception fetching CRM settings, falling back to local DB:', e.message);
      }
    }
    const settings = getLocalDB().crmSettings;
    if (accountId) return settings.filter(s => s.account_id === accountId);
    return settings;
  },

  async saveCrmSettings(settings: CrmSettings): Promise<void> {
    if (supabase) {
      try {
        const { error } = await supabase.from('account_crm_settings').upsert(settings);
        if (!error) return;
        console.warn('[Supabase] Failed to save CRM settings, falling back to local DB:', error.message);
      } catch (e: any) {
        console.warn('[Supabase] Exception saving CRM settings, falling back to local DB:', e.message);
      }
    }
    const db = getLocalDB();
    const idx = db.crmSettings.findIndex(c => c.account_id === settings.account_id);
    if (idx >= 0) {
      db.crmSettings[idx] = settings;
    } else {
      db.crmSettings.push(settings);
    }
    saveLocalDB(db);
  },

  // Knowledge Base
  async getKnowledgeBase(): Promise<KnowledgeBaseItem[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('knowledge_base').select('*');
        if (!error && data) return data;
        console.warn('[Supabase] Failed to fetch knowledge base, falling back to local DB:', error?.message || error);
      } catch (e: any) {
        console.warn('[Supabase] Exception fetching knowledge base, falling back to local DB:', e.message);
      }
    }
    return getLocalDB().knowledgeBase;
  },

  async saveKnowledgeBaseItem(item: KnowledgeBaseItem): Promise<void> {
    if (supabase) {
      try {
        const { error } = await supabase.from('knowledge_base').upsert(item);
        if (!error) return;
        console.warn('[Supabase] Failed to save knowledge base item, falling back to local DB:', error.message);
      } catch (e: any) {
        console.warn('[Supabase] Exception saving knowledge base item, falling back to local DB:', e.message);
      }
    }
    const db = getLocalDB();
    const idx = db.knowledgeBase.findIndex(kb => kb.id === item.id);
    if (idx >= 0) {
      db.knowledgeBase[idx] = item;
    } else {
      db.knowledgeBase.push(item);
    }
    saveLocalDB(db);
  },

  // Admin Settings
  async getAdminSettings(): Promise<Record<string, any>> {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('admin_settings').select('*');
        if (!error && data) {
          const result: Record<string, any> = {};
          data.forEach(item => {
            result[item.key] = item.value;
          });
          return result;
        }
        console.warn('[Supabase] Failed to fetch admin settings, falling back to local DB:', error?.message || error);
      } catch (e: any) {
        console.warn('[Supabase] Exception fetching admin settings, falling back to local DB:', e.message);
      }
    }
    return getLocalDB().adminSettings;
  },

  async saveAdminSetting(key: string, value: any): Promise<void> {
    if (supabase) {
      try {
        const { error } = await supabase.from('admin_settings').upsert({ key, value });
        if (!error) return;
        console.warn('[Supabase] Failed to save admin setting, falling back to local DB:', error.message);
      } catch (e: any) {
        console.warn('[Supabase] Exception saving admin setting, falling back to local DB:', e.message);
      }
    }
    const db = getLocalDB();
    db.adminSettings[key] = value;
    saveLocalDB(db);
  },

  // CRM Sync Logs
  async getCrmSyncLogs(): Promise<CrmSyncLog[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('salesforce_sync_logs').select('*');
        if (!error && data) return data;
        console.warn('[Supabase] Failed to fetch CRM sync logs, falling back to local DB:', error?.message || error);
      } catch (e: any) {
        console.warn('[Supabase] Exception fetching CRM sync logs, falling back to local DB:', e.message);
      }
    }
    return getLocalDB().crmSyncLogs;
  },

  async saveCrmSyncLog(log: CrmSyncLog): Promise<void> {
    if (supabase) {
      try {
        const { error } = await supabase.from('salesforce_sync_logs').insert(log);
        if (!error) return;
        console.warn('[Supabase] Failed to save CRM sync log, falling back to local DB:', error.message);
      } catch (e: any) {
        console.warn('[Supabase] Exception saving CRM sync log, falling back to local DB:', e.message);
      }
    }
    const db = getLocalDB();
    db.crmSyncLogs.push(log);
    saveLocalDB(db);
  }
};
