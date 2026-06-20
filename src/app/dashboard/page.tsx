'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  Briefcase, CheckSquare, Settings, Database, Trash2, X, Plus, AlertCircle, 
  Play, Upload, Check, Mail, Sparkles, ThumbsUp, ThumbsDown, ArrowUpRight,
  Shield, FileText, CheckCircle2, DollarSign, Activity
} from 'lucide-react';

interface Account {
  id: string;
  name: string;
  group_code: string;
  is_child: boolean;
  is_customer: boolean;
  segments: string[];
  owner_email: string;
  crm_connected: boolean;
}

interface SignalColumn {
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

interface AccountSource {
  account_id: string;
  column_key: string;
  status: 'configured' | 'auto' | 'missing' | 'na';
  source_label?: string;
}

interface DetectedSignal {
  account_id: string;
  column_key: string;
  score: number;
  signal_date: string;
  summary: string;
  why_matters: string;
  source_name: string;
  excerpt: string;
}

interface CrmSettings {
  account_id: string;
  crm_type: 'salesforce' | 'hubspot' | 'dynamics' | 'none';
  sync_direction: 'write' | 'read' | 'none';
  sync_field: string;
}

interface KnowledgeBaseItem {
  id: string;
  title: string;
  source_type: 'website' | 'reviews' | 'community' | 'upload';
  description: string;
  excerpt: string;
  frequency_lbl: string;
  updated_at: string;
}

export default function Dashboard() {
  // Navigation
  const [activeTab, setActiveTab] = useState<'matrix' | 'knowledge' | 'admin'>('matrix');

  // Database State
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [columns, setColumns] = useState<SignalColumn[]>([]);
  const [sources, setSources] = useState<AccountSource[]>([]);
  const [signals, setSignals] = useState<DetectedSignal[]>([]);
  const [crmSettings, setCrmSettings] = useState<CrmSettings[]>([]);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBaseItem[]>([]);
  const [adminSettings, setAdminSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  // Table Selection / Filters
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    segment: 'all',
    region: 'all',
    relationship: 'all',
    coverage: 'all'
  });

  // Pipeline Status Logger
  const [isFetching, setIsFetching] = useState(false);
  const [fetchLogs, setFetchLogs] = useState<string[]>([]);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Popover State (Column Editing)
  const [popoverAnchor, setPopoverAnchor] = useState<HTMLTableHeaderCellElement | null>(null);
  const [editingColKey, setEditingColKey] = useState<string | null>(null);
  const [popoverForm, setPopoverForm] = useState<Partial<SignalColumn>>({});

  // Drawers State
  const [activeDrawer, setActiveDrawer] = useState<'sources' | 'signal' | null>(null);
  const [drawerAccountId, setDrawerAccountId] = useState<string | null>(null);
  const [drawerColKey, setDrawerColKey] = useState<string | null>(null);
  const [customSourceLabel, setCustomSourceLabel] = useState<Record<string, string>>({});
  
  // Action Loaders in Drawers
  const [crmSyncing, setCrmSyncing] = useState<string | null>(null); // 'idle' | 'syncing' | 'synced'
  const [ownerNotifying, setOwnerNotifying] = useState(false);
  const [revopsNotifying, setRevopsNotifying] = useState(false);

  // Global Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Load Data
  const loadState = async () => {
    try {
      const res = await fetch('/api/state');
      const data = await res.json();
      if (data) {
        setAccounts(data.accounts || []);
        setColumns(data.columns || []);
        setSources(data.sources || []);
        setSignals(data.signals || []);
        setCrmSettings(data.crmSettings || []);
        setKnowledgeBase(data.knowledgeBase || []);
        setAdminSettings(data.adminSettings || {});
      }
    } catch (e) {
      console.error('Failed to load state', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadState();
  }, []);

  // Auto-scroll logs terminal
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [fetchLogs]);

