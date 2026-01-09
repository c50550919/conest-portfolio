const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        Header, Footer, AlignmentType, LevelFormat, HeadingLevel, BorderStyle,
        WidthType, ShadingType, VerticalAlign, PageNumber, PageBreak } = require('docx');
const fs = require('fs');

const COLORS = { primary: "1E3A5F", secondary: "FF6B35", accent: "4A90A4", dark: "2C3E50", light: "F8F9FA", white: "FFFFFF", black: "000000" };
const tableBorder = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const cellBorders = { top: tableBorder, bottom: tableBorder, left: tableBorder, right: tableBorder };

const numberingConfig = {
  config: [
    { reference: "bullet-list", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    { reference: "numbered-list", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    { reference: "bullet-2", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    { reference: "bullet-3", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    { reference: "bullet-4", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    { reference: "bullet-5", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    { reference: "bullet-6", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    { reference: "bullet-7", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    { reference: "numbered-2", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }
  ]
};

const bullet = (text, ref = "bullet-list") => new Paragraph({ numbering: { reference: ref, level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text, size: 22, font: "Arial" })] });
const numbered = (text, ref = "numbered-list") => new Paragraph({ numbering: { reference: ref, level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text, size: 22, font: "Arial" })] });
const body = (text, spacing = { after: 180 }) => new Paragraph({ spacing, children: [new TextRun({ text, size: 22, font: "Arial" })] });
const subhead = (text) => new Paragraph({ spacing: { before: 280, after: 120 }, children: [new TextRun({ text, bold: true, size: 24, font: "Arial", color: COLORS.accent })] });

function table(headers, rows, widths) {
  const hCells = headers.map((h, i) => new TableCell({
    borders: cellBorders, width: { size: widths[i], type: WidthType.DXA },
    shading: { fill: COLORS.primary, type: ShadingType.CLEAR }, verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({ alignment: i === 0 ? AlignmentType.LEFT : AlignmentType.RIGHT,
      children: [new TextRun({ text: h, bold: true, size: 20, color: COLORS.white, font: "Arial" })] })]
  }));
  const dRows = rows.map((row, ri) => new TableRow({
    children: row.map((cell, ci) => new TableCell({
      borders: cellBorders, width: { size: widths[ci], type: WidthType.DXA },
      shading: { fill: ri % 2 === 0 ? COLORS.light : COLORS.white, type: ShadingType.CLEAR },
      children: [new Paragraph({ alignment: ci === 0 ? AlignmentType.LEFT : AlignmentType.RIGHT,
        children: [new TextRun({ text: cell, size: 20, font: "Arial" })] })]
    }))
  }));
  return new Table({ columnWidths: widths, rows: [new TableRow({ tableHeader: true, children: hCells }), ...dRows] });
}

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Title", name: "Title", basedOn: "Normal", run: { size: 56, bold: true, color: COLORS.primary, font: "Arial" }, paragraph: { spacing: { after: 120 }, alignment: AlignmentType.CENTER } },
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 36, bold: true, color: COLORS.primary, font: "Arial" }, paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 28, bold: true, color: COLORS.dark, font: "Arial" }, paragraph: { spacing: { before: 300, after: 150 }, outlineLevel: 1 } },
    ]
  },
  numbering: numberingConfig,
  sections: [{
    properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [
      new TextRun({ text: "CoNest Business Plan ", size: 20, color: COLORS.dark, font: "Arial" }),
      new TextRun({ text: "| ", size: 20, color: COLORS.accent, font: "Arial" }),
      new TextRun({ text: "CONFIDENTIAL", size: 20, italics: true, color: COLORS.secondary, font: "Arial" })
    ] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
      new TextRun({ text: "Page ", size: 20, font: "Arial" }), new TextRun({ children: [PageNumber.CURRENT], size: 20, font: "Arial" }),
      new TextRun({ text: " of ", size: 20, font: "Arial" }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 20, font: "Arial" })
    ] })] }) },
    children: [
      // COVER PAGE
      new Paragraph({ spacing: { before: 2000 } }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: "CoNest", size: 72, bold: true, color: COLORS.primary, font: "Arial" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 }, children: [new TextRun({ text: "Safe Housing for Single Parents", size: 32, italics: true, color: COLORS.accent, font: "Arial" })] }),
      new Paragraph({ spacing: { before: 400 } }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "BUSINESS PLAN", size: 48, bold: true, color: COLORS.dark, font: "Arial" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 400 }, children: [new TextRun({ text: "Operations Order (OPORD) Format", size: 24, color: COLORS.accent, font: "Arial" })] }),
      new Paragraph({ spacing: { before: 600 } }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "$500,000 Seed Round", size: 36, bold: true, color: COLORS.secondary, font: "Arial" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200 }, children: [new TextRun({ text: "24+ Month Runway | Break-Even Month 10 | Series A Ready Month 18", size: 22, font: "Arial" })] }),
      new Paragraph({ spacing: { before: 800 } }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Fiscal Year 2026", size: 28, bold: true, font: "Arial" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80 }, children: [new TextRun({ text: "Prepared: January 2026", size: 22, font: "Arial" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 300 }, children: [new TextRun({ text: "CONFIDENTIAL - FOR INVESTOR REVIEW ONLY", size: 20, bold: true, color: COLORS.secondary, font: "Arial" })] }),

      new Paragraph({ children: [new PageBreak()] }),

      // TABLE OF CONTENTS
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Table of Contents")] }),
      new Paragraph({ spacing: { after: 200 } }),
      body("PARAGRAPH 1: SITUATION (Executive Summary & Business Description)...............3"),
      body("PARAGRAPH 2: MISSION (Market Analysis & Opportunity)...............................7"),
      body("PARAGRAPH 3: EXECUTION (Marketing, Sales & Operations)..........................11"),
      body("PARAGRAPH 4: SERVICE & SUPPORT (Team & Financials).............................15"),
      body("PARAGRAPH 5: COMMAND & SIGNAL (Governance & Resources)....................21"),

      new Paragraph({ children: [new PageBreak()] }),

      // PARAGRAPH 1: SITUATION
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("PARAGRAPH 1: SITUATION")] }),
      new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: "Executive Summary & Business Description", italics: true, size: 24, color: COLORS.accent, font: "Arial" })] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("1.1 Executive Summary")] }),
      body("CoNest is a technology platform solving the housing affordability crisis for single parents through verified, safe shared housing. By combining identity verification (Veriff), background checks (Certn), and intelligent compatibility matching, CoNest enables single parents to reduce housing costs by 30-50% while maintaining the highest safety standards."),

      subhead("The Opportunity"),
      body("Over 10 million single-parent households in the United States spend more than 40% of their income on housing. Traditional roommate services fail to address the unique safety concerns of parents with children. CoNest fills this gap with a purpose-built platform prioritizing child safety above all else."),

      subhead("Investment Highlights"),
      table(
        ["Metric", "Value"],
        [
          ["Target Market", "10.2M single-parent households (US)"],
          ["Serviceable Market (2 cities)", "1.4M single-parent households"],
          ["Seed Round", "$500,000"],
          ["Use of Funds", "Team (57%), Marketing (16%), Ops (11%), Reserve (16%)"],
          ["Runway", "24 months (base) / 30+ months (conservative)"],
          ["Break-Even", "Month 10"],
          ["Y1 Verified Users", "5,980"],
          ["Y1 Revenue", "$307,373"],
          ["SDVOSB Status", "Service-Disabled Veteran-Owned Small Business"],
          ["Gov't Contract Potential", "$50K-150K (Year 2+, conservative)"],
          ["Series A Ready", "Month 18-24"]
        ],
        [4500, 4860]
      ),

      subhead("Why $500K?"),
      body("We're raising $500K with a 16% strategic reserve ($80K) to ensure execution without cash anxiety. This provides:"),
      bullet("24+ months runway in base case, 30+ months if growth is slower", "bullet-list"),
      bullet("Buffer for CAC variance, regulatory surprises, and opportunities", "bullet-list"),
      bullet("Ability to raise Series A from strength, not desperation", "bullet-list"),
      bullet("One raise instead of two — avoiding costly bridge rounds", "bullet-list"),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("1.2 Business Description")] }),

      subhead("Company Structure"),
      body("CoNest, Inc. is a Delaware C-Corporation headquartered in Austin, Texas, operating as a mobile-first technology platform."),

      subhead("Core Technology Stack"),
      numbered("React Native Mobile Application (iOS & Android)", "numbered-list"),
      numbered("Node.js/Express Backend API with PostgreSQL Database", "numbered-list"),
      numbered("Real-time Messaging via Socket.io", "numbered-list"),
      numbered("Payment Processing through Stripe Connect", "numbered-list"),
      numbered("Verification Partners: Veriff (IDV) + Certn (Background Checks)", "numbered-list"),

      subhead("Verification Cost Structure (Actual Vendor Pricing)"),
      table(
        ["Component", "Vendor", "Cost", "Notes"],
        [
          ["Identity Verification", "Veriff Plus", "$1.39", "Document + selfie verification"],
          ["Background Check", "Certn Single County", "$28.50", "SSN trace, criminal, sex offender"],
          ["Payment Processing", "Stripe", "$1.43", "2.9% + $0.30 per transaction"],
          ["Total Cost", "—", "$31.32", "Per verified user"],
          ["User Fee", "—", "$39.00", "Verification fee charged"],
          ["Gross Margin", "—", "$7.68", "19.7% (31% with negotiated rev share)"]
        ],
        [2400, 2000, 1400, 3560]
      ),

      subhead("Key Intellectual Property"),
      bullet("Proprietary Matching Algorithm: Patent-pending compatibility scoring (schedule 25%, parenting 20%, house rules 20%, location 15%, budget 10%, lifestyle 10%)", "bullet-2"),
      bullet("Zero Child Data Architecture: Industry-first privacy protection — no children's names, photos, or details stored", "bullet-2"),
      bullet("Tiered Verification Model: Progressive trust system (Basic → Co-Living Ready)", "bullet-2"),

      new Paragraph({ children: [new PageBreak()] }),

      // PARAGRAPH 2: MISSION
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("PARAGRAPH 2: MISSION")] }),
      new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: "Market Analysis & Opportunity", italics: true, size: 24, color: COLORS.accent, font: "Arial" })] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.1 The Problem")] }),

      subhead("Housing Affordability Crisis"),
      bullet("Single parents spend 52% of gross income on housing (vs. 28% for dual-income)", "bullet-3"),
      bullet("75% of single-parent renters are cost-burdened (>30% income on rent)", "bullet-3"),
      bullet("Only 1 in 4 eligible families receives housing assistance (waitlist backlogs)", "bullet-3"),

      subhead("Safety Barriers to Shared Housing"),
      bullet("84% of single parents cite safety as primary barrier to roommates", "bullet-3"),
      bullet("Traditional platforms (Craigslist, Roomies) lack verification safeguards", "bullet-3"),
      bullet("No existing platform addresses parent-specific compatibility needs", "bullet-3"),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.2 The Solution")] }),

      subhead("Tiered Verification & Pricing Model"),
      table(
        ["Tier", "Price", "Includes", "Use Case"],
        [
          ["Free Browse", "$0", "Profile creation, 10 matches/month", "Discovery"],
          ["Verified", "$39", "IDV + Single County background", "Enable messaging"],
          ["Co-Living Ready", "+$49", "Unlimited County (7-year history)", "Before sharing address"],
          ["Premium", "$14.99/mo", "Unlimited matches, priority, tools", "Power users"],
          ["Bundle", "$99", "Verification + 6 months Premium", "High-intent users"]
        ],
        [1800, 1100, 3200, 3260]
      ),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.3 Target Customers")] }),

      subhead("Demographics"),
      bullet("Single parents (divorced, widowed, never married)", "bullet-4"),
      bullet("Ages 25-45 (primary), 22-55 (secondary)", "bullet-4"),
      bullet("Household income: $25,000-$75,000 annually", "bullet-4"),
      bullet("Currently paying 40-60% of income on housing", "bullet-4"),

      subhead("Initial Launch Markets (Concentrated Approach)"),
      table(
        ["City", "Single-Parent HH", "Avg Rent", "Why"],
        [
          ["Charlotte, NC", "~450,000", "$1,550", "Growing metro, military presence, affordable suburbs"],
          ["Atlanta, GA", "~950,000", "$1,650", "Large single-parent population, diverse, VA hub"]
        ],
        [2500, 2000, 1500, 3360]
      ),
      body("Note: We deliberately limit to 2 cities to achieve marketplace density before expansion. Two-sided marketplaces fail without geographic concentration. Both cities have strong veteran communities and VA regional offices, supporting SDVOSB government partnerships."),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.4 Competitive Analysis")] }),

      subhead("Competitive Landscape"),
      table(
        ["Competitor", "Verification", "Family Focus", "Weakness"],
        [
          ["Craigslist", "None", "No", "Safety concerns, fraud risk"],
          ["Roomies.com", "Optional", "No", "No background checks"],
          ["Silvernest", "Yes", "No (50+ only)", "Wrong demographic"],
          ["Facebook Groups", "None", "Varies", "Inconsistent, no screening"],
          ["CoNest", "Mandatory", "YES", "First mover advantage"]
        ],
        [2200, 1600, 1600, 3960]
      ),

      subhead("Sustainable Competitive Advantages"),
      bullet("Only platform with mandatory verification for family housing", "bullet-5"),
      bullet("20-31% margin on verification (competitors break-even or lose money)", "bullet-5"),
      bullet("Zero child data architecture — regulatory moat", "bullet-5"),
      bullet("Parent-specific matching algorithm (not generic roommate matching)", "bullet-5"),
      bullet("SDVOSB certification — access to 3% federal set-asides, HUD/VA contracts", "bullet-5"),

      new Paragraph({ children: [new PageBreak()] }),

      // PARAGRAPH 3: EXECUTION
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("PARAGRAPH 3: EXECUTION")] }),
      new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: "Marketing, Sales Strategy & Operations", italics: true, size: 24, color: COLORS.accent, font: "Arial" })] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("3.1 Go-to-Market Strategy")] }),

      subhead("Concentrated Launch Approach"),
      body("CoNest launches in 2 cities (Charlotte, Atlanta) to achieve marketplace liquidity before expansion. This solves the two-sided marketplace cold-start problem. Both markets have strong veteran communities aligned with our SDVOSB outreach strategy."),

      subhead("Customer Acquisition Channels"),
      table(
        ["Channel", "Budget %", "Annual $", "Expected Users", "CAC"],
        [
          ["Paid Social (FB/IG)", "35%", "$28,000", "700", "$40"],
          ["Community Partnerships", "30%", "$24,000", "800", "$30"],
          ["Content/SEO", "20%", "$16,000", "400", "$40"],
          ["Referral Program", "15%", "$12,000", "480", "$25"],
          ["TOTAL", "100%", "$80,000", "2,380", "$33.60 avg"]
        ],
        [2400, 1200, 1400, 1800, 1200]
      ),

      subhead("CAC Sensitivity Analysis"),
      table(
        ["Scenario", "Blended CAC", "Y1 Paid Users", "Impact"],
        [
          ["Optimistic", "$30", "2,667", "Faster growth, higher margin"],
          ["Base Case", "$40", "2,000", "Model assumption"],
          ["Conservative", "$60", "1,333", "Covered by reserve fund"]
        ],
        [2500, 2000, 2000, 2860]
      ),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("3.2 Unit Economics")] }),

      subhead("Revenue Per User"),
      table(
        ["Component", "Value", "Assumption"],
        [
          ["Verification profit", "$7.68", "Per verified user ($39 - $31.32)"],
          ["Premium conversion", "24%", "Industry benchmark"],
          ["Avg premium tenure", "8 months", "Conservative (vs 20mo at 5% churn)"],
          ["Premium LTV", "$119.92", "8 × $14.99"],
          ["Blended LTV per user", "$36.46", "$7.68 + (24% × $119.92)"],
          ["With Co-Living upgrade", "$47.34", "25% add $49 tier"]
        ],
        [3000, 2000, 4360]
      ),

      subhead("LTV:CAC Analysis"),
      bullet("At $30 CAC: LTV:CAC = 1.58:1 (healthy for growth stage)", "bullet-6"),
      bullet("At $40 CAC: LTV:CAC = 1.18:1 (investment phase)", "bullet-6"),
      bullet("Path to 3:1: Increase premium conversion to 40%+ OR reduce CAC via referrals/PR", "bullet-6"),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("3.3 Risk Assessment")] }),

      table(
        ["Risk", "Probability", "Impact", "Mitigation"],
        [
          ["Low marketplace density", "Medium", "High", "2-city concentration, hyperfocus"],
          ["CAC higher than expected", "Medium", "Medium", "$80K reserve fund"],
          ["Safety incident", "Low", "Critical", "Mandatory verification, rapid response"],
          ["Verification cost increase", "Low", "Low", "Volume discounts, locked rates"],
          ["Large competitor enters", "Medium", "Medium", "First-mover, niche expertise"]
        ],
        [2400, 1400, 1200, 4360]
      ),

      new Paragraph({ children: [new PageBreak()] }),

      // PARAGRAPH 4: SERVICE & SUPPORT
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("PARAGRAPH 4: SERVICE & SUPPORT")] }),
      new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: "Organization, Team & Financial Projections", italics: true, size: 24, color: COLORS.accent, font: "Arial" })] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("4.1 Team Structure (Lean)")] }),

      table(
        ["Role", "Monthly", "Annual", "Notes"],
        [
          ["CEO/Founder (You)", "$5,000", "$60,000", "Below-market, equity-heavy"],
          ["CTO", "$7,500", "$90,000", "Below-market, equity-heavy"],
          ["Full-Stack Engineer", "$9,000", "$108,000", "Competitive rate"],
          ["Payroll Taxes (~15%)", "$3,225", "$38,700", "FICA, state"],
          ["Health Insurance", "$1,500", "$18,000", "~$500/person"],
          ["TOTAL TEAM", "$26,225", "$314,700", ""]
        ],
        [3000, 1600, 1600, 3160]
      ),

      body("Note: Founder handles marketing/growth, design, and customer support. No dedicated hires for these functions in Year 1."),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("4.2 Use of Funds ($500K)")] }),

      table(
        ["Category", "Amount", "%", "Purpose"],
        [
          ["Team (18mo runway)", "$283,000", "57%", "Salaries, taxes, benefits, gap funding"],
          ["Marketing", "$80,000", "16%", "Paid acquisition, partnerships, referrals"],
          ["Infrastructure", "$25,000", "5%", "AWS, security, scaling"],
          ["Operations", "$32,000", "6%", "Legal, accounting, insurance, tools"],
          ["Strategic Reserve", "$80,000", "16%", "Buffer for unknowns (see breakdown)"],
          ["TOTAL", "$500,000", "100%", ""]
        ],
        [2400, 1400, 800, 4760]
      ),

      subhead("Strategic Reserve Breakdown ($80K)"),
      table(
        ["Reserve Purpose", "Amount", "Trigger Condition"],
        [
          ["Slower growth buffer", "$30,000", "If CAC is $60+ instead of $40"],
          ["Verification cost increases", "$10,000", "If Certn/Veriff raise prices"],
          ["Legal/compliance surprises", "$15,000", "State-by-state regulations"],
          ["Opportunity fund", "$15,000", "Strategic hire, partnership, acquisition"],
          ["Emergency runway extension", "$10,000", "3-month buffer if needed"]
        ],
        [3000, 1400, 4960]
      ),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("4.3 Year 1 Financial Projections")] }),

      subhead("Monthly P&L (Moderate Scenario - Accelerated Marketing)"),
      table(
        ["Month", "Verified", "Premium", "Revenue", "Expenses", "Net", "Cash"],
        [
          ["Jan", "150", "30", "$6,300", "$35,000", "-$28,700", "$471,300"],
          ["Feb", "180", "65", "$7,995", "$35,000", "-$27,005", "$444,295"],
          ["Mar", "220", "110", "$10,227", "$35,500", "-$25,273", "$419,022"],
          ["Apr", "270", "165", "$12,814", "$35,500", "-$22,686", "$396,336"],
          ["May", "330", "235", "$16,043", "$36,000", "-$19,957", "$376,379"],
          ["Jun", "400", "320", "$19,915", "$36,000", "-$16,085", "$360,294"],
          ["Jul", "480", "420", "$24,237", "$36,500", "-$12,263", "$348,031"],
          ["Aug", "570", "540", "$29,203", "$37,000", "-$7,797", "$340,234"],
          ["Sep", "670", "680", "$34,909", "$37,500", "-$2,591", "$337,643"],
          ["Oct", "780", "850", "$41,260", "$38,000", "+$3,260", "$340,903"],
          ["Nov", "900", "1,050", "$48,360", "$38,500", "+$9,860", "$350,763"],
          ["Dec", "1,030", "1,280", "$56,110", "$39,000", "+$17,110", "$367,873"]
        ],
        [900, 1000, 1000, 1200, 1300, 1200, 1400]
      ),

      new Paragraph({ spacing: { before: 200 } }),
      body("Year 1 Summary: 5,980 Verified Users | 1,280 Premium Subs | $307,373 Revenue | $439,500 Expenses | Net: -$132,127 | Ending Cash: $367,873"),

      subhead("Break-Even Analysis"),
      bullet("Monthly break-even: ~$36,000 revenue (Month 10)", "bullet-7"),
      bullet("Requires: ~450 verifications + 700 premium subs", "bullet-7"),
      bullet("Cash positive cumulative: Month 19 (July Year 2)", "bullet-7"),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("4.4 Year 2 Projections")] }),

      table(
        ["Quarter", "New Verified", "Premium (EoY)", "Revenue", "Expenses", "Net", "Cash"],
        [
          ["Q1", "3,600", "2,100", "$202,230", "$125,000", "+$77,230", "$445,103"],
          ["Q2", "5,400", "3,500", "$310,425", "$150,000", "+$160,425", "$605,528"],
          ["Q3", "7,800", "5,200", "$451,620", "$200,000", "+$251,620", "$857,148"],
          ["Q4", "10,500", "7,500", "$625,185", "$275,000", "+$350,185", "$1,207,333"]
        ],
        [1100, 1600, 1600, 1600, 1600, 1600, 1400]
      ),

      body("Year 2 Summary: 27,300 New Verified | 7,500 Premium | $1,589,460 Revenue | $750,000 Expenses | Net: +$839,460"),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("4.5 Government & Veteran Programs (SDVOSB)")] }),

      body("CoNest qualifies as a Service-Disabled Veteran-Owned Small Business (SDVOSB), providing access to federal contracting preferences and veteran-focused funding opportunities."),

      subhead("SDVOSB Certification Benefits"),
      bullet("3% of federal contracts set aside exclusively for SDVOSBs", "bullet-list"),
      bullet("Sole-source contracts up to $4M (no competitive bidding required)", "bullet-list"),
      bullet("Priority consideration for HUD, VA, and DoD family housing programs", "bullet-list"),
      bullet("Joint venture opportunities with large primes on major contracts", "bullet-list"),

      subhead("Federal Contract Opportunities (Conservative)"),
      table(
        ["Agency", "Program", "Potential Value", "Timeline", "Probability"],
        [
          ["HUD", "Housing counseling tech modernization", "$25K-75K", "Year 2", "Medium"],
          ["VA", "HUD-VASH supportive housing referral", "$30K-100K", "Year 2-3", "Medium"],
          ["DoD", "Military family transition housing", "$50K-150K", "Year 3", "Low-Medium"],
          ["State/Local", "Affordable housing innovation pilots", "$15K-50K", "Year 2", "Medium-High"]
        ],
        [1400, 3000, 1600, 1200, 2160]
      ),
      body("Conservative Year 2 government revenue estimate: $50,000-$150,000 (not included in base projections)"),

      subhead("Veteran Grants & Financing"),
      table(
        ["Source", "Type", "Amount", "Status"],
        [
          ["SBA Patriot Express Loan", "Low-interest loan", "Up to $500K", "Available now"],
          ["StreetShares Foundation", "Grant", "$5K-$15K", "Apply Q2"],
          ["Bunker Labs Veteran Accelerator", "Accelerator + funding", "$10K-$50K", "Apply annually"],
          ["Hivers and Strivers", "Angel investment", "$250K-$1M", "Warm intro needed"],
          ["VA Small Business Loan Guarantee", "Loan guarantee", "Up to $350K", "Available now"]
        ],
        [3000, 1800, 1800, 2760]
      ),

      subhead("B2B Government Strategy (Year 2+)"),
      bullet("Q1-Q2 Year 1: Complete SDVOSB certification (VetBiz.gov registration)", "bullet-2"),
      bullet("Q3-Q4 Year 1: Identify target contracts on SAM.gov, build relationships", "bullet-2"),
      bullet("Year 2: Submit 3-5 proposals for HUD/VA small contracts", "bullet-2"),
      bullet("Year 3: Scale government channel to 10-15% of revenue", "bullet-2"),

      subhead("3-Year Summary (Including Government Upside)"),
      table(
        ["Metric", "Year 1", "Year 2", "Year 3"],
        [
          ["Verified Users (cumulative)", "5,980", "33,280", "90,000+"],
          ["Premium Subs (EoY)", "1,280", "7,500", "20,000+"],
          ["B2C Revenue", "$307K", "$1.59M", "$4.2M+"],
          ["Gov't Revenue (conservative)", "$0", "$50K-150K", "$200K-400K"],
          ["Total Revenue Range", "$307K", "$1.64-1.74M", "$4.4-4.6M+"],
          ["Net Income", "-$132K", "+$889K-989K", "+$2M+"],
          ["Team Size", "3", "8-10", "15-20"],
          ["Markets", "2", "5-8", "15-20"]
        ],
        [3000, 2120, 2120, 2120]
      ),

      new Paragraph({ children: [new PageBreak()] }),

      // PARAGRAPH 5: COMMAND & SIGNAL
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("PARAGRAPH 5: COMMAND & SIGNAL")] }),
      new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: "Governance, Communication & Milestones", italics: true, size: 24, color: COLORS.accent, font: "Arial" })] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("5.1 Key Performance Indicators")] }),

      table(
        ["KPI", "Target", "Measurement"],
        [
          ["Child Safety Incidents", "Zero", "Daily monitoring, immediate escalation"],
          ["Free → Verified Conversion", ">24%", "% completing verification"],
          ["Verified → Premium", ">20%", "% upgrading to subscription"],
          ["Monthly Verified Growth", ">15%", "Month-over-month"],
          ["CAC", "<$50", "Blended acquisition cost"],
          ["Premium Churn", "<8%", "Monthly subscriber retention"],
          ["NPS Score", ">40", "Quarterly surveys"],
          ["Runway", ">12 months", "Cash / monthly burn"]
        ],
        [3000, 1600, 4760]
      ),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("5.2 Milestones & Timeline")] }),

      table(
        ["Month", "Milestone", "Success Criteria"],
        [
          ["M1-3", "Product Launch + SDVOSB Filing", "App live in Charlotte, 500+ signups, VetBiz registration"],
          ["M4-6", "Atlanta Expansion", "Second market live, 1,500+ verified, SDVOSB certified"],
          ["M7-9", "Product-Market Fit", "NPS >40, 20%+ premium conversion"],
          ["M10", "Break-Even", "Monthly revenue > expenses"],
          ["M12", "Year 1 Complete", "5,000+ verified, $300K+ revenue, SAM.gov registered"],
          ["M15-18", "Series A Prep + Gov't Contracts", "10K+ verified, LTV:CAC >2:1, 2+ gov't proposals"],
          ["M18-24", "Series A Raise", "$3-5M at $15-25M valuation"]
        ],
        [1400, 2500, 5460]
      ),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("5.3 Series A Readiness Criteria")] }),

      body("To raise Series A ($3-5M), CoNest targets:"),
      bullet("10,000+ verified users with 80%+ retention", "bullet-list"),
      bullet("1,000+ documented successful housing matches", "bullet-list"),
      bullet("LTV:CAC ratio approaching 3:1", "bullet-list"),
      bullet(">15% monthly revenue growth for 6+ consecutive months", "bullet-list"),
      bullet("Zero child safety incidents", "bullet-list"),
      bullet("Clear path to $5M+ ARR", "bullet-list"),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("5.4 Governance")] }),

      subhead("Board of Directors"),
      bullet("Founder Seat (1): CEO", "bullet-2"),
      bullet("Investor Seat (1): Lead seed investor (board observer or seat)", "bullet-2"),
      bullet("Independent Seat (1): Industry expert, appointed Year 2", "bullet-2"),

      subhead("Investor Reporting"),
      bullet("Monthly: Written update (metrics, progress, challenges)", "bullet-2"),
      bullet("Quarterly: Video call with Q&A", "bullet-2"),
      bullet("Ad-hoc: Major decisions, pivots, opportunities", "bullet-2"),

      new Paragraph({ children: [new PageBreak()] }),

      // APPENDIX
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("APPENDIX")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("A. Why Raise $500K (Not $300K)?")] }),

      table(
        ["Factor", "$300K Raise", "$500K Raise"],
        [
          ["Runway (base)", "18 months", "24 months"],
          ["Runway (conservative)", "22 months", "30+ months"],
          ["Strategic reserve", "$0", "$80,000"],
          ["Break-even month", "12", "10 (accelerated marketing)"],
          ["Cash stress", "Moderate", "Low"],
          ["Series A position", "Decent", "Strong"],
          ["Risk of bridge round", "Medium", "Low"]
        ],
        [3000, 3180, 3180]
      ),

      body("The additional $200K provides 6+ months of buffer and eliminates the need for a bridge round, which typically comes with unfavorable terms and signals distress to Series A investors."),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("B. Investment Terms")] }),

      table(
        ["Term", "Details"],
        [
          ["Instrument", "SAFE (Simple Agreement for Future Equity)"],
          ["Amount", "$500,000"],
          ["Valuation Cap", "$3,000,000"],
          ["Discount", "20%"],
          ["Pro-Rata Rights", "Yes, for investments >$50K"],
          ["MFN", "Yes"]
        ],
        [3000, 6360]
      ),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("C. SDVOSB Certification & Government Contracting")] }),

      subhead("Certification Requirements"),
      bullet("Veteran must own 51%+ of the business", "bullet-4"),
      bullet("Service-connected disability rating from VA", "bullet-4"),
      bullet("Veteran must control day-to-day management and operations", "bullet-4"),
      bullet("Register at VetBiz.gov (SBA Veteran Small Business Certification)", "bullet-4"),

      subhead("Key Government Registrations"),
      bullet("SAM.gov: System for Award Management (required for federal contracts)", "bullet-4"),
      bullet("VetBiz.gov: SDVOSB certification database", "bullet-4"),
      bullet("DSBS: Dynamic Small Business Search (visibility to contracting officers)", "bullet-4"),

      subhead("Target Contract Vehicles"),
      bullet("GSA Schedule 70 (IT Services) — long-term positioning", "bullet-4"),
      bullet("HUD Small Business Set-Asides — housing technology focus", "bullet-4"),
      bullet("VA T4NG (Transformation Twenty-One Total Technology Next Generation)", "bullet-4"),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("D. Verification Partners")] }),

      bullet("Veriff (veriff.com): Identity verification — $1.39/check, Plus tier", "bullet-4"),
      bullet("Certn (certn.co): Background checks — $28.50/check, Single County", "bullet-4"),
      bullet("Stripe Connect (stripe.com/connect): Payment processing — 2.9% + $0.30", "bullet-4"),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("E. Contact Information")] }),

      new Paragraph({ spacing: { before: 200 } }),
      body("CoNest, Inc."),
      body("Charlotte, NC / Atlanta, GA"),
      body("Email: investors@conest.com"),
      body("Web: www.conest.com"),

      new Paragraph({ spacing: { before: 400 } }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "— END OF BUSINESS PLAN —", bold: true, size: 24, color: COLORS.primary, font: "Arial" })] })
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('/Users/ghostmac/Desktop/CoNest_Business_Plan_SDVOSB.docx', buffer);
  console.log('✅ Business plan generated: ~/Desktop/CoNest_Business_Plan_500K.docx');
}).catch(err => console.error('Error:', err));
