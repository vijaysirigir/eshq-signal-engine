-- Supabase SQL Database Schema Setup for EHSQ Signal Engine
-- Copy and paste this script directly into your Supabase project's SQL Editor (https://supabase.com) and click Run.

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Accounts Table
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    group_code TEXT NOT NULL,
    is_child BOOLEAN DEFAULT FALSE,
    is_customer BOOLEAN DEFAULT FALSE,
    segments TEXT[] NOT NULL DEFAULT '{}',
    owner_email TEXT NOT NULL,
    crm_connected BOOLEAN DEFAULT FALSE
);

-- 2. Signal Columns Table
CREATE TABLE IF NOT EXISTS signal_columns (
    key_name TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    has_prompt BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    prompt TEXT NOT NULL,
    source_type TEXT NOT NULL,
    context_depth BOOLEAN DEFAULT FALSE,
    threshold INTEGER NOT NULL DEFAULT 6,
    budget INTEGER NOT NULL DEFAULT 5,
    cadence TEXT NOT NULL,
    segments TEXT[] NOT NULL DEFAULT '{}'
);

-- 3. Account Sources Table
CREATE TABLE IF NOT EXISTS account_sources (
    account_id TEXT NOT NULL,
    column_key TEXT NOT NULL,
    status TEXT NOT NULL,
    source_label TEXT,
    PRIMARY KEY (account_id, column_key)
);

-- 4. Detected Signals Table
CREATE TABLE IF NOT EXISTS detected_signals (
    account_id TEXT NOT NULL,
    column_key TEXT NOT NULL,
    score INTEGER NOT NULL,
    signal_date TEXT NOT NULL,
    summary TEXT NOT NULL,
    why_matters TEXT NOT NULL,
    source_name TEXT NOT NULL,
    excerpt TEXT NOT NULL,
    PRIMARY KEY (account_id, column_key)
);

-- 5. Account CRM Settings Table
CREATE TABLE IF NOT EXISTS account_crm_settings (
    account_id TEXT PRIMARY KEY,
    crm_type TEXT NOT NULL,
    sync_direction TEXT NOT NULL,
    sync_field TEXT
);

-- 6. Knowledge Base Table
CREATE TABLE IF NOT EXISTS knowledge_base (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    source_type TEXT NOT NULL,
    description TEXT NOT NULL,
    excerpt TEXT NOT NULL,
    frequency_lbl TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 7. Admin Settings Table
CREATE TABLE IF NOT EXISTS admin_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL
);

-- 8. Salesforce Sync Logs Table
CREATE TABLE IF NOT EXISTS salesforce_sync_logs (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    signal_id TEXT NOT NULL,
    synced_at TEXT NOT NULL,
    status TEXT NOT NULL,
    log_details TEXT NOT NULL
);

-- 9. Insert default signal columns
INSERT INTO signal_columns (key_name, label, has_prompt, is_active, prompt, source_type, context_depth, threshold, budget, cadence, segments) VALUES
('rfp', 'RFP / Tender', TRUE, TRUE, 'Score 1-10: does this notice describe a software RFP/RFI for EHSQ/ESHQ solutions (safety, compliance, quality, audit, incident tracking)? Cite notice ID and issuing organization.', 'api', FALSE, 7, 10, 'Daily', ARRAY['commercial', 'enterprise', 'gov', 'healthcare']),
('enforcement', 'Enforcement / Fines', TRUE, TRUE, 'Identify enforcement actions against the account''s own facilities. Score severity 1-10 and note if it represents an EHSQ risk (OSHA, EPA citations) that safety software could prevent.', 'api', TRUE, 6, 10, 'Weekly', ARRAY['commercial', 'enterprise', 'gov', 'healthcare']),
('budget', 'Budget signal', TRUE, TRUE, 'Extract any budget line item referencing compliance, safety, environmental, quality, or technology modernization. Score 1-10 on dollar amount and EHSQ systems relevance.', 'websearch', TRUE, 7, 8, 'Monthly', ARRAY['commercial', 'enterprise', 'gov', 'healthcare']),
('hiring', 'Hiring', TRUE, TRUE, 'Score 1-10: does this job posting indicate investment in EHSQ (e.g. Director of Safety, Environmental Compliance Lead, EHSQ Administrator)? Note stated tech initiatives.', 'api', FALSE, 6, 6, 'Every 3 days', ARRAY['commercial', 'enterprise', 'gov', 'healthcare']),
('relationship', 'Relationship', FALSE, TRUE, '(Deterministic) Match account against CRM database. No LLM query.', 'crm', FALSE, 0, 2, 'Monthly', ARRAY['commercial', 'enterprise', 'gov', 'healthcare']),
('accreditation', 'Accreditation cycle', TRUE, TRUE, 'Score 1-10: does this indicate an upcoming accreditation survey (like ISO 45001, Joint Commission) creating urgency for audit-ready documentation systems?', 'websearch', TRUE, 6, 5, 'Monthly', ARRAY['healthcare', 'commercial', 'enterprise'])
ON CONFLICT (key_name) DO NOTHING;

-- 10. Insert default admin settings
INSERT INTO admin_settings (key, value) VALUES
('modelSpeed', '"standard"'::jsonb),
('resolverEnabled', 'true'::jsonb),
('outputCrmEnabled', 'true'::jsonb),
('outputOwnerEnabled', 'true'::jsonb),
('outputRevopsEnabled', 'true'::jsonb),
('revopsEmail', '"revops@ehsqsignalengine.com"'::jsonb),
('spendThisWeek', '0.00'::jsonb),
('syncsToday', '0'::jsonb),
('autoResolvedThisWeek', '0'::jsonb),
('pendingReviewThisWeek', '0'::jsonb)
ON CONFLICT (key) DO NOTHING;
