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
const seedAccounts: Account[] = [];

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

const seedSources: AccountSource[] = [];

const seedCrmSettings: CrmSettings[] = [];

const seedSignals: DetectedSignal[] = [];

const seedKnowledgeBase: KnowledgeBaseItem[] = [];

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
      const { data, error } = await supabase.from('accounts').select('*');
      if (!error && data) return data;
    }
    return getLocalDB().accounts;
  },

  async saveAccount(account: Account): Promise<void> {
    if (supabase) {
      await supabase.from('accounts').upsert(account);
      return;
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
      await supabase.from('accounts').delete().eq('id', id);
      return;
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
      await supabase.from('accounts').delete().in('id', ids);
      return;
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
      const { data, error } = await supabase.from('signal_columns').select('*');
      if (!error && data) return data;
    }
    return getLocalDB().columns;
  },

  async saveColumn(col: SignalColumn): Promise<void> {
    if (supabase) {
      await supabase.from('signal_columns').upsert(col);
      return;
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
      const query = supabase.from('account_sources').select('*');
      if (accountId) query.eq('account_id', accountId);
      const { data, error } = await query;
      if (!error && data) return data;
    }
    const sources = getLocalDB().sources;
    if (accountId) return sources.filter(s => s.account_id === accountId);
    return sources;
  },

  async saveSource(src: AccountSource): Promise<void> {
    if (supabase) {
      await supabase.from('account_sources').upsert(src);
      return;
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
      const query = supabase.from('detected_signals').select('*');
      if (accountId) query.eq('account_id', accountId);
      const { data, error } = await query;
      if (!error && data) return data;
    }
    const signals = getLocalDB().signals;
    if (accountId) return signals.filter(s => s.account_id === accountId);
    return signals;
  },

  async saveSignal(sig: DetectedSignal): Promise<void> {
    if (supabase) {
      await supabase.from('detected_signals').upsert(sig);
      return;
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
      const query = supabase.from('account_crm_settings').select('*');
      if (accountId) query.eq('account_id', accountId);
      const { data, error } = await query;
      if (!error && data) return data;
    }
    const settings = getLocalDB().crmSettings;
    if (accountId) return settings.filter(s => s.account_id === accountId);
    return settings;
  },

  async saveCrmSettings(settings: CrmSettings): Promise<void> {
    if (supabase) {
      await supabase.from('account_crm_settings').upsert(settings);
      return;
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
      const { data, error } = await supabase.from('knowledge_base').select('*');
      if (!error && data) return data;
    }
    return getLocalDB().knowledgeBase;
  },

  async saveKnowledgeBaseItem(item: KnowledgeBaseItem): Promise<void> {
    if (supabase) {
      await supabase.from('knowledge_base').upsert(item);
      return;
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
      const { data, error } = await supabase.from('admin_settings').select('*');
      if (!error && data) {
        const result: Record<string, any> = {};
        data.forEach(item => {
          result[item.key] = item.value;
        });
        return result;
      }
    }
    return getLocalDB().adminSettings;
  },

  async saveAdminSetting(key: string, value: any): Promise<void> {
    if (supabase) {
      await supabase.from('admin_settings').upsert({ key, value });
      return;
    }
    const db = getLocalDB();
    db.adminSettings[key] = value;
    saveLocalDB(db);
  },

  // CRM Sync Logs
  async getCrmSyncLogs(): Promise<CrmSyncLog[]> {
    if (supabase) {
      const { data, error } = await supabase.from('salesforce_sync_logs').select('*');
      if (!error && data) return data;
    }
    return getLocalDB().crmSyncLogs;
  },

  async saveCrmSyncLog(log: CrmSyncLog): Promise<void> {
    if (supabase) {
      await supabase.from('salesforce_sync_logs').insert(log);
      return;
    }
    const db = getLocalDB();
    db.crmSyncLogs.push(log);
    saveLocalDB(db);
  }
};
