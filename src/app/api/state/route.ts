import { NextRequest, NextResponse } from 'next/server';
import { dbStore, Account, SignalColumn, AccountSource, CrmSettings } from '../../../lib/db-store';

export async function GET() {
  try {
    const accounts = await dbStore.getAccounts();
    const columns = await dbStore.getColumns();
    const sources = await dbStore.getSources();
    const signals = await dbStore.getSignals();
    const crmSettings = await dbStore.getCrmSettings();
    const knowledgeBase = await dbStore.getKnowledgeBase();
    const adminSettings = await dbStore.getAdminSettings();
    const crmSyncLogs = await dbStore.getCrmSyncLogs();

    return NextResponse.json({
      accounts,
      columns,
      sources,
      signals,
      crmSettings,
      knowledgeBase,
      adminSettings,
      crmSyncLogs
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'save_column') {
      const { column } = body;
      await dbStore.saveColumn(column);
      return NextResponse.json({ success: true });
    }

    if (action === 'save_source') {
      const { source } = body;
      await dbStore.saveSource(source);
      return NextResponse.json({ success: true });
    }

    if (action === 'save_crm_settings') {
      const { settings } = body;
      await dbStore.saveCrmSettings(settings);
      // Update account status too
      const accounts = await dbStore.getAccounts();
      const account = accounts.find(a => a.id === settings.account_id);
      if (account) {
        account.crm_connected = settings.crm_type !== 'none' && settings.sync_direction !== 'none';
        await dbStore.saveAccount(account);
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'save_admin_setting') {
      const { key, value } = body;
      await dbStore.saveAdminSetting(key, value);
      return NextResponse.json({ success: true });
    }

    if (action === 'delete_account') {
      const { id } = body;
      await dbStore.deleteAccount(id);
      return NextResponse.json({ success: true });
    }

    if (action === 'bulk_delete_accounts') {
      const { ids } = body;
      await dbStore.bulkDeleteAccounts(ids);
      return NextResponse.json({ success: true });
    }

    if (action === 'upload_csv') {
      const { csvContent } = body;
      const lines = csvContent.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);
      let added = 0;
      let resolved = 0;
      let gaps = 0;

      const columns = await dbStore.getColumns();

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const parts = line.split(',').map((p: string) => p.trim());
        const name = parts[0];
        if (!name || ['name', 'account', 'company'].includes(name.toLowerCase())) continue;
        
        const group_code = parts[1] || 'UPLOADED';
        const segmentsStr = parts[2] || 'commercial';
        const segments = segmentsStr.toLowerCase().split(';').map((s: string) => s.trim());
        const owner_email = parts[3] || 'sales.operations@ehsqsignalengine.com';
        
        const id = `csv-${Date.now()}-${i}`;
        
        const newAccount: Account = {
          id,
          name,
          group_code,
          is_child: false,
          is_customer: false,
          segments,
          owner_email,
          crm_connected: false
        };

        await dbStore.saveAccount(newAccount);

        // Configure default CRM setting
        const newCrm: CrmSettings = {
          account_id: id,
          crm_type: 'none',
          sync_direction: 'none',
          sync_field: ''
        };
        await dbStore.saveCrmSettings(newCrm);

        // Resolve sources automatically or mark as missing
        for (const col of columns) {
          if (col.key_name === 'relationship') continue;
          
          const applies = col.segments.some(s => segments.includes(s));
          if (!applies) {
            const src: AccountSource = {
              account_id: id,
              column_key: col.key_name,
              status: 'na'
            };
            await dbStore.saveSource(src);
            continue;
          }

          // Auto-resolve simulation (75% success)
          const autoSuccess = Math.random() < 0.75;
          if (autoSuccess) {
            const src: AccountSource = {
              account_id: id,
              column_key: col.key_name,
              status: 'auto',
              source_label: `Auto-resolved via EHSQ web search for ${name}`
            };
            await dbStore.saveSource(src);
            resolved++;
          } else {
            const src: AccountSource = {
              account_id: id,
              column_key: col.key_name,
              status: 'missing'
            };
            await dbStore.saveSource(src);
            gaps++;
          }
        }
        added++;
      }

      // Update resolved stats in admin settings
      const admin = await dbStore.getAdminSettings();
      const currentAuto = parseInt(admin.autoResolvedThisWeek || '0');
      const currentPending = parseInt(admin.pendingReviewThisWeek || '0');
      await dbStore.saveAdminSetting('autoResolvedThisWeek', currentAuto + resolved);
      await dbStore.saveAdminSetting('pendingReviewThisWeek', currentPending + gaps);

      return NextResponse.json({
        success: true,
        added,
        resolved,
        gaps,
        message: `${added} accounts added — ${resolved} sources auto-resolved, ${gaps} need manual review.`
      });
    }

    return NextResponse.json({ error: 'invalid action' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
