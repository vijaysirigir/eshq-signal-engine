import { NextRequest, NextResponse } from 'next/server';
import { dbStore } from '../../../lib/db-store';

export async function POST(req: NextRequest) {
  try {
    const { type, recipientEmail } = await req.json();

    if (!type) {
      return NextResponse.json({ error: 'Missing digest type' }, { status: 400 });
    }

    const email = recipientEmail || 'operations@ehsqsignalengine.com';

    // Simulate sending digest
    let subject = '';
    let body = '';

    if (type === 'revops') {
      subject = `[EHSQ Signal Engine] Daily RevOps Opportunity Digest`;
      body = `
<html>
<body style="font-family: Arial, sans-serif; color: #16213A; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="border-bottom: 2px solid #FF6B00; padding-bottom: 10px; margin-bottom: 20px;">
    <h2 style="color: #FF6B00; margin: 0;">EHSQ Signal Engine</h2>
    <p style="font-size: 12px; color: #5B6478; margin: 5px 0 0 0;">Business Insights for Government RFPs, Market Signals, and Sales Intelligence</p>
  </div>
  
  <p>Hello RevOps Team,</p>
  <p>Here is your daily summary of high-relevance EHSQ signals detected across all target accounts:</p>
  
  <div style="background-color: #F8F9FA; border-left: 4px solid #0084FF; padding: 15px; margin-bottom: 15px; border-radius: 4px;">
    <h3 style="margin-top: 0; color: #1F3A5F;">Federal Safety Agency</h3>
    <p style="margin: 5px 0; font-size: 13px;"><strong>Signal:</strong> RFP / Tender (Score: 9/10)</p>
    <p style="margin: 5px 0; font-size: 13px;"><strong>Details:</strong> RFI posted for Incident & Injury Tracking Software across regional maintenance hubs.</p>
    <p style="margin: 5px 0; font-size: 13px; color: #5B6478;"><strong>Sales Outreach Angle:</strong> Modernize safety reporting workflows before formal RFP specifications are locked.</p>
  </div>

  <div style="background-color: #F8F9FA; border-left: 4px solid #0084FF; padding: 15px; margin-bottom: 15px; border-radius: 4px;">
    <h3 style="margin-top: 0; color: #1F3A5F;">Westbrook Health System</h3>
    <p style="margin: 5px 0; font-size: 13px;"><strong>Signal:</strong> Quality Management RFP (Score: 9/10)</p>
    <p style="margin: 5px 0; font-size: 13px;"><strong>Details:</strong> QMS tender issued following a $26,000 state audit records compliance fine.</p>
    <p style="margin: 5px 0; font-size: 13px; color: #5B6478;"><strong>Sales Outreach Angle:</strong> Focus on audit-ready document controls and closed-loop CAPA workflows.</p>
  </div>

  <p style="margin-top: 30px; font-size: 12px; color: #9AA3B2;">
    This digest is generated automatically by the EHSQ Signal Engine. To configure alert settings, visit the <a href="#" style="color: #FF6B00;">Admin Dashboard</a>.
  </p>
</body>
</html>
      `;
    } else {
      subject = `[EHSQ Signal Engine] Your Daily Account Alert Digest`;
      body = `
<html>
<body style="font-family: Arial, sans-serif; color: #16213A; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="border-bottom: 2px solid #FF6B00; padding-bottom: 10px; margin-bottom: 20px;">
    <h2 style="color: #FF6B00; margin: 0;">EHSQ Signal Engine</h2>
    <p style="font-size: 12px; color: #5B6478; margin: 5px 0 0 0;">Sales Intelligence Account Alert</p>
  </div>
  
  <p>Hello Account Owner,</p>
  <p>A new high-priority buying signal has been detected on one of your assigned accounts:</p>
  
  <div style="background-color: #F8F9FA; border-left: 4px solid #FF6B00; padding: 15px; margin-bottom: 15px; border-radius: 4px;">
    <h3 style="margin-top: 0; color: #1F3A5F;">Acme Industrial Group (Operations Division)</h3>
    <p style="margin: 5px 0; font-size: 13px;"><strong>Signal:</strong> Budget Signal (Score: 8/10)</p>
    <p style="margin: 5px 0; font-size: 13px;"><strong>Details:</strong> approved capital budget allocation of $3.8M for compliance modernization.</p>
    <p style="margin: 5px 0; font-size: 13px; color: #5B6478;"><strong>Sales Outreach Angle:</strong> Target safety operations leaders directly now that budget is allocated, ahead of the formal procurement cycle.</p>
  </div>

  <p style="margin-top: 30px; font-size: 12px; color: #9AA3B2;">
    This alert was triggered by EHSQ Signal Engine. Sync directly to your CRM from the <a href="#" style="color: #FF6B00;">Signal Matrix Console</a>.
  </p>
</body>
</html>
      `;
    }

    console.log(`[EHSQ Signal Engine] E-mail digest sent to ${email} (Type: ${type})`);

    return NextResponse.json({
      success: true,
      message: `Digest email sent successfully.`,
      subject,
      recipient: email
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
