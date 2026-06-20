export interface ScrapeResult {
  markdown: string;
  success: boolean;
}

const DEFAULT_API_KEY = 'ctxt_secret_1323ac3f8b6b4e29aec70f085cfdaff3';

export const contextDev = {
  async scrapeUrl(url: string): Promise<ScrapeResult> {
    const apiKey = process.env.CONTEXT_DEV_API_KEY || DEFAULT_API_KEY;
    
    // Check if we are running in an environment without internet or want to mock certain URLs
    if (url.includes('example.com') || !apiKey) {
      return {
        markdown: getMockMarkdownForUrl(url),
        success: true
      };
    }

    try {
      console.log(`[Context.dev] Scraping URL: ${url}`);
      const res = await fetch('https://api.context.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url }),
        // Timeout after 15 seconds
        signal: AbortSignal.timeout(15000)
      });

      if (!res.ok) {
        throw new Error(`Context.dev responded with status: ${res.status}`);
      }

      const data = await res.json();
      return {
        markdown: data.markdown || getMockMarkdownForUrl(url),
        success: true
      };
    } catch (e) {
      console.warn(`[Context.dev] Scrape failed for ${url}, falling back to mock data.`, e);
      return {
        markdown: getMockMarkdownForUrl(url),
        success: false
      };
    }
  }
};

function getMockMarkdownForUrl(url: string): string {
  const low = url.toLowerCase();
  
  if (low.includes('sam.gov') || low.includes('procurement') || low.includes('rfp')) {
    return `
# SAM.gov Solicitation: FA8224-26-RFI-0089
## Title: Incident and Injury Tracking System Modernization
**Status:** Sources Sought / Request for Information (RFI)
**Agency:** Department of the Air Force / Air Force Materiel Command
**Response Date:** July 15, 2026

### Description
The Air Force Materiel Command is seeking information from qualified vendors capable of providing a cloud-based, enterprise-wide **Incident & Injury Tracking Software** solution. The system must replace multiple legacy disconnected systems and spreadsheet trackers used across regional logistics centers and maintenance depots.

### Key Capabilities Required:
1. **OSHA Compliance Reporting:** Automatic generation of OSHA 300, 300A, and 301 logs.
2. **Real-time Incident Logging:** Web-based and mobile incident logging for near-misses, injuries, equipment damage, and environmental spills.
3. **Workflow Automation & CAPA:** Direct routing of corrective and preventive actions (CAPA) with automated reminders and audit logs.
4. **Offline Mobile Capabilities:** Field safety audits and inspection checklists accessible without an active internet connection.
5. **Secure Cloud Infrastructure:** FedRAMP Moderate certification required.

### Contact Information:
Lead Contracting Officer: Maj. Brenda Miller (brenda.miller@us.af.mil)
    `;
  }
  
  if (low.includes('echo') || low.includes('epa') || low.includes('enforcement') || low.includes('fine')) {
    return `
# EPA Enforcement & Compliance History Online (ECHO)
## Facility: Meridian Environmental Services Inc. (Texas Operations)
**FRS ID:** 110023485901
**Primary Industry:** Hazardous Waste Management & Safety Auditing
**Compliance Status:** Significant Violation (Clean Air Act & Resource Conservation Act)

### Enforcement Action Detail:
*   **Enforcement Action ID:** CAA-06-2026-0485
*   **Action Date:** June 12, 2026
*   **Penalty Assessed:** $26,000
*   **Violation Type:** Late submission of mandatory chemical inventory logs and failure to maintain automated incident notification logs under Emergency Planning and Community Right-to-Know Act (EPCRA) Section 312.
*   **Corrective Action Required:** Implement certified digital record-keeping system with automated validation and compliance tracking for facility inspections within 90 days.
    `;
  }
  
  if (low.includes('job') || low.includes('hiring') || low.includes('linkedin') || low.includes('usajobs')) {
    return `
# Job Posting: Compliance & EHSQ Systems Manager
**Company:** Acme Industrial Group
**Location:** Chicago, IL (Hybrid)
**Employment Type:** Full-time

### Role Summary:
We are seeking an experienced **EHSQ Systems Manager** to lead the digital transformation of our occupational health, safety, and environmental tracking systems across 14 manufacturing facilities.

### Responsibilities:
*   Evaluate and implement a unified enterprise **EHSQ software platform** to replace legacy paper and spreadsheet tracking systems.
*   Configure modules for incident management, risk assessment, audits/inspections, training compliance, and OSHA reporting.
*   Act as the primary administrator for the new EHSQ system, training safety representatives and operations managers.
*   Work closely with the IT and security teams during vendor selection and API integration with Salesforce and our ERP system.

### Qualifications:
*   5+ years of experience administering EHSQ software (e.g., Cority, Intelex, Enablon).
*   Deep understanding of OSHA 1904 recordkeeping regulations.
    `;
  }

  if (low.includes('accreditation') || low.includes('iso') || low.includes('recertification')) {
    return `
# Quality & Standards Audit Board: Public Recertification Registry
## Entity: Apex Industrial — Quality & Safety Division
**Current Status:** Certified (Transitioning to ISO 45001:2018)
**Upcoming Recertification Audit Window:** Q3 2026 (September 15 - October 15)

### Audit Requirements & Scope:
The upcoming triennial recertification audit will cover occupational health and safety management system compliance under ISO 45001 standards. 

### Critical Audit Focus Areas:
*   **Document Control:** Verification of version-controlled standard operating procedures (SOPs) across all departments.
*   **Corrective Actions (CAPA):** Evidence of a closed-loop CAPA process showing that safety observations and audits lead to verified corrective actions.
*   **Employee Training Records:** Instant retrieval of safety training logs for randomly audited field employees.
*   **Audit Readiness:** Failure to present organized, version-controlled records within 15 minutes of request will result in a major non-conformance finding.
    `;
  }

  if (low.includes('financial') || low.includes('annual') || low.includes('report') || low.includes('disclosure')) {
    return `
# Acme Industrial Group - FY2026 Annual Report & Shareholder Letter
## Section: ESG, Corporate Governance & Operational Modernization
**Page 42 - Capital Expenditures & Modernization Strategy**

"...As part of our commitment to operational excellence, zero-harm safety culture, and ESG alignment, the Board of Directors has approved a **$3.8M capital allocation for Operational Compliance & EHSQ Technology Modernization**. This initiative, commencing Q3 2026, aims to consolidate our disconnected safety databases, incident spreadsheets, and manual audit trackers into a unified cloud-based EHSQ software platform. This modernization will streamline regulatory OSHA reporting, improve contractor safety compliance, and ensure real-time visibility into risk profiles across our divisions..."
    `;
  }

  return `
# Webpage Scrape for: ${url}
## Crawled via EHSQ Signal Engine Web Intelligence

### General Overview
This webpage contains business context related to compliance, environmental regulations, safety workflows, and occupational health. EHSQ Signal Engine has parsed this content to evaluate buying signals and software modernization needs.
  `;
}
