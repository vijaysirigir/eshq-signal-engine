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
('spendThisWeek', '28.40'::jsonb),
('syncsToday', '3'::jsonb),
('autoResolvedThisWeek', '9'::jsonb),
('pendingReviewThisWeek', '3'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 11. Insert seed accounts
INSERT INTO accounts (id, name, group_code, is_child, is_customer, segments, owner_email, crm_connected) VALUES
('acme-parent', 'Acme Industrial Group', 'MW', FALSE, TRUE, ARRAY['commercial', 'enterprise'], 'sarah.chen@yourcompany.io', TRUE),
('acme-ops', 'Acme Industrial — Operations Div.', 'MW', TRUE, FALSE, ARRAY['commercial'], 'sarah.chen@yourcompany.io', TRUE),
('meridian', 'Meridian Environmental Services', 'SW', FALSE, FALSE, ARRAY['commercial', 'enterprise'], 'james.wu@yourcompany.io', TRUE),
('westbrook', 'Westbrook Health System', 'SE', FALSE, FALSE, ARRAY['healthcare', 'enterprise'], 'priya.nair@yourcompany.io', TRUE),
('federal-sa', 'Federal Safety Agency', 'FED', FALSE, FALSE, ARRAY['gov'], 'james.wu@yourcompany.io', FALSE),
('apex-ind', 'Apex Industrial — Quality Div.', 'MW', FALSE, FALSE, ARRAY['commercial'], 'sarah.chen@yourcompany.io', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 12. Insert seed account sources
INSERT INTO account_sources (account_id, column_key, status, source_label) VALUES
('acme-parent', 'rfp', 'na', NULL),
('acme-parent', 'enforcement', 'na', NULL),
('acme-parent', 'budget', 'na', NULL),
('acme-parent', 'hiring', 'na', NULL),
('acme-parent', 'accreditation', 'na', NULL),
('acme-ops', 'rfp', 'auto', 'Auto: state procurement portal'),
('acme-ops', 'enforcement', 'configured', 'Regulatory enforcement feed — Acme facilities'),
('acme-ops', 'budget', 'configured', 'Public financial disclosures'),
('acme-ops', 'hiring', 'configured', 'LinkedIn Jobs — Acme Ops'),
('acme-ops', 'accreditation', 'na', NULL),
('meridian', 'rfp', 'configured', 'State procurement portal — Meridian'),
('meridian', 'enforcement', 'configured', 'EPA ECHO — Meridian facilities'),
('meridian', 'budget', 'auto', 'Auto: company financial filings'),
('meridian', 'hiring', 'missing', NULL),
('meridian', 'accreditation', 'na', NULL),
('westbrook', 'rfp', 'configured', 'Regional hospital procurement board'),
('westbrook', 'enforcement', 'configured', 'State health dept enforcement log'),
('westbrook', 'budget', 'auto', 'Auto: hospital financial disclosures'),
('westbrook', 'hiring', 'missing', NULL),
('westbrook', 'accreditation', 'missing', NULL),
('federal-sa', 'rfp', 'configured', 'SAM.gov Opportunities API'),
('federal-sa', 'enforcement', 'na', NULL),
('federal-sa', 'budget', 'configured', 'Federal budget justification docs'),
('federal-sa', 'hiring', 'configured', 'USAJobs.gov API'),
('federal-sa', 'accreditation', 'na', NULL),
('apex-ind', 'rfp', 'auto', 'Auto: state procurement portal'),
('apex-ind', 'enforcement', 'missing', NULL),
('apex-ind', 'budget', 'missing', NULL),
('apex-ind', 'hiring', 'auto', 'Auto: Indeed / LinkedIn Jobs'),
('apex-ind', 'accreditation', 'na', NULL)
ON CONFLICT (account_id, column_key) DO NOTHING;

-- 13. Insert seed CRM settings
INSERT INTO account_crm_settings (account_id, crm_type, sync_direction, sync_field) VALUES
('acme-parent', 'salesforce', 'write', 'Signal_Alert__c'),
('acme-ops', 'salesforce', 'write', 'Signal_Alert__c'),
('meridian', 'salesforce', 'write', 'Signal_Alert__c'),
('westbrook', 'salesforce', 'write', 'Signal_Alert__c'),
('federal-sa', 'none', 'none', ''),
('apex-ind', 'salesforce', 'write', 'Signal_Alert__c')
ON CONFLICT (account_id) DO NOTHING;

-- 14. Insert seed signals
INSERT INTO detected_signals (account_id, column_key, score, signal_date, summary, why_matters, source_name, excerpt) VALUES
('acme-ops', 'budget', 8, '1w ago', 'Acme Industrial Group allocates $3.8M for modernization of operational compliance tracking and reporting infrastructure, replacing legacy case management tools.', 'Modernizing operational compliance and incident tracking is a direct EHSQ software requirement. Sales should target Acme Ops division before formal procurement starts.', 'Public financial disclosures', '"...allocates $3.8M for modernization of operational compliance tracking and reporting infrastructure, replacing legacy case management tools..."'),
('acme-ops', 'hiring', 8, '4d ago', 'Hiring: Compliance Systems Manager to lead modernization of safety and compliance systems.', 'Pairs with the approved $3.8M compliance budget modernization initiative. Reach out directly to this new systems manager to guide their vendor evaluation.', 'LinkedIn Jobs', '"...will lead modernization of the division''s compliance tracking systems, partnering with IT on vendor selection..."'),
('meridian', 'enforcement', 5, '2w ago', 'Meridian cited $2,100 for late incident-report filings.', 'Low dollar amount administrative penalty. Indicates potential workflow gaps in filing, but not yet an urgent enterprise software evaluation trigger.', 'Regulatory enforcement feed', '"...assessed a $2,100 administrative penalty for failure to file timely incident reports within the required window..."'),
('westbrook', 'rfp', 9, '4d ago', 'RFP: Quality Management System (QMS) supporting documentation, audit trail, and corrective actions (CAPA) tracking across regional health facilities.', 'Strong direct fit for Quality management solution. Sales should immediately coordinate response matching Westbrook''s explicit bid timeline.', 'Regional hospital procurement board', '"Westbrook Health seeks a quality management system supporting documentation, audit trail, and corrective action tracking across all regional facilities..."'),
('westbrook', 'enforcement', 9, '6d ago', 'State health audit issues $26,000 compliance penalty for inadequate records management and audit trail.', 'This fine occurred a few days before Westbrook issued the QMS RFP. The combination of a recent audit fine and an active RFP indicates extreme urgency and budget approval.', 'State health dept enforcement log', '"...enforcement action cites inadequate records management and audit trail at a regional health facility..."'),
('federal-sa', 'rfp', 9, '2d ago', 'Federal Safety Agency posted a sources-sought notice for cloud-based incident and injury tracking software across regional offices.', 'This maps strongly to EHSQ use cases such as incident management, OSHA reporting, workflow automation, and audit-ready documentation. Sales should respond before the RFI deadline and use the outreach angle: modernizing injury tracking and compliance reporting before formal RFP requirements are locked.', 'SAM.gov', '"Agency seeks information from vendors offering cloud-based incident tracking systems capable of log automation across regional offices..."'),
('federal-sa', 'hiring', 7, '1w ago', 'Hiring: Safety & Compliance Technology Specialist to support regional compliance system modernization.', 'Perfect operational pairing with the active incident tracking software sources-sought notice. The candidate will help run the new software.', 'USAJobs.gov', '"...supporting a new compliance technology modernization initiative across regional field offices..."'),
('apex-ind', 'accreditation', 7, '5d ago', 'ISO 45001 safety recertification audit window opening in Q3.', 'Recertification prep is the prime window to sell audit management and corrective action tracking (CAPA) software, as manual documentation becomes a major risk.', 'ISO body public schedule', '"...the triennial recertification audit window for this facility opens in the third quarter, requiring updated documentation and corrective action readiness..."')
ON CONFLICT (account_id, column_key) DO NOTHING;

-- 15. Insert seed knowledge base
INSERT INTO knowledge_base (id, title, source_type, description, excerpt, frequency_lbl, updated_at) VALUES
('kb-site', 'Website', 'website', 'ehsq-signal-engine.io — 42 pages crawled', '"EHSQ Signal Engine unifies signal detection, account intelligence, and pipeline triggers for revenue teams targeting safety-critical, regulated, and compliance-driven buyers across commercial, enterprise, and public-sector verticals..."', 'Re-crawled weekly', '3d ago'),
('kb-reviews', 'Reviews', 'reviews', 'Pasted excerpts — G2 / Capterra', '"Buyers consistently cite ease of standardizing safety workflows across sites and departments, and audit-readiness for regulatory inspections, as top reasons for adoption..."', '18 excerpts', '1w ago'),
('kb-comm', 'Community', 'community', 'Pasted excerpts — practitioner forums and LinkedIn groups', '"Teams across regulated industries discuss disconnected, spreadsheet-based workflows ahead of audits and renewal cycles, frequently citing budget approvals as the trigger to evaluate alternatives..."', '12 excerpts', '1w ago')
ON CONFLICT (id) DO NOTHING;