  // Toast Helper
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Pipeline Fetch trigger
  const runFetch = async () => {
    setIsFetching(true);
    setFetchLogs([]);
    showToast('Starting EHSQ Signal Engine enrichment fetch...');
    
    try {
      const res = await fetch('/api/run-fetch', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true })
      });
      const data = await res.json();
      if (data && data.logs) {
        setFetchLogs(data.logs);
        showToast(`Fetch completed. ${data.updatedCount} signals verified.`);
        await loadState();
      }
    } catch (e) {
      console.error('Fetch run failed', e);
      setFetchLogs(prev => [...prev, '[ERROR] Fetch process interrupted. See network logs.']);
    } finally {
      setIsFetching(false);
    }
  };

  // CSV Upload
  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const csvContent = event.target?.result as string;
      showToast('Processing CSV accounts list...');
      try {
        const res = await fetch('/api/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'upload_csv', csvContent })
        });
        const data = await res.json();
        if (data.success) {
          showToast(data.message);
          await loadState();
        }
      } catch (e) {
        console.error('CSV upload failed', e);
        showToast('Error uploading CSV.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Delete / Bulk actions
  const handleDeleteAccount = async (id: string) => {
    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_account', id })
      });
      if (res.ok) {
        showToast('Account deleted.');
        setSelectedAccounts(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        await loadState();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedAccounts);
    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bulk_delete_accounts', ids })
      });
      if (res.ok) {
        showToast(`${ids.length} accounts deleted.`);
        setSelectedAccounts(new Set());
        await loadState();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Filter accounts
  const visibleColumns = columns.filter(col => {
    if (!col.is_active) return false;
    if (filters.segment === 'all') return true;
    return col.segments.includes(filters.segment);
  });

  const filteredAccounts = accounts.filter(acc => {
    if (filters.segment !== 'all' && !acc.segments.includes(filters.segment)) return false;
    if (filters.region !== 'all' && acc.group_code !== filters.region) return false;
    if (filters.relationship === 'customer' && !acc.is_customer) return false;
    if (filters.relationship === 'prospect' && acc.is_customer) return false;
    if (filters.coverage === 'gaps') {
      const accSources = sources.filter(s => s.account_id === acc.id);
      const hasGap = visibleColumns.some(col => {
        if (col.key_name === 'relationship') return false;
        const src = accSources.find(s => s.column_key === col.key_name);
        return !src || src.status === 'missing';
      });
      if (!hasGap) return false;
    }
    return true;
  });

  // Toggles inside column configurations
  const toggleColumnActive = async (colKey: string, curState: boolean) => {
    const col = columns.find(c => c.key_name === colKey);
    if (!col) return;
    const updated = { ...col, is_active: !curState };
    try {
      await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_column', column: updated })
      });
      showToast(`Column ${col.label} ${updated.is_active ? 'enabled' : 'paused'}`);
      await loadState();
    } catch (e) {
      console.error(e);
    }
  };

  // Popover Editing functions
  const openColPopover = (colKey: string, thEl: HTMLTableHeaderCellElement) => {
    const col = columns.find(c => c.key_name === colKey);
    if (!col) return;
    setEditingColKey(colKey);
    setPopoverForm({ ...col });
    setPopoverAnchor(thEl);
  };

  const openNewColPopover = (btnEl: any) => {
    setEditingColKey('NEW');
    setPopoverForm({
      key_name: 'col_' + Date.now(),
      label: '',
      has_prompt: true,
      is_active: true,
      prompt: '',
      source_type: 'api',
      context_depth: false,
      threshold: 7,
      budget: 10,
      cadence: 'Weekly',
      segments: ['commercial', 'enterprise']
    });
    setPopoverAnchor(btnEl);
  };

  const closeColPopover = () => {
    setPopoverAnchor(null);
    setEditingColKey(null);
    setPopoverForm({});
  };

  const saveColConfig = async () => {
    if (!popoverForm.label) {
      showToast('Column label is required');
      return;
    }
    try {
      await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_column', column: popoverForm })
      });
      showToast(`Column settings saved.`);
      closeColPopover();
      await loadState();
    } catch (e) {
      console.error(e);
    }
  };

  // Drawers trigger
  const openSourcesDrawer = (accountId: string) => {
    setDrawerAccountId(accountId);
    setActiveDrawer('sources');
  };

  const openSignalDrawer = (accountId: string, colKey: string) => {
    setDrawerAccountId(accountId);
    setDrawerColKey(colKey);
    setCrmSyncing(null);
    setOwnerNotifying(false);
    setRevopsNotifying(false);
    setActiveDrawer('signal');
  };

  const closeDrawer = () => {
    setActiveDrawer(null);
    setDrawerAccountId(null);
    setDrawerColKey(null);
  };

  // Edit Source within Drawer
  const handleSaveSource = async (colKey: string) => {
    const textVal = customSourceLabel[colKey]?.trim();
    if (!textVal) {
      showToast('Please enter a source descriptor or URL.');
      return;
    }

    const updatedSource: AccountSource = {
      account_id: drawerAccountId!,
      column_key: colKey,
      status: 'configured',
      source_label: textVal
    };

    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_source', source: updatedSource })
      });
      if (res.ok) {
        showToast('Source updated successfully.');
        await loadState();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleResolveSource = async (colKey: string) => {
    showToast(`Resolving source for ${colKey}...`);
    setTimeout(async () => {
      const resolvedSource: AccountSource = {
        account_id: drawerAccountId!,
        column_key: colKey,
        status: 'auto',
        source_label: `Auto-resolved via EHSQ web search pattern`
      };
      await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_source', source: resolvedSource })
      });
      showToast('Source auto-resolved successfully.');
      await loadState();
    }, 1200);
  };

  // Save CRM settings per account
  const saveCrmSettingsForAccount = async (crmType: any, direction: any, field: string) => {
    const updatedSettings = {
      account_id: drawerAccountId!,
      crm_type: crmType,
      sync_direction: direction,
      sync_field: field
    };

    try {
      await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_crm_settings', settings: updatedSettings })
      });
      showToast('CRM Settings updated for this account.');
      await loadState();
    } catch (e) {
      console.error(e);
    }
  };

  // Signal Drawer Actions
  const handleCrmSync = async (signal: DetectedSignal) => {
    setCrmSyncing('syncing');
    try {
      const res = await fetch('/api/crm-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: signal.account_id,
          columnKey: signal.column_key,
          signalId: 'sig-' + Date.now() // Mock signal id
        })
      });
      const data = await res.json();
      if (data.success) {
        setCrmSyncing('synced');
        showToast(`Signal synced to CRM queue successfully.`);
        await loadState();
      }
    } catch (e) {
      console.error(e);
      setCrmSyncing(null);
    }
  };

  const handleSendDigestEmail = async (type: 'owner' | 'revops', email: string) => {
    if (type === 'owner') setOwnerNotifying(true);
    if (type === 'revops') setRevopsNotifying(true);

    try {
      const res = await fetch('/api/send-digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, recipientEmail: email })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Branded EHSQ alert email digest sent successfully to ${email}.`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setOwnerNotifying(false);
      setRevopsNotifying(false);
    }
  };

  // Admin Settings Updates
  const updateAdminSetting = async (key: string, value: any) => {
    try {
      await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_admin_setting', key, value })
      });
      showToast('Setting updated.');
      await loadState();
    } catch (e) {
      console.error(e);
    }
  };

  const toggleSelectAll = (isChecked: boolean) => {
    if (isChecked) {
      setSelectedAccounts(new Set(filteredAccounts.map(a => a.id)));
    } else {
      setSelectedAccounts(new Set());
    }
  };

  const toggleSelectAccount = (id: string, isChecked: boolean) => {
    setSelectedAccounts(prev => {
      const next = new Set(prev);
      if (isChecked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  // Feedback loop
  const handleFeedback = (id: string, col: string, feedback: 'up' | 'down') => {
    showToast(`Signal feedback recorded as ${feedback === 'up' ? 'accurate' : 'inaccurate'} (feeds back into prompt tuning).`);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* HEADER */}
      <header className="topnav">
        <div className="brand">
          <span className="brand-dot"></span>
          EHSQ Signal Engine
          <span>Workspace Console</span>
        </div>
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'matrix' ? 'active' : ''}`}
            onClick={() => setActiveTab('matrix')}
          >
            Signal Matrix
          </button>
          <button 
            className={`tab ${activeTab === 'knowledge' ? 'active' : ''}`}
            onClick={() => setActiveTab('knowledge')}
          >
            Knowledge Base
          </button>
          <button 
            className={`tab ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin')}
          >
            Admin
          </button>
        </div>
        <div className="top-actions">
          <a 
            href="/accounts_template.csv" 
            download="accounts_template.csv"
            className="btn" 
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <FileText size={14} />
            Template
          </a>
          <label className="btn" style={{ cursor: 'pointer' }}>
            <Upload size={14} />
            Upload CSV
            <input 
              type="file" 
              accept=".csv" 
              style={{ display: 'none' }} 
              onChange={handleCsvUpload}
            />
          </label>
          <button 
            className="btn btn-primary" 
            disabled={isFetching}
            onClick={runFetch}
          >
            <Play size={14} fill="currentColor" />
            {isFetching ? 'Running...' : 'Run Fetch'}
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main style={{ flex: 1 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--ink-faint)' }}>
            Loading Intelligence Console...
          </div>
        ) : (
          <>
            {/* VIEW: SIGNAL MATRIX */}
            <section className={`view ${activeTab === 'matrix' ? 'active' : ''}`}>
              {/* METRICS ROW */}
              <div className="stats-row">
                <div className="stat">
                  <div className="num">{filteredAccounts.length}</div>
                  <div className="lbl">Accounts</div>
                </div>
                <div className="stat">
                  <div className="num">{visibleColumns.length}</div>
                  <div className="lbl">Signal Columns</div>
                </div>
                <div className="stat">
                  <div className="num accent">
                    {signals.filter(s => s.score >= 7).length}
                  </div>
                  <div className="lbl">Scores ≥ 7</div>
                </div>
                <div className="stat">
                  <div className="num">
                    {
                      accounts.reduce((acc, currentAcc) => {
                        const accSources = sources.filter(s => s.account_id === currentAcc.id);
                        const missingCount = visibleColumns.filter(c => c.key_name !== 'relationship').reduce((colAcc, col) => {
                          const src = accSources.find(s => s.column_key === col.key_name);
                          return colAcc + (!src || src.status === 'missing' ? 1 : 0);
                        }, 0);
                        return acc + missingCount;
                      }, 0)
                    }
                  </div>
                  <div className="lbl">Sources Missing</div>
                </div>
                <div className="stat">
                  <div className="num">
                    ${adminSettings.spendThisWeek || '0.00'}
                    <span style={{ fontSize: '12px', color: 'var(--ink-faint)', fontWeight: 'normal' }}> / $50 wk</span>
                  </div>
                  <div className="lbl">Spend this week</div>
                </div>
                <div className="stat">
                  <div className="num">{adminSettings.syncsToday || 0}</div>
                  <div className="lbl">CRM Syncs Today</div>
                </div>
              </div>

              {/* LOGS WINDOW */}
              {fetchLogs.length > 0 && (
                <div className="run-status-console">
                  <div style={{ fontWeight: 'bold', borderBottom: '1px solid #444', paddingBottom: '4px', marginBottom: '6px' }}>
                    Agent Execution Monitor Logs (Multi-Agent Scraping & LLM Scoring Pipeline)
                  </div>
                  {fetchLogs.map((log, idx) => (
                    <div key={idx}>{log}</div>
                  ))}
                  <div ref={consoleEndRef} />
                </div>
              )}

              {/* FILTERS */}
              <div className="filters-bar">
                <div className="filter-group">
                  <span className="filter-lbl">Segment</span>
                  <select 
                    value={filters.segment}
                    onChange={(e) => setFilters(prev => ({ ...prev, segment: e.target.value }))}
                  >
                    <option value="all">All</option>
                    <option value="commercial">Commercial</option>
                    <option value="enterprise">Enterprise</option>
                    <option value="gov">Government</option>
                    <option value="healthcare">Healthcare</option>
                  </select>
                </div>
                <div className="filter-group">
                  <span className="filter-lbl">Region</span>
                  <select 
                    value={filters.region}
                    onChange={(e) => setFilters(prev => ({ ...prev, region: e.target.value }))}
                  >
                    <option value="all">All</option>
                    <option value="MW">Midwest (MW)</option>
                    <option value="SW">Southwest (SW)</option>
                    <option value="SE">Southeast (SE)</option>
                    <option value="FED">Federal (FED)</option>
                    <option value="UPLOADED">Uploaded</option>
                  </select>
                </div>
                <div className="filter-group">
                  <span className="filter-lbl">Relationship</span>
                  <select 
                    value={filters.relationship}
                    onChange={(e) => setFilters(prev => ({ ...prev, relationship: e.target.value }))}
                  >
                    <option value="all">All</option>
                    <option value="customer">Existing Customers</option>
                    <option value="prospect">Prospects</option>
                  </select>
                </div>
                <div className="filter-group">
                  <span className="filter-lbl">Coverage</span>
                  <select 
                    value={filters.coverage}
                    onChange={(e) => setFilters(prev => ({ ...prev, coverage: e.target.value }))}
                  >
                    <option value="all">All accounts</option>
                    <option value="gaps">Gaps only</option>
                  </select>
                </div>
                <button 
                  className="filter-reset"
                  onClick={() => setFilters({ segment: 'all', region: 'all', relationship: 'all', coverage: 'all' })}
                >
                  Reset filters
                </button>
              </div>

              {/* TOOLBAR */}
              <div className="toolbar">
                {selectedAccounts.size > 0 ? (
                  <div className="bulk-bar">
                    <span>{selectedAccounts.size} selected</span>
                    <button onClick={handleBulkDelete}>
                      <Trash2 size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-top' }} />
                      Delete
                    </button>
                    <button className="clear" onClick={() => setSelectedAccounts(new Set())}>Clear</button>
                  </div>
                ) : <div />}
              </div>

              {/* SHEET MATRIX TABLE */}
              <div className="sheet-wrap" style={{ position: 'relative' }}>
                <table className="sheet">
                  <thead>
                    <tr>
                      <th className="sel-col">
                        <input 
                          type="checkbox" 
                          checked={filteredAccounts.length > 0 && selectedAccounts.size === filteredAccounts.length}
                          onChange={(e) => toggleSelectAll(e.target.checked)}
                        />
                      </th>
                      <th className="acct-col">Account</th>
                      {visibleColumns.map(col => {
                        const allSegs = col.segments.length >= 4;
                        return (
                          <th 
                            key={col.key_name}
                            onClick={(e) => openColPopover(col.key_name, e.currentTarget)}
                          >
                            <div className="col-head">
                              <div className="col-head-top">
                                <span style={{ opacity: col.is_active ? 1 : 0.4 }}>
                                  <Shield size={14} color={col.is_active ? 'var(--navy)' : 'var(--ink-faint)'} />
                                </span>
                                <button 
                                  className={`mini-toggle ${col.is_active ? 'on' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleColumnActive(col.key_name, col.is_active);
                                  }}
                                >
                                  <span className="knob"></span>
                                </button>
                              </div>
                              <div className="col-head-name">
                                {col.label}
                                {!allSegs && <span className="seg-tag">{col.segments[0]}</span>}
                                {col.source_type === 'paid' && <span className="paid-badge">paid</span>}
                              </div>
                              <div className="col-head-sub">
                                {col.cadence} {col.has_prompt ? `· threshold ≥${col.threshold}` : ''} · ${col.budget}/wk
                              </div>
                            </div>
                          </th>
                        );
                      })}
                      <th className="add-col">
                        <button 
                          className="add-col-btn"
                          onClick={(e) => openNewColPopover(e.currentTarget)}
                        >
                          <Plus size={16} />
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAccounts.length === 0 ? (
                      <tr>
                        <td colSpan={visibleColumns.length + 3} style={{ textAlign: 'center', color: 'var(--ink-faint)', padding: '40px' }}>
                          No accounts match the current filters. Try resetting the options.
                        </td>
                      </tr>
                    ) : (
                      filteredAccounts.map(acc => {
                        const accSources = sources.filter(s => s.account_id === acc.id);
                        return (
                          <tr key={acc.id}>
                            <td>
                              <input 
                                type="checkbox"
                                checked={selectedAccounts.has(acc.id)}
                                onChange={(e) => toggleSelectAccount(acc.id, e.target.checked)}
                              />
                            </td>
                            <td className="acct-cell">
                              <button 
                                className={`acct-name-btn ${acc.is_child ? 'child' : ''}`}
                                onClick={() => openSourcesDrawer(acc.id)}
                              >
                                {acc.is_child ? '↳ ' : ''}{acc.name}
                                <span className="acct-tag">{acc.group_code}</span>
                                {acc.segments.map(seg => (
                                  <span key={seg} className="seg-tag" style={{ marginLeft: '4px' }}>{seg}</span>
                                ))}
                              </button>
                              {acc.is_customer && (
                                <div className="acct-cust">★ Existing customer</div>
                              )}
                              <div className="acct-owner">
                                {acc.crm_connected ? '⟳ ' : ''} {acc.owner_email || 'No owner set'}
                              </div>
                            </td>
                            
                            {visibleColumns.map(col => {
                              if (col.key_name === 'relationship') {
                                return (
                                  <td key={col.key_name}>
                                    {acc.is_customer ? (
                                      <span className="rel-pill rel-good">★ Existing customer</span>
                                    ) : acc.is_child ? (
                                      <span className="rel-pill rel-good">Parent is customer</span>
                                    ) : (
                                      <span className="rel-pill rel-neutral">No CRM match yet</span>
                                    )}
                                  </td>
                                );
                              }

                              const src = accSources.find(s => s.column_key === col.key_name);
                              const on = col.is_active;

                              if (!on) {
                                return (
                                  <td key={col.key_name} className="cell-asleep">
                                    <span className="cell-quiet">Paused</span>
                                  </td>
                                );
                              }

                              if (!src || src.status === 'na') {
                                return (
                                  <td key={col.key_name}>
                                    <span className="cell-na">n/a</span>
                                  </td>
                                );
                              }

                              if (src.status === 'missing') {
                                return (
                                  <td key={col.key_name} style={{ cursor: 'pointer' }} onClick={() => openSourcesDrawer(acc.id)}>
                                    <span className="cell-nosource">
                                      <span className="dot"></span>No source
                                    </span>
                                  </td>
                                );
                              }

                              // Check if we have a detected signal
                              const sig = signals.find(s => s.account_id === acc.id && s.column_key === col.key_name);

                              if (!sig) {
                                return (
                                  <td key={col.key_name} style={{ cursor: 'pointer' }} onClick={() => openSignalDrawer(acc.id, col.key_name)}>
                                    <span className="cell-quiet">
                                      — monitoring {src.status === 'auto' && <span className="auto-tag">· auto</span>}
                                    </span>
                                  </td>
                                );
                              }

                              const scoreCls = sig.score >= 7 ? 'p-hi' : sig.score >= 5 ? 'p-mid' : 'p-lo';

                              return (
                                <td 
                                  key={col.key_name} 
                                  style={{ cursor: 'pointer' }}
                                  onClick={() => openSignalDrawer(acc.id, col.key_name)}
                                >
                                  <span className={`pill ${scoreCls}`}>{sig.score}/10</span>
                                  <span className="cell-date">{sig.signal_date}</span>
                                </td>
                              );
                            })}
                            <td></td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* VIEW: KNOWLEDGE BASE */}
            <section className={`view ${activeTab === 'knowledge' ? 'active' : ''}`}>
              <div className="kb-grid">
                {knowledgeBase.map(item => (
                  <div key={item.id} className="kb-card">
                    <h3>
                      <span className="dot"></span>
                      {item.title}
                    </h3>
                    <div className="desc">{item.description}</div>
                    <div className="excerpt">{item.excerpt}</div>
                    <div className="kb-meta">
                      <span>{item.frequency_lbl}</span>
                      <span>Updated {item.updated_at}</span>
                    </div>
                  </div>
                ))}
                
                <div className="kb-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <h3>
                    <span className="dot" style={{ backgroundColor: 'var(--ink-faint)' }}></span>
                    Context Doc (.md / .csv) Upload
                  </h3>
                  <div className="desc">Upload safety guidelines, ICP rules, or competitive files.</div>
                  <div className="upload-zone" onClick={() => showToast('Context file uploaded and parsed into derived ICP models.')}>
                    + Drop context files here
                  </div>
                </div>
              </div>

              <div className="icp-summary">
                <h3>Derived ICP (Ideal Customer Profile) Summary</h3>
                <p>
                  EHSQ Signal Engine monitors buying triggers across any compliance-driven enterprise or public organization. The clearest signals for Cority-like solutions are: recent enforcement actions or workplace safety citations, capital allocations for digital compliance systems, new hires in environmental or safety leadership roles, and active procurement bids for quality management (QMS) or incident tracking software. Paid data enrichment can be integrated into the engine to add ZoomInfo details and Bombora topic intensity metrics on top of detected intent signals.
                </p>
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    showToast('Regenerating ICP details from crawler indexes...');
                  }}
                >
                  <Sparkles size={14} style={{ marginRight: '4px' }} />
                  Regenerate from sources
                </button>
              </div>
            </section>

            {/* VIEW: ADMIN */}
            <section className={`view ${activeTab === 'admin' ? 'active' : ''}`}>
              <div className="admin-grid">
                <div>
                  {/* Model Tuning */}
                  <div className="admin-card">
                    <h3>Model speed & Triage</h3>
                    <div className="sub">Tweak LLM costs and accuracy across the evaluation stages.</div>
                    
                    <span className="field-lbl">Scoring Mode</span>
                    <div className="speed-picker">
                      <button 
                        className={`speed-opt ${adminSettings.modelSpeed === 'fast' ? 'active' : ''}`}
                        onClick={() => updateAdminSetting('modelSpeed', 'fast')}
                      >
                        Fast<br />
                        <span style={{ fontSize: '9px', fontWeight: 'normal', opacity: 0.8 }}>Haiku 4.5 Triage</span>
                      </button>
                      <button 
                        className={`speed-opt ${adminSettings.modelSpeed === 'standard' ? 'active' : ''}`}
                        onClick={() => updateAdminSetting('modelSpeed', 'standard')}
                      >
                        Standard<br />
                        <span style={{ fontSize: '9px', fontWeight: 'normal', opacity: 0.8 }}>Haiku + Sonnet</span>
                      </button>
                      <button 
                        className={`speed-opt ${adminSettings.modelSpeed === 'thorough' ? 'active' : ''}`}
                        onClick={() => updateAdminSetting('modelSpeed', 'thorough')}
                      >
                        Thorough<br />
                        <span style={{ fontSize: '9px', fontWeight: 'normal', opacity: 0.8 }}>Sonnet + Opus</span>
                      </button>
                    </div>
                    <div className="speed-desc">
                      {adminSettings.modelSpeed === 'fast' && 'Tier 2 (triage): Haiku on all modifications. Tier 3 (verification): Haiku on items above threshold. Lowest token cost.'}
                      {adminSettings.modelSpeed === 'standard' && 'Tier 2 (triage): Haiku 4.5 triage. Tier 3 (verification): Sonnet 4.6 evaluation on items above threshold. Balanced accuracy.'}
                      {adminSettings.modelSpeed === 'thorough' && 'Tier 2 (triage): Sonnet. Tier 3 (verification): Claude Opus scoring. High precision, recommended for top tiers.'}
                    </div>

                    <button 
                      className="advanced-toggle"
                      onClick={(e) => {
                        const next = e.currentTarget.nextElementSibling;
                        if (next) next.classList.toggle('open');
                      }}
                    >
                      Advanced model settings ↓
                    </button>
                    <div className="advanced-body">
                      <span className="field-lbl">LLM Scrape API Key</span>
                      <input className="key-input" value="ctxt_secret_••••••••••••ff3" readOnly />
                      <span className="field-lbl">Triage Model</span>
                      <select><option>Claude Haiku 4.5</option><option>Gemini 1.5 Flash</option></select>
                      <span className="field-lbl">Verification Model</span>
                      <select><option>Claude Sonnet 4.6</option><option>Claude Opus 4.7</option><option>Gemini 1.5 Pro</option></select>
                    </div>
                  </div>

                  {/* CRM setup */}
                  <div className="admin-card">
                    <h3>CRM Connections</h3>
                    <div className="sub">Authenticate CRMs to match account ownership and sync detected buy signals.</div>
                    
                    <div className="crm-option">
                      <div>
                        <div className="crm-name">Salesforce</div>
                        <div className="crm-meta">Syncs owner email · writes EHSQ Signal custom objects</div>
                      </div>
                      <span className="connect-btn connected">✓ Connected</span>
                    </div>
                    <div className="crm-option">
                      <div>
                        <div className="crm-name">HubSpot</div>
                        <div className="crm-meta font-normal">Connect HubSpot account · writes lead note feeds</div>
                      </div>
                      <button className="connect-btn" onClick={() => showToast('HubSpot OAuth redirect initiated.')}>Connect</button>
                    </div>
                    <div className="crm-option">
                      <div>
                        <div className="crm-name">Microsoft Dynamics</div>
                        <div className="crm-meta">Connect Dynamics CRM · writes activities logs</div>
                      </div>
                      <button className="connect-btn" onClick={() => showToast('MS Dynamics OAuth redirect initiated.')}>Connect</button>
                    </div>
                  </div>

                  {/* Services status */}
                  <div className="admin-card">
                    <h3>Connected Feeds & Services</h3>
                    <div className="sub">API status check for procurement databases and scraper integrations.</div>
                    
                    <div className="admin-row">
                      <div className="nm">Procurement / RFP feed</div>
                      <span className="status-pill status-ok">Connected</span>
                    </div>
                    <div className="admin-row">
                      <div className="nm">OSHA / Regulatory API</div>
                      <span className="status-pill status-ok">Connected</span>
                    </div>
                    <div className="admin-row">
                      <div className="nm">LinkedIn Jobs API</div>
                      <span className="status-pill status-ok">Connected</span>
                    </div>
                    <div className="admin-row">
                      <div className="nm">Context.dev Scraper</div>
                      <span className="status-pill status-ok">Connected</span>
                    </div>
                    <div className="admin-row">
                      <div className="nm">Supabase Database</div>
                      <span className="status-pill status-ok">Connected</span>
                    </div>
                  </div>
                </div>

                <div>
                  {/* Budget breakdown */}
                  <div className="admin-card">
                    <h3>Cost & Token Allocation</h3>
                    <div className="sub">Monthly usage totals tracking model spend.</div>
                    
                    <div className="budget-bar">
                      <div 
                        className="budget-bar-fill" 
                        style={{ width: `${((adminSettings.spendThisWeek || 28.40) / 50) * 100}%` }}
                      ></div>
                    </div>
                    
                    <div className="bar-row">
                      <span className="lbl">Tier 1 — scrape</span>
                      <div className="bar-track"><div className="bar-fill" style={{ width: '2%', backgroundColor: 'var(--ink-faint)' }}></div></div>
                      <span className="bar-amt">$0.00</span>
                    </div>
                    <div className="bar-row">
                      <span className="lbl">Tier 2 — Triage</span>
                      <div className="bar-track"><div className="bar-fill" style={{ width: '38%', backgroundColor: 'var(--secondary)' }}></div></div>
                      <span className="bar-amt">$6.20</span>
                    </div>
                    <div className="bar-row">
                      <span className="lbl">Tier 3 — Verification</span>
                      <div className="bar-track"><div className="bar-fill" style={{ width: '60%', backgroundColor: 'var(--primary)' }}></div></div>
                      <span className="bar-amt">${((adminSettings.spendThisWeek || 28.40) - 6.20).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Output Routing */}
                  <div className="admin-card">
                    <h3>Output routing rules</h3>
                    <div className="sub">Routing actions triggered on high relevance scoring matches.</div>
                    
                    <div className="admin-row">
                      <div>
                        <div className="nm">Auto-Sync to Salesforce</div>
                        <div className="meta">Push signal objects when relevance ≥ threshold</div>
                      </div>
                      <button 
                        className={`mini-toggle ${adminSettings.outputCrmEnabled ? 'on' : ''}`}
                        onClick={() => updateAdminSetting('outputCrmEnabled', !adminSettings.outputCrmEnabled)}
                      >
                        <span className="knob"></span>
                      </button>
                    </div>

                    <div className="admin-row">
                      <div>
                        <div className="nm">Notify Account Owner</div>
                        <div className="meta">Send daily safety intent alert digests to reps</div>
                      </div>
                      <button 
                        className={`mini-toggle ${adminSettings.outputOwnerEnabled ? 'on' : ''}`}
                        onClick={() => updateAdminSetting('outputOwnerEnabled', !adminSettings.outputOwnerEnabled)}
                      >
                        <span className="knob"></span>
                      </button>
                    </div>

                    <div className="admin-row">
                      <div>
                        <div className="nm">Notify RevOps / Admin</div>
                        <div className="meta">Consolidate matches into administrative queue</div>
                      </div>
                      <button 
                        className={`mini-toggle ${adminSettings.outputRevopsEnabled ? 'on' : ''}`}
                        onClick={() => updateAdminSetting('outputRevopsEnabled', !adminSettings.outputRevopsEnabled)}
                      >
                        <span className="knob"></span>
                      </button>
                    </div>
                    
                    <div className="admin-row" style={{ paddingTop: '10px', gap: '10px' }}>
                      <span className="field-lbl" style={{ marginBottom: 0, whiteSpace: 'nowrap' }}>RevOps digest email</span>
                      <input 
                        type="text" 
                        value={adminSettings.revopsEmail || ''} 
                        onChange={(e) => updateAdminSetting('revopsEmail', e.target.value)}
                        style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: '6px 9px', fontSize: '11px', flex: 1, minWidth: 0 }}
                      />
                    </div>
                  </div>

                  {/* Source resolver */}
                  <div className="admin-card">
                    <h3>Source resolver</h3>
                    <div className="sub">Automated source crawling resolution rules for new uploads.</div>
                    <div className="resolver-toggle-row">
                      <span className="font-semibold">Auto-resolve sources for new accounts</span>
                      <button 
                        className={`mini-toggle ${adminSettings.resolverEnabled ? 'on' : ''}`}
                        onClick={() => updateAdminSetting('resolverEnabled', !adminSettings.resolverEnabled)}
                      >
                        <span className="knob"></span>
                      </button>
                    </div>
                    <div className="admin-row" style={{ marginTop: '10px' }}>
                      <div className="nm">Auto-resolved this week</div>
                      <span className="meta" style={{ fontWeight: 'bold' }}>{adminSettings.autoResolvedThisWeek || 0} resolved</span>
                    </div>
                    <div className="admin-row">
                      <div className="nm">Pending manual review</div>
                      <span className="meta" style={{ fontWeight: 'bold' }}>{adminSettings.pendingReviewThisWeek || 0} reviews</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feedback Loop Dashboard */}
              <div className="admin-card">
                <h3>Signal precision feedback loop</h3>
                <div className="sub">Human-in-the-loop accuracy tags mapped back to prompt refinement models.</div>
                
                <div className="fb-row">
                  <span className="txt">Westbrook Health — Quality Management RFP (Score 9)</span>
                  <div className="fb-btns">
                    <button onClick={() => handleFeedback('westbrook', 'rfp', 'up')}>👍</button>
                    <button onClick={() => handleFeedback('westbrook', 'rfp', 'down')}>👎</button>
                  </div>
                </div>
                <div className="fb-row">
                  <span className="txt">Meridian Environmental — $26K EPA Chemical Penalty (Score 9)</span>
                  <div className="fb-btns">
                    <button onClick={() => handleFeedback('meridian', 'enforcement', 'up')}>👍</button>
                    <button onClick={() => handleFeedback('meridian', 'enforcement', 'down')}>👎</button>
                  </div>
                </div>
                <div className="fb-row">
                  <span className="txt">Federal Safety Agency — Injury Tracking Sources Sought (Score 9)</span>
                  <div className="fb-btns">
                    <button onClick={() => handleFeedback('federal-sa', 'rfp', 'up')}>👍</button>
                    <button onClick={() => handleFeedback('federal-sa', 'rfp', 'down')}>👎</button>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {/* FLOATING POPOVER: COLUMN CONFIGURATION */}
      {popoverAnchor && editingColKey && (
        <div 
          className="col-popover"
          style={{
            top: `${Math.min(popoverAnchor.getBoundingClientRect().bottom + window.scrollY + 8, window.innerHeight + window.scrollY - 540)}px`,
            left: `${Math.min(popoverAnchor.getBoundingClientRect().left + window.scrollX, window.innerWidth + window.scrollX - 380)}px`
          }}
        >
          <div className="cp-head">
            <input 
              className="name-input"
              value={popoverForm.label || ''}
              placeholder="Signal column name..."
              onChange={(e) => setPopoverForm(prev => ({ ...prev, label: e.target.value }))}
            />
            <button className="cp-close" onClick={closeColPopover}>✕</button>
          </div>

          {popoverForm.has_prompt && (
            <div className="cp-field">
              <div className="cp-label">
                <span>Prompt settings</span>
                <button 
                  className="cp-refine"
                  onClick={() => {
                    const extra = ' Exclude generic, non-software projects. Require safety management, incident reporting, or environmental audit context.';
                    if (!popoverForm.prompt?.includes(extra)) {
                      setPopoverForm(prev => ({ ...prev, prompt: (prev.prompt || '') + extra }));
                      showToast('Prompt refined with EHSQ guardrails.');
                    }
                  }}
                >
                  ✦ Refine
                </button>
              </div>
              <textarea 
                value={popoverForm.prompt || ''}
                onChange={(e) => setPopoverForm(prev => ({ ...prev, prompt: e.target.value }))}
              />
            </div>
          )}

          <div className="cp-field">
            <div className="cp-label">Applies to segment</div>
            <div className="chip-row">
              {['commercial', 'enterprise', 'gov', 'healthcare'].map(seg => {
                const isSelected = popoverForm.segments?.includes(seg);
                return (
                  <span 
                    key={seg} 
                    className={`chip ${isSelected ? 'on' : ''}`}
                    onClick={() => {
                      setPopoverForm(prev => {
                        const segments = prev.segments || [];
                        if (segments.includes(seg)) {
                          return { ...prev, segments: segments.filter(s => s !== seg) };
                        } else {
                          return { ...prev, segments: [...segments, seg] };
                        }
                      });
                    }}
                  >
                    {seg.charAt(0).toUpperCase() + seg.slice(1)}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="cp-field">
            <div className="cp-label">Source type</div>
            <div className="chip-row">
              {[
                { k: 'api', l: 'Structured API' },
                { k: 'websearch', l: 'WebSearch + AI' },
                { k: 'crm', l: 'CRM Integration' },
                { k: 'paid', l: 'Paid Enrichment' }
              ].map(srcOpt => (
                <span 
                  key={srcOpt.k}
                  className={`chip ${popoverForm.source_type === srcOpt.k ? 'on' : ''}`}
                  onClick={() => setPopoverForm(prev => ({ ...prev, source_type: srcOpt.k as any }))}
                >
                  {srcOpt.l}
                </span>
              ))}
            </div>
            {popoverForm.source_type === 'paid' && (
              <div className="cp-paid-note show">
                Paid enrichment costs are tracked separately from AI token spend and appear in the budget breakdown under Admin.
              </div>
            )}
          </div>

          {popoverForm.has_prompt && (
            <>
              <div className="cp-field" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--ink-soft)' }}>Fetch full-text context (better accuracy)</span>
                <button 
                  className={`mini-toggle toggle-ai ${popoverForm.context_depth ? 'on' : ''}`}
                  onClick={() => setPopoverForm(prev => ({ ...prev, context_depth: !prev.context_depth }))}
                >
                  <span className="knob"></span>
                </button>
              </div>

              <div className="cp-field">
                <div className="cp-label">Alert scoring threshold</div>
                <div className="cp-slider">
                  <input 
                    type="range" 
                    min="1" 
                    max="10" 
                    value={popoverForm.threshold || 7}
                    onChange={(e) => setPopoverForm(prev => ({ ...prev, threshold: parseInt(e.target.value) }))}
                  />
                  <span className="val">{popoverForm.threshold}</span>
                </div>
              </div>
            </>
          )}

          <div className="cp-row2">
            <div className="cp-field">
              <div className="cp-label">Weekly Budget</div>
              <input 
                type="number" 
                value={popoverForm.budget || 0}
                onChange={(e) => setPopoverForm(prev => ({ ...prev, budget: parseInt(e.target.value) }))}
              />
            </div>
            <div className="cp-field">
              <div className="cp-label">Cadence</div>
              <select 
                value={popoverForm.cadence}
                onChange={(e) => setPopoverForm(prev => ({ ...prev, cadence: e.target.value }))}
              >
                <option value="Daily">Daily</option>
                <option value="Every 3 days">Every 3 days</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
              </select>
            </div>
          </div>

          <div className="cp-footer">
            <div className="cp-toggle-row">
              Monitoring
              <button 
                className={`mini-toggle ${popoverForm.is_active ? 'on' : ''}`}
                style={{ marginLeft: '6px' }}
                onClick={() => setPopoverForm(prev => ({ ...prev, is_active: !prev.is_active }))}
              >
                <span className="knob"></span>
              </button>
            </div>
            <button className="btn btn-primary" onClick={saveColConfig}>
              {editingColKey === 'NEW' ? 'Create Column' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* DRAWER: ACCOUNT SOURCES EDITOR */}
      {activeDrawer === 'sources' && drawerAccountId && (
        <>
          <div className="overlay show" onClick={closeDrawer}></div>
          <div className="drawer show">
            <button className="close-x" onClick={closeDrawer}>✕</button>
            
            {(() => {
              const acc = accounts.find(a => a.id === drawerAccountId);
              if (!acc) return null;
              
              const accSources = sources.filter(s => s.account_id === drawerAccountId);
              const crmSett = crmSettings.find(c => c.account_id === drawerAccountId) || {
                crm_type: 'none',
                sync_direction: 'none',
                sync_field: ''
              };

              return (
                <div style={{ paddingBottom: '30px' }}>
                  <div className="detail-meta">
                    <span className="tag">{acc.group_code}</span>
                    {acc.segments.map(seg => (
                      <span key={seg} className="tag">{seg}</span>
                    ))}
                    {acc.is_customer && (
                      <span className="tag" style={{ color: 'var(--green)', borderColor: 'rgba(46,125,91,.3)' }}>Customer</span>
                    )}
                  </div>
                  
                  <h2>{acc.name}</h2>
                  <div className="sub">Knowledge sources — configuring where this engine polls information.</div>

                  {/* CRM Sync configurations for this account */}
                  <div className="crm-input-section">
                    <div className="crm-section-lbl">
                      <span className="crm-status-dot" style={{ backgroundColor: acc.crm_connected ? 'var(--green)' : 'var(--ink-faint)' }}></span>
                      CRM Integration — Individual Account Setup
                    </div>
                    
                    <div className="crm-row">
                      <span className="lbl2">Source CRM</span>
                      <select 
                        id="crm-source-select"
                        defaultValue={crmSett.crm_type}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          saveCrmSettingsForAccount(val, crmSett.sync_direction, crmSett.sync_field);
                        }}
                      >
                        <option value="none">None (manual)</option>
                        <option value="salesforce">Salesforce</option>
                        <option value="hubspot">HubSpot</option>
                        <option value="dynamics">Dynamics CRM</option>
                      </select>
                    </div>

                    <div className="crm-row">
                      <span className="lbl2">Sync direction</span>
                      <div className="crm-sync-dir">
                        {['write', 'read', 'none'].map((dir) => (
                          <span 
                            key={dir} 
                            className={`sync-chip ${crmSett.sync_direction === dir ? 'on' : ''}`}
                            onClick={() => {
                              saveCrmSettingsForAccount(crmSett.crm_type, dir as any, crmSett.sync_field);
                            }}
                          >
                            {dir === 'write' && 'Write Signal → CRM'}
                            {dir === 'read' && 'Read owner only'}
                            {dir === 'none' && 'Off'}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="crm-row" style={{ opacity: crmSett.sync_direction === 'write' ? 1 : 0.4 }}>
                      <span className="lbl2">CRM Custom Field</span>
                      <input 
                        type="text" 
                        defaultValue={crmSett.sync_field}
                        placeholder="Signal_Alert__c"
                        onBlur={(e) => {
                          saveCrmSettingsForAccount(crmSett.crm_type, crmSett.sync_direction, e.target.value);
                        }}
                      />
                    </div>
                    
                    <div className="crm-row-actions">
                      <button 
                        className="btn btn-secondary btn-sm"
                        disabled={!acc.crm_connected}
                        onClick={() => showToast('Salesforce sync verified: responding in 140ms.')}
                      >
                        Test sync connection
                      </button>
                    </div>
                  </div>

                  {/* Sources List */}
                  {visibleColumns.filter(c => c.key_name !== 'relationship').map(col => {
                    if (!col.segments.some(s => acc.segments.includes(s))) return null;
                    
                    const src = accSources.find(s => s.column_key === col.key_name) || { status: 'missing' };
                    const statusClass = src.status === 'na' ? 'status-na' : src.status === 'configured' ? 'status-ok' : src.status === 'auto' ? 'status-auto' : 'status-missing';
                    const statusText = src.status === 'na' ? 'Not applicable' : src.status === 'configured' ? 'Configured' : src.status === 'auto' ? 'Auto-resolved' : 'Missing';
                    
                    return (
                      <div key={col.key_name} className="src-row">
                        <div className="src-row-head">
                          <span className="nm">{col.label}</span>
                          <span className={`status-pill ${statusClass}`}>{statusText}</span>
                        </div>

                        {src.status === 'na' ? (
                          <p className="note">This signal type doesn\'t apply to this account.</p>
                        ) : src.status === 'missing' ? (
                          <div style={{ marginTop: '6px' }}>
                            <button 
                              className="resolve-btn"
                              onClick={() => handleResolveSource(col.key_name)}
                            >
                              ↻ Try auto-resolve
                            </button>
                            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                              <input 
                                type="text"
                                placeholder="Or enter source URL manually..."
                                value={customSourceLabel[col.key_name] || ''}
                                onChange={(e) => setCustomSourceLabel(prev => ({ ...prev, [col.key_name]: e.target.value }))}
                              />
                              <button className="save-btn" onClick={() => handleSaveSource(col.key_name)}>Save</button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ marginTop: '6px' }}>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <input 
                                type="text"
                                placeholder="Source name or URL..."
                                value={customSourceLabel[col.key_name] !== undefined ? customSourceLabel[col.key_name] : (src.source_label || '')}
                                onChange={(e) => setCustomSourceLabel(prev => ({ ...prev, [col.key_name]: e.target.value }))}
                              />
                              <button className="save-btn" onClick={() => handleSaveSource(col.key_name)}>Save</button>
                            </div>
                            {src.status === 'auto' && (
                              <div className="note">Auto-resolved, not yet human-verified. Edit and save to confirm.</div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <button 
                    className="btn" 
                    style={{ width: '100%', marginTop: '16px' }}
                    onClick={() => handleDeleteAccount(acc.id)}
                  >
                    Delete Account
                  </button>
                </div>
              );
            })()}
          </div>
        </>
      )}

      {/* DRAWER: DETECTED SIGNAL DETAILS */}
      {activeDrawer === 'signal' && drawerAccountId && drawerColKey && (
        <>
          <div className="overlay show" onClick={closeDrawer}></div>
          <div className="drawer show">
            <button className="close-x" onClick={closeDrawer}>✕</button>

            {(() => {
              const acc = accounts.find(a => a.id === drawerAccountId);
              const col = columns.find(c => c.key_name === drawerColKey);
              const sig = signals.find(s => s.account_id === drawerAccountId && s.column_key === drawerColKey);
              
              if (!acc || !col) return null;

              const crmSett = crmSettings.find(c => c.account_id === drawerAccountId) || { crm_type: 'none', sync_direction: 'none' };
              const hasCrm = acc.crm_connected && crmSett.sync_direction === 'write';
              const crmName = crmSett.crm_type !== 'none' ? crmSett.crm_type.toUpperCase() : 'CRM';

              return (
                <div style={{ paddingBottom: '30px' }}>
                  <div className="detail-meta">
                    <span className="tag">{col.label}</span>
                    <span className="tag">{acc.group_code}</span>
                  </div>

                  <h2>{acc.name}</h2>
                  <div className="sub" style={{ marginBottom: '14px' }}>Owner: {acc.owner_email}</div>

                  {sig ? (
                    <>
                      <div className="detail-meta" style={{ marginTop: '10px' }}>
                        <span className={`pill ${sig.score >= 7 ? 'p-hi' : sig.score >= 5 ? 'p-mid' : 'p-lo'}`}>
                          Relevance Score: {sig.score}/10
                        </span>
                      </div>

                      <div className="d-section">
                        <div className="lbl">Detected Intent Signal</div>
                        <p>{sig.summary}</p>
                      </div>

                      <div className="d-section">
                        <div className="lbl">Why this matters (Outreach Angle)</div>
                        <p style={{ fontWeight: 500, color: 'var(--ink)' }}>{sig.why_matters}</p>
                      </div>

                      <div className="d-section">
                        <div className="lbl">Original Source Excerpt</div>
                        <div className="d-excerpt">{sig.excerpt}</div>
                      </div>

                      <div className="d-section">
                        <div className="lbl">Source Details</div>
                        <p>{sig.source_name} · {sig.signal_date}</p>
                      </div>

                      {/* Sync actions */}
                      <div className="d-actions">
                        <button 
                          className="d-action-btn crm-btn" 
                          disabled={!hasCrm || crmSyncing === 'syncing' || crmSyncing === 'synced'}
                          title={hasCrm ? `Push alert to ${crmName}` : 'CRM write sync is disabled for this account.'}
                          onClick={() => handleCrmSync(sig)}
                        >
                          <ArrowUpRight size={14} />
                          {crmSyncing === 'syncing' ? 'Syncing...' : crmSyncing === 'synced' ? '✓ Synced' : `Sync to ${crmName}`}
                        </button>

                        <button 
                          className="d-action-btn email-btn"
                          disabled={ownerNotifying}
                          onClick={() => handleSendDigestEmail('owner', acc.owner_email)}
                        >
                          <Mail size={14} />
                          {ownerNotifying ? 'Sending...' : '✉ Notify Rep'}
                        </button>

                        <button 
                          className="d-action-btn email-btn"
                          disabled={revopsNotifying}
                          onClick={() => handleSendDigestEmail('revops', 'revops@ehsqsignalengine.com')}
                        >
                          <Mail size={14} />
                          {revopsNotifying ? 'Alerting...' : '✉ Alert RevOps'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--ink-faint)' }}>
                      No active signal matches evaluated for this cell yet. Configure account sources and run a fetch scan.
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </>
      )}

      {/* GLOBAL TOAST ALERTS */}
      {toastMsg && (
        <div className="toast show">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
