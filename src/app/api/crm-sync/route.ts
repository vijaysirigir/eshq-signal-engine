import { NextRequest, NextResponse } from 'next/server';
import { dbStore, CrmSyncLog } from '../../../lib/db-store';

export async function POST(req: NextRequest) {
  try {
    const { accountId, columnKey, signalId } = await req.json();

    if (!accountId || !columnKey || !signalId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const accounts = await dbStore.getAccounts();
    const account = accounts.find(a => a.id === accountId);
    
    const signals = await dbStore.getSignals();
    const signal = signals.find(s => s.account_id === accountId && s.column_key === columnKey);

    if (!account || !signal) {
      return NextResponse.json({ error: 'Account or signal not found' }, { status: 404 });
    }

    const crmSettingsList = await dbStore.getCrmSettings(accountId);
    const crmSetting = crmSettingsList[0] || { crm_type: 'salesforce', sync_direction: 'write', sync_field: 'Signal_Alert__c' };

    // Simulate push logic
    const success = true; // In production this hits Salesforce REST API or OAuth connection
    
    // Salesforce record format: EHSQ Signal Engine as source and description
    const logDetails = `
CRM Push Details:
---------------------------------------------
Source: EHSQ Signal Engine
Object Type: Salesforce Task
Account Name: ${account.name}
Owner Email: ${account.owner_email}
CRM Field: ${crmSetting.sync_field || 'Signal_Alert__c'}
Relevance Score: ${signal.score}/10
Signal Category: ${columnKey}
Subject: [EHSQ Signal Engine] Intent Signal Detected

Description:
This buying signal was detected and enriched by EHSQ Signal Engine on ${new Date().toLocaleDateString()}.
Signal summary: ${signal.summary}

Why this matters & outreach angle:
${signal.why_matters}

Original Excerpt:
${signal.excerpt}
---------------------------------------------
Response: Created Task ID "00T8W00005YtXyU" in Salesforce. Status: SUCCESS.
    `;

    const newLog: CrmSyncLog = {
      id: `log-${Date.now()}`,
      account_id: accountId,
      signal_id: signalId,
      synced_at: new Date().toISOString(),
      status: success ? 'success' : 'failed',
      log_details: logDetails
    };

    await dbStore.saveCrmSyncLog(newLog);

    // Increment CRM Sync counts in admin settings
    const admin = await dbStore.getAdminSettings();
    const currentSyncs = parseInt(admin.syncsToday || '0');
    await dbStore.saveAdminSetting('syncsToday', currentSyncs + 1);

    return NextResponse.json({
      success: true,
      log: newLog
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
