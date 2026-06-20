import Link from 'next/link';

export default function Home() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* HEADER */}
      <header className="topnav">
        <div className="brand">
          <span className="brand-dot"></span>
          EHSQ Signal Engine
          <span>Intelligence Console</span>
        </div>
        <div className="top-actions">
          <Link href="/dashboard" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
            Launch Console →
          </Link>
        </div>
      </header>

      {/* HERO SECTION */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <section className="landing-hero">
          <h1 className="landing-title">
            Identify and Capture <span>EHSQ buying intent</span> before your competition does.
          </h1>
          <p className="landing-subtitle">
            EHSQ Signal Engine is an opportunity intelligence platform that monitors government RFPs, regulatory enforcement actions, public budgets, and hiring signals to detect buying triggers for environmental, health, safety, and quality solutions.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px' }}>
            <Link href="/dashboard" className="landing-cta" style={{ textDecoration: 'none' }}>
              Launch Console →
            </Link>
          </div>
        </section>

        {/* FEATURES GRID */}
        <section className="landing-grid">
          <div className="landing-card">
            <h3>Daily Signal Matrix</h3>
            <p>
              A spreadsheet-style matrix consolidating active opportunities across targeted accounts. Track RFP/RFI feeds, enforcement logs, hiring actions, and accreditation surveys on automated schedules.
            </p>
          </div>
          <div className="landing-card">
            <h3>AI Triage & Relevance Scoring</h3>
            <p>
              Powered by multi-tier intelligence. The platform polls public sources for free, runs initial triage with fast models, and performs deep verification on high-scoring signals to minimize noise.
            </p>
          </div>
          <div className="landing-card">
            <h3>Salesforce Sync & Actionable Insights</h3>
            <p>
              Sync validated insights directly into Salesforce as task alerts, notes, or opportunity objects. Automatically generate sales conversation angles explaining what EHSQ problem was triggered and how to position.
            </p>
          </div>
        </section>

        {/* DOMAIN COVERAGE SECTION */}
        <section style={{ maxWidth: '900px', margin: '40px auto 80px', padding: '0 20px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--navy)', marginBottom: '24px' }}>
            Monitored EHSQ & ESG Solution Areas
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
            {[
              'Environmental Management', 'Health and Safety', 'OSHA Reporting', 'Injury Tracking',
              'Audit Management', 'Inspection Management', 'Corrective Actions (CAPA)', 'Quality Management (QMS)',
              'ESG & Sustainability', 'Contractor Safety', 'Industrial Hygiene', 'Permit Management'
            ].map(domain => (
              <span key={domain} className="tag" style={{ fontSize: '11px', padding: '6px 12px', background: 'var(--bg-soft)', borderRadius: '15px' }}>
                {domain}
              </span>
            ))}
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid var(--line)', padding: '24px 36px', textAlign: 'center', background: 'var(--bg-soft)' }}>
        <p style={{ fontSize: '11.5px', color: 'var(--ink-faint)', margin: 0 }}>
          © {new Date().getFullYear()} EHSQ Signal Engine. Business Insights for Government RFPs, Market Signals, and Sales Intelligence.
        </p>
      </footer>
    </div>
  );
}
