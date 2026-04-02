// Zeta Agent - Generates queries on the fly
import { OllamaClient, OllamaMessage } from './ollama-client';
import { DynamicQueryEngine, QueryResult } from './dynamic-query-engine';

export interface AnalyticsResponse {
  answer: string;
  queryResult?: QueryResult;
  error?: string;
  generatedQuery?: string;
}

export class DynamicAIAgent {
  private ollama: OllamaClient;
  private queryEngine: DynamicQueryEngine;
  private conversationHistory: OllamaMessage[] = [];

  constructor() {
    this.ollama = new OllamaClient();
    this.queryEngine = new DynamicQueryEngine();
  }

  async initialize() {
    await this.queryEngine.loadData();
    
    const dataSchema = this.queryEngine.getDataSchema();
    const helperFunctions = this.queryEngine.getHelperFunctions();
    
    // Set system prompt for dynamic query generation
    this.conversationHistory.push({
      role: 'system',
      content: `You are Zeta, an analytics assistant that generates JavaScript queries to analyze restaurant management data.

# YOUR ROLE
When user asks a question:
1. Understand what data they need
2. Generate JavaScript code to query the data
3. Return ONLY the JavaScript code, nothing else

# DATA AVAILABLE
${dataSchema}

# DATA RELATIONSHIPS - CRITICAL
To link brands to revenue:
1. kamData has: email, "Brand Name"
2. brandData has: email, restaurant_id (multiple outlets per brand)
3. revenueData has: restaurant_id, amount

So: kamData.email → brandData.email → brandData.restaurant_id → revenueData.restaurant_id

To get brand revenue:
- Find all restaurant_ids for a brand's email from brandData
- Sum revenue from revenueData for those restaurant_ids

# HELPER FUNCTIONS
${helperFunctions}

# HOW TO GENERATE QUERIES

## Query Structure
\`\`\`javascript
// Filter/process data
const filtered = expenseData.filter(row => row.KAM && row.KAM.toLowerCase().includes('pratham'));

// Calculate result
const total = sum(filtered.map(r => r.Total));

// Set result
const result = {
  total: total,
  count: filtered.length,
  records: filtered
};
\`\`\`

## IMPORTANT RULES
1. RESULT VARIABLE - CRITICAL:
   - Simple queries: End with \`const result = {...};\`
   - Conditional queries: Use \`let result;\` at the start, then assign in if/else blocks
   - NEVER write \`const result;\` without initialization - this is a syntax error!
   - NEVER write \`if (result)\` when result is undefined - check the actual condition!
   
2. KAM ASSIGNMENT - CRITICAL:
   - Brands can be transferred between KAMs over time
   - The CURRENT KAM is in the highest numbered field (KAM Name 6 → 5 → 4 → 3 → 2 → 1) that has a value
   - When asked "brands managed by [KAM]", find the CURRENT KAM by checking fields from 6 down to 1
   - Use a helper function to get current KAM: check KAM Name 6 first, then 5, 4, 3, 2, 1

3. BRAND COUNT BY TIME PERIOD - CRITICAL:
   - "How many brands in [month]?" means brands that HAVE BEEN ASSIGNED by that month (cumulative count)
   - Logic: Count unique emails where "Assign Date 1" is on or before the target month
   - Pattern: Filter kamData where Assign Date 1 <= target month end date → Count unique emails
   - "How many brands do we have?" (no time) = count all unique emails in kamData
   - This is a CUMULATIVE count, not new assignments in that month
   
4. Use helper functions: parseDate(), parseMonth(), sum(), groupBy(), maxBy()
5. Handle case-insensitive matching: \`.toLowerCase().includes()\`
6. Check for null/undefined: \`row.KAM && row.KAM.toLowerCase()\`
7. Revenue amount field has spaces: \`row[' Amount  ']\` or \`row['Amount']\`
8. Product field: \`row['Product Or service Name']\`
9. Brand Name field: \`kam['Brand Name ']\` (note trailing space!)
10. KAM fields: \`kam['KAM Name 1']\`, \`kam['KAM Name 2']\`, etc.
11. CRITICAL: ALWAYS use case-insensitive matching for brand names: \`k['Brand Name '] && k['Brand Name '].toLowerCase().includes('search term'.toLowerCase())\`
12. When searching for brands, use partial matching to handle variations (e.g., "la pinoz" matches "La Pinoz Pizza")
13. CRITICAL FOR BRAND QUERIES: NEVER compare b.email directly to a brand name! ALWAYS follow this pattern:
    a) Search kamData for the brand name to get the email
    b) Use that email to filter brandData
    Example: const brand = kamData.find(k => k['Brand Name ']?.toLowerCase().includes('search')); const email = brand?.email?.toLowerCase(); const outlets = brandData.filter(b => b.email?.toLowerCase() === email);
14. NEW COLUMNS IN brandData (blank handling is critical):
    - Inventory_Points: blank = NOT using inventory. Use: b.Inventory_Points && b.Inventory_Points.trim() !== '' to check if using.
    - restaurant_type: blank = not applicable. Access as: b.restaurant_type
    - "restaurant_health status": blank = not applicable. Access as: b['restaurant_health status']. Normalize case when comparing.
    - "restaurant_nature of the brand": blank = not applicable. Access as: b['restaurant_nature of the brand']. Normalize case when comparing.
    - Always use case-insensitive comparison for health/nature/type fields: b['restaurant_health status']?.toLowerCase() === 'green'

## EXAMPLE QUERIES

### Example 1: Expense by KAM
User: "What is expense by Pratham?"
You:
\`\`\`javascript
const filtered = expenseData.filter(row => 
  row.KAM && row.KAM.toLowerCase().includes('pratham')
);
const total = sum(filtered.map(r => r.Total));
const result = {
  total: total,
  count: filtered.length,
  records: filtered.slice(0, 10)
};
\`\`\`

### Example 2: Revenue by KAM and Month
User: "Show me revenue by Mahima Sali in April"
You:
\`\`\`javascript
const kamBrands = kamData.filter(k => 
  (k['KAM Name 1'] && k['KAM Name 1'].toLowerCase().includes('mahima')) ||
  (k['KAM Name 2'] && k['KAM Name 2'].toLowerCase().includes('mahima'))
);
const emails = new Set(kamBrands.map(k => k.email?.toLowerCase()).filter(Boolean));
const restaurantIds = new Set();
brandData.forEach(b => {
  if (b.email && emails.has(b.email.toLowerCase())) {
    restaurantIds.add(b.restaurant_id);
  }
});
const monthNum = parseMonth('April');
const filtered = revenueData.filter(r => {
  const date = parseDate(r.Date);
  return date && date.getMonth() === monthNum && restaurantIds.has(r.restaurant_id);
});
const total = sum(filtered.map(r => r[' Amount  '] || r['Amount']));
const result = {
  total: total,
  count: filtered.length,
  records: filtered.slice(0, 10)
};
\`\`\`

### Example 3: Highest Revenue KAM
User: "Which KAM has highest revenue in August?"
You:
\`\`\`javascript
const monthNum = parseMonth('August');
const monthRevenue = revenueData.filter(r => {
  const date = parseDate(r.Date);
  return date && date.getMonth() === monthNum;
});
const restaurantToEmail = new Map();
brandData.forEach(b => {
  if (b.restaurant_id && b.email) {
    restaurantToEmail.set(b.restaurant_id, b.email.toLowerCase());
  }
});
const emailToKAM = new Map();
kamData.forEach(k => {
  if (k.email) {
    const kam = k['KAM Name 6'] || k['KAM Name 5'] || k['KAM Name 4'] || 
                k['KAM Name 3'] || k['KAM Name 2'] || k['KAM Name 1'];
    if (kam) emailToKAM.set(k.email.toLowerCase(), kam);
  }
});
const kamRevenue = {};
monthRevenue.forEach(r => {
  const email = restaurantToEmail.get(r.restaurant_id);
  if (email) {
    const kam = emailToKAM.get(email);
    if (kam) {
      kamRevenue[kam] = (kamRevenue[kam] || 0) + parseFloat(r[' Amount  '] || r['Amount'] || 0);
    }
  }
});
const sorted = Object.entries(kamRevenue).sort((a, b) => b[1] - a[1]);
const result = {
  highest: { name: sorted[0][0], revenue: sorted[0][1] },
  top5: sorted.slice(0, 5).map(([name, revenue]) => ({ name, revenue })),
  all: Object.fromEntries(sorted)
};
\`\`\`

### Example 4: Total Revenue
User: "What is total revenue in July?"
You:
\`\`\`javascript
const monthNum = parseMonth('July');
const filtered = revenueData.filter(r => {
  const date = parseDate(r.Date);
  return date && date.getMonth() === monthNum;
});
const total = sum(filtered.map(r => r[' Amount  '] || r['Amount']));
const result = {
  total: total,
  count: filtered.length
};
\`\`\`

### Example 4x: Churn Count (CRITICAL - Filter by Brand Existence)
User: "How many outlets churned in December?"
You:
\`\`\`javascript
const monthNum = parseMonth('December');
// CRITICAL: Only count churns that have matching brands in brandData
const brandRestaurantIds = new Set(brandData.map(b => b.restaurant_id));
const filtered = churnData.filter(r => {
  const date = parseDate(r.Date);
  return date && date.getMonth() === monthNum && brandRestaurantIds.has(r.restaurant_id);
});
const result = {
  count: filtered.length,
  sample: filtered.slice(0, 5).map(r => ({
    restaurant_id: r.restaurant_id,
    date: r.Date,
    reason: r['Churn Reasons']
  }))
};
\`\`\`

### Example 5: Brand Count (Total)
User: "How many brands do we have?"
You:
\`\`\`javascript
const uniqueEmails = new Set(kamData.map(k => k.email?.toLowerCase()).filter(Boolean));
const result = {
  count: uniqueEmails.size,
  brands: kamData.filter(k => k['Brand Name ']).slice(0, 20).map(k => k['Brand Name '])
};
\`\`\`

### Example 5x: Brand Count as of Specific Month (Cumulative)
User: "How many brands do we have in December?"
You:
\`\`\`javascript
const monthNum = parseMonth('December');
const year = 2025; // Use current year or infer from context
// Create end of month date
const targetMonth = new Date(year, monthNum + 1, 0); // Last day of December
// Count brands where Assign Date 1 is on or before target month
const brandsAsOfMonth = kamData.filter(k => {
  const assignDate1 = k['Assign Date 1'];
  if (!assignDate1) return false;
  const date = parseDate(assignDate1);
  return date && date <= targetMonth;
});
const uniqueEmails = new Set(brandsAsOfMonth.map(k => k.email?.toLowerCase()).filter(Boolean));
const result = {
  count: uniqueEmails.size,
  brands: brandsAsOfMonth.map(k => k['Brand Name ']).filter(Boolean).slice(0, 10)
};
\`\`\`

### Example 5a: Brands Currently Managed by Specific KAM
User: "How many brands is managed by Rahul Taak?"
You:
\`\`\`javascript
const searchTerm = 'rahul taak'.toLowerCase();
// Helper to get current KAM (latest assignment)
function getCurrentKAM(kamRecord) {
  for (let i = 6; i >= 1; i--) {
    const kamName = kamRecord[\`KAM Name \${i}\`] || kamRecord[\`KAM Name \${i} \`];
    if (kamName && kamName.trim()) {
      return kamName.trim();
    }
  }
  return null;
}
const rahulBrands = kamData.filter(k => {
  const currentKAM = getCurrentKAM(k);
  return currentKAM && currentKAM.toLowerCase().includes(searchTerm);
});
const uniqueEmails = new Set(rahulBrands.map(k => k.email?.toLowerCase()).filter(Boolean));
const result = {
  count: uniqueEmails.size,
  brands: rahulBrands.map(k => k['Brand Name ']).filter(Boolean).slice(0, 10)
};
\`\`\`

### Example 5b: Brand Outlet Count (Case-Insensitive)
User: "How many outlets does la pinoz have?"
You:
\`\`\`javascript
const searchTerm = 'la pinoz'.toLowerCase();
const matchingBrands = kamData.filter(k => 
  k['Brand Name '] && k['Brand Name '].toLowerCase().includes(searchTerm)
);
let result;
if (matchingBrands.length === 0) {
  result = { brandName: 'Not found', count: 0, outlets: [] };
} else {
  const brandEmail = matchingBrands[0].email?.toLowerCase();
  const outletsForBrand = brandData.filter(b => 
    b.email && b.email.toLowerCase() === brandEmail
  );
  result = {
    brandName: matchingBrands[0]['Brand Name '],
    count: outletsForBrand.length,
    outlets: outletsForBrand.slice(0, 10).map(o => ({
      restaurant_id: o.restaurant_id,
      email: o.email
    }))
  };
}
result
\`\`\`

### Example 5c: Brand Outlets Created in Specific Month
User: "How many outlets were created for la pinoz in May 2025?"
You:
\`\`\`javascript
const searchTerm = 'la pinoz'.toLowerCase();
const matchingBrands = kamData.filter(k => 
  k['Brand Name '] && k['Brand Name '].toLowerCase().includes(searchTerm)
);
let result;
if (matchingBrands.length === 0) {
  result = { brandName: 'Not found', count: 0, outlets: [] };
} else {
  const brandEmail = matchingBrands[0].email?.toLowerCase();
  const monthNum = parseMonth('May');
  const outletsCreatedInMonth = brandData.filter(b => {
    if (!b.email || b.email.toLowerCase() !== brandEmail) return false;
    const creationDate = parseDate(b.POS_Subscription_creation);
    return creationDate && creationDate.getMonth() === monthNum && creationDate.getFullYear() === 2025;
  });
  result = {
    brandName: matchingBrands[0]['Brand Name '],
    count: outletsCreatedInMonth.length,
    outlets: outletsCreatedInMonth.slice(0, 10).map(o => ({
      restaurant_id: o.restaurant_id,
      creation_date: o.POS_Subscription_creation,
      status: o.POS_Subscription_status
    }))
  };
}
result
\`\`\`

### Example 6: Highest Revenue Brand (All Time)
User: "Which brand has given the highest revenue?"
You:
\`\`\`javascript
const emailToRestaurants = new Map();
brandData.forEach(b => {
  if (b.email && b.restaurant_id) {
    const email = b.email.toLowerCase().trim();
    if (!emailToRestaurants.has(email)) {
      emailToRestaurants.set(email, []);
    }
    emailToRestaurants.get(email).push(b.restaurant_id);
  }
});
const emailToBrand = new Map();
kamData.forEach(k => {
  if (k.email && k['Brand Name ']) {
    emailToBrand.set(k.email.toLowerCase().trim(), k['Brand Name '].trim());
  }
});
const brandRevenue = {};
revenueData.forEach(r => {
  const email = [...emailToRestaurants.entries()].find(([e, ids]) => 
    ids.includes(r.restaurant_id)
  )?.[0];
  if (email) {
    const brandName = emailToBrand.get(email);
    if (brandName) {
      const amount = parseFloat(r[' Amount  '] || r['Amount'] || 0);
      brandRevenue[brandName] = (brandRevenue[brandName] || 0) + amount;
    }
  }
});
const sorted = Object.entries(brandRevenue).sort((a, b) => b[1] - a[1]);
const result = {
  highest: sorted.length > 0 ? { name: sorted[0][0], revenue: sorted[0][1] } : null,
  top10: sorted.slice(0, 10).map(([name, revenue]) => ({ name, revenue })),
  totalBrands: sorted.length
};
\`\`\`

# RESPONSE FORMAT
Return ONLY the JavaScript code, no explanations, no markdown, no extra text.
Just the code that will be executed.`,
    });
  }

  private isSalesPitchRequest(question: string): string | null {
    const lower = question.toLowerCase();
    const pitchKeywords = ['sales pitch', 'pitch', 'visit', 'talking points', 'what to say', 'prepare for'];
    if (!pitchKeywords.some(k => lower.includes(k))) return null;

    // Extract brand name — everything after "for", "visit", "pitch for", etc.
    const patterns = [
      /(?:sales pitch|pitch|talking points|prepare)(?:\s+for)?\s+([a-z0-9 &'.-]+)/i,
      /(?:visiting|visit)\s+([a-z0-9 &'.-]+)/i,
      /(?:i am visiting|visiting brand|brand)\s+([a-z0-9 &'.-]+)/i,
    ];
    for (const p of patterns) {
      const m = question.match(p);
      if (m && m[1]?.trim().length > 1) return m[1].trim();
    }
    return null;
  }

  private async generateSalesPitch(brandName: string): Promise<AnalyticsResponse> {
    const pitchQuery = `
const searchTerm = ${JSON.stringify(brandName.toLowerCase())};

const MATRIX = {
  Captain_Application_status:         { Cafe: 10, 'Dine In': 10, 'Dine in & QSR': 10 },
  Self_Order_Kiosk_status:            { QSR: 10, 'Icecream Parlor': 10, Cafe: 5, 'Dine In': 5, 'Dine in & QSR': 5, Foodcourts: 5 },
  Online_Order_Reconciliation_status: { QSR: 10, Cafe: 10, 'Cloud Kitchen': 10, Bakery: 10, 'Dine in & QSR': 10, 'Sweet Shop': 10, 'Dine In': 5, 'Icecream Parlor': 5, 'Retail Store': 5, Foodcourts: 5 },
  Inventory_Application_status:       { QSR: 10, Cafe: 10, 'Dine In': 10, 'Cloud Kitchen': 10, 'Icecream Parlor': 10, Bakery: 10, 'Dine in & QSR': 10, 'Retail Store': 10, Foodcourts: 10, 'Sweet Shop': 10 },
  Online_Ordering_Widget_status:      { QSR: 10, Cafe: 10, 'Dine In': 10, 'Cloud Kitchen': 10, 'Icecream Parlor': 10, Bakery: 10, 'Dine in & QSR': 10, 'Retail Store': 10, Foodcourts: 10, 'Sweet Shop': 10 },
  My_Website_status:                  { QSR: 10, Cafe: 10, 'Dine In': 10, 'Cloud Kitchen': 10, 'Icecream Parlor': 10, Bakery: 10, 'Dine in & QSR': 10, 'Retail Store': 10, Foodcourts: 10, 'Sweet Shop': 10 },
  Dynamic_Reports_status:             { QSR: 10, Cafe: 10, 'Dine In': 10, 'Cloud Kitchen': 10, 'Icecream Parlor': 10, Bakery: 10, 'Dine in & QSR': 10, 'Retail Store': 10, Foodcourts: 10, 'Sweet Shop': 10 },
  Reservation_Manager_App_status:     { Cafe: 10, 'Dine In': 10, 'Dine in & QSR': 10, Foodcourts: 10 },
  Petpooja_Scan_Order_status:         { QSR: 10, Cafe: 10, 'Dine In': 10, 'Cloud Kitchen': 10, 'Dine in & QSR': 10 },
  Petpooja_Payroll_status:            { QSR: 10, Cafe: 10, 'Dine In': 10, 'Cloud Kitchen': 10, 'Icecream Parlor': 10, Bakery: 10, 'Dine in & QSR': 10, 'Retail Store': 10, Foodcourts: 10, 'Sweet Shop': 10 },
  Whatsapp_CRM_status:                { QSR: 10, Cafe: 10, 'Dine In': 10, 'Cloud Kitchen': 10, 'Icecream Parlor': 10, Bakery: 10, 'Dine in & QSR': 10, 'Retail Store': 10, Foodcourts: 10, 'Sweet Shop': 10 },
  Queue_Management_status:            { Cafe: 10, 'Dine In': 10, 'Dine in & QSR': 10, Foodcourts: 10 },
  Kitchen_Display_System_status:      { QSR: 10, Cafe: 10, 'Dine In': 10, 'Cloud Kitchen': 10, 'Icecream Parlor': 10, 'Dine in & QSR': 10, Foodcourts: 10, 'Sweet Shop': 10 },
  Waiter_Calling_Device_status:       { Cafe: 10, 'Dine In': 10, 'Dine in & QSR': 10, QSR: 5 },
  Token_Management_status:            { QSR: 10, Cafe: 10, 'Cloud Kitchen': 10, 'Icecream Parlor': 10, 'Dine in & QSR': 10, Foodcourts: 10 },
  Swiggy_integration:                 { QSR: 10, Cafe: 10, 'Cloud Kitchen': 10, Bakery: 10, 'Dine in & QSR': 10, 'Sweet Shop': 10, 'Dine In': 5, 'Icecream Parlor': 5, 'Retail Store': 5, Foodcourts: 5 },
  Zomato_integration:                 { QSR: 10, Cafe: 10, 'Cloud Kitchen': 10, Bakery: 10, 'Dine in & QSR': 10, 'Sweet Shop': 10, 'Dine In': 5, 'Icecream Parlor': 5, 'Retail Store': 5, Foodcourts: 5 },
  Inventory_Points:                   { QSR: 10, Cafe: 10, 'Dine In': 10, 'Cloud Kitchen': 10, 'Icecream Parlor': 10, Bakery: 10, 'Dine in & QSR': 10, 'Retail Store': 10, Foodcourts: 10, 'Sweet Shop': 10 },
  Intellisense_status:                { QSR: 5, Cafe: 5, 'Dine In': 5, 'Cloud Kitchen': 5, 'Icecream Parlor': 5, Bakery: 5, 'Dine in & QSR': 5, 'Retail Store': 5, Foodcourts: 5, 'Sweet Shop': 5 },
  Petpooja_Loyalty_status:            { QSR: 5, Cafe: 5, 'Dine In': 5, 'Cloud Kitchen': 5, 'Icecream Parlor': 5, Bakery: 5, 'Dine in & QSR': 5, 'Retail Store': 5, Foodcourts: 5, 'Sweet Shop': 5 },
};

function isFieldActive(field, outlet) {
  if (field === 'Inventory_Points') return outlet.Inventory_Points && outlet.Inventory_Points.trim() !== '' && parseFloat(outlet.Inventory_Points) > 0;
  return outlet[field]?.trim().toLowerCase() === 'active';
}

function friendlyName(field) {
  return field.replace(/_status$|_integration$/, '').replace(/_/g, ' ');
}

const brandRecord = kamData.find(k => k['Brand Name '] && k['Brand Name '].toLowerCase().includes(searchTerm));
if (!brandRecord) {
  const result = { found: false, brandName: ${JSON.stringify(brandName)} };
  return result;
}
const brandEmail = brandRecord.email?.toLowerCase();
const brandNameFull = brandRecord['Brand Name ']?.trim();
const outlets = brandData.filter(b => b.email?.toLowerCase() === brandEmail);
const outletType = outlets[0]?.restaurant_type?.trim() || 'QSR';
const totalOutlets = outlets.length;

const criticalForType = Object.entries(MATRIX).filter(([, s]) => s[outletType] === 10).map(([f]) => f);
const niceForType     = Object.entries(MATRIX).filter(([, s]) => s[outletType] === 5).map(([f]) => f);

// Peer outlets: same outlet type, excluding this brand
const peerOutlets = brandData.filter(b => b.restaurant_type?.trim() === outletType && b.email?.toLowerCase() !== brandEmail);
const peerBrandCount = new Set(peerOutlets.map(o => o.email?.toLowerCase()).filter(Boolean)).size;

function peerRate(field) {
  if (peerOutlets.length === 0) return 0;
  return Math.round((peerOutlets.filter(o => isFieldActive(field, o)).length / peerOutlets.length) * 100);
}

// Build gap list — two tiers:
// Tier 1: peer-validated gaps (peer >= 20%) — strong pitch, competitor is doing it
// Tier 2: critical products with zero adoption — always worth pitching regardless of peer rate
const allFields = [...criticalForType, ...niceForType];

const tier1 = allFields.map(field => {
  const active = outlets.filter(o => isFieldActive(field, o)).length;
  const peer = peerRate(field);
  const isCritical = criticalForType.includes(field);
  if (active === totalOutlets) return null;
  if (peer < 20) return null;
  return {
    product: friendlyName(field),
    activeOutlets: active,
    totalOutlets,
    peerAdoption: peer,
    isCritical,
    isPartial: active > 0,
    score: (isCritical ? 1000 : 500) + (active === 0 ? 200 : 0) + peer,
  };
}).filter(Boolean).sort((a, b) => b.score - a.score);

// Tier 2: critical products with 0 adoption not already in tier1, sorted by peer rate desc
const tier1Products = new Set(tier1.map(g => g.product));
const tier2 = criticalForType.map(field => {
  const active = outlets.filter(o => isFieldActive(field, o)).length;
  const peer = peerRate(field);
  if (active > 0 || active === totalOutlets) return null; // only zero-adoption
  if (tier1Products.has(friendlyName(field))) return null; // already in tier1
  return {
    product: friendlyName(field),
    activeOutlets: 0,
    totalOutlets,
    peerAdoption: peer,
    isCritical: true,
    isPartial: false,
    score: peer,
  };
}).filter(Boolean).sort((a, b) => b.score - a.score);

// Combine: tier1 first, then fill from tier2 up to 10 candidates
const gaps = [...tier1, ...tier2].slice(0, 10);

const outletIds = new Set(outlets.map(o => o.restaurant_id));
const brandChurns = churnData.filter(c => outletIds.has(c.restaurant_id));
const churnReasons = [...new Set(brandChurns.map(c => c['Churn Reasons']).filter(Boolean))];

const result = {
  found: true,
  brandName: brandNameFull,
  outletType,
  outletCount: totalOutlets,
  healthStatuses: [...new Set(outlets.map(o => o['restaurant_health status']).filter(Boolean))],
  gaps: gaps.slice(0, 10),
  churnCount: brandChurns.length,
  churnReasons,
  peerCount: peerBrandCount,
};
`;

    const queryResult = this.queryEngine.executeGeneratedQuery(pitchQuery);

    if (!queryResult.success || !queryResult.data?.found) {
      return {
        answer: `I couldn't find brand "${brandName}" in the data. Please check the brand name and try again.`,
        error: queryResult.error,
      };
    }

    const d = queryResult.data;

    // Build pitch items entirely in code — Ollama only writes one rationale sentence per item
    type PitchItem = { product: string; stat: string; type: 'critical' | 'nice' | 'churn' | 'health' };
    const pitchItems: PitchItem[] = [];

    // Separate Swiggy + Zomato from the rest
    const swiggy = d.gaps.find((g: any) => g.product.toLowerCase() === 'swiggy');
    const zomato = d.gaps.find((g: any) => g.product.toLowerCase() === 'zomato');
    const otherGaps = d.gaps.filter((g: any) => !['swiggy', 'zomato'].includes(g.product.toLowerCase()));

    // --- PRIORITY ORDER ---
    // 1. Tier1 non-swiggy/zomato gaps (peer-validated, strongest pitch)
    const tier1Others = otherGaps.filter((g: any) => g.peerAdoption >= 20);
    for (const g of tier1Others) {
      const stat = g.isPartial
        ? `Only ${g.activeOutlets}/${g.totalOutlets} outlets use this — ${g.peerAdoption}% of similar ${d.outletType} brands have it active`
        : `0/${g.totalOutlets} outlets use this — ${g.peerAdoption}% of similar ${d.outletType} brands do`;
      pitchItems.push({ product: g.product, stat, type: g.isCritical ? 'critical' : 'nice' });
    }

    // 2. Swiggy & Zomato combined (always high priority if present)
    if (swiggy || zomato) {
      const parts: string[] = [];
      if (swiggy) parts.push(swiggy.isPartial
        ? `Swiggy: only ${swiggy.activeOutlets}/${swiggy.totalOutlets} outlets active (${swiggy.peerAdoption}% of peers use it)`
        : `Swiggy: 0/${swiggy.totalOutlets} outlets active (${swiggy.peerAdoption}% of peers use it)`);
      if (zomato) parts.push(zomato.isPartial
        ? `Zomato: only ${zomato.activeOutlets}/${zomato.totalOutlets} outlets active (${zomato.peerAdoption}% of peers use it)`
        : `Zomato: 0/${zomato.totalOutlets} outlets active (${zomato.peerAdoption}% of peers use it)`);
      const isCritical = (swiggy?.isCritical || zomato?.isCritical) ?? false;
      pitchItems.push({ product: 'Swiggy & Zomato Integration', stat: parts.join(' | '), type: isCritical ? 'critical' : 'nice' });
    }

    // 3. Churn (always include if present)
    if (d.churnCount > 0) {
      pitchItems.push({
        product: 'Churn Risk',
        stat: `${d.churnCount} outlet(s) have churned — reasons: ${d.churnReasons.join(', ') || 'unknown'}`,
        type: 'churn',
      });
    }

    // 4. Fill remaining slots up to 5 with tier2 gaps sorted by peer rate desc
    const usedProducts = new Set(pitchItems.map(p => p.product.toLowerCase()));
    const tier2Fillers = otherGaps
      .filter((g: any) => g.peerAdoption < 20 && !usedProducts.has(g.product.toLowerCase()))
      .sort((a: any, b: any) => b.peerAdoption - a.peerAdoption);
    for (const g of tier2Fillers) {
      if (pitchItems.length >= 5) break;
      const stat = g.peerAdoption > 0
        ? `0/${g.totalOutlets} outlets use this — ${g.peerAdoption}% of similar ${d.outletType} brands do`
        : `0/${g.totalOutlets} outlets use this — critical product for ${d.outletType} restaurants`;
      pitchItems.push({ product: g.product, stat, type: 'critical' });
    }



    const finalItems = pitchItems.slice(0, 5);

    if (finalItems.length === 0) {
      return {
        answer: `${d.brandName} (${d.outletType}, ${d.outletCount} outlet(s)) looks well-covered — no significant gaps vs ${d.peerCount} peer brands.`,
        queryResult,
        generatedQuery: pitchQuery,
      };
    }

    // Ollama writes ONE rationale sentence per item — nothing more
    const rationalePrompt = `For each item, write ONE sentence on why this product matters for a ${d.outletType} restaurant. Output a numbered list only — exactly ${finalItems.length} items, no extras, no combining.

${finalItems.map((item, i) => `${i + 1}. ${item.product}: ${item.stat}`).join('\n')}`;

    const rationaleResponse = await this.ollama.chat([
      { role: 'system', content: `Write exactly one sentence per numbered item. Output exactly ${finalItems.length} lines. No extras.` },
      { role: 'user', content: rationalePrompt },
    ]);

    const rationaleLines = rationaleResponse
      .split('\n')
      .filter(l => /^\d+\./.test(l.trim()))
      .map(l => l.replace(/^\d+\.\s*/, '').trim());

    const labelMap: Record<string, string> = {
      critical: '🔴 Critical',
      nice: '🟡 Nice to Have',
      churn: '⚠️ Churn',
      health: '⚠️ Health',
    };

    const lines = finalItems.map((item, i) => {
      const rationale = rationaleLines[i] || '';
      return `${i + 1}. **${item.product}** [${labelMap[item.type]}]\n   ${item.stat}.\n   ${rationale}`;
    });

    const answer =
      `Sales Pitch — ${d.brandName} | ${d.outletType} | ${d.outletCount} outlet(s) | ${d.peerCount} peer brands compared | ${finalItems.length} talking point(s)\n\n` +
      lines.join('\n\n');

    return { answer, queryResult, generatedQuery: pitchQuery };
  }

  async ask(question: string): Promise<AnalyticsResponse> {
    try {
      // Check for sales pitch intent first
      const pitchBrand = this.isSalesPitchRequest(question);
      if (pitchBrand) {
        return await this.generateSalesPitch(pitchBrand);
      }

      // Add user question to history
      this.conversationHistory.push({
        role: 'user',
        content: question,
      });

      console.log('🤖 Asking AI to generate query for:', question);

      // Get AI to generate query code
      const aiResponse = await this.ollama.chat(this.conversationHistory);
      
      console.log('📝 AI generated code:', aiResponse);
      
      // Add AI response to history
      this.conversationHistory.push({
        role: 'assistant',
        content: aiResponse,
      });

      // Extract JavaScript code from response
      let queryCode = aiResponse;
      
      // Remove markdown code blocks if present
      queryCode = queryCode.replace(/```javascript\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Execute the generated query
      const queryResult = this.queryEngine.executeGeneratedQuery(queryCode);
      
      if (!queryResult.success) {
        return {
          answer: `I generated a query but it failed to execute: ${queryResult.error}`,
          error: queryResult.error,
          generatedQuery: queryCode,
        };
      }

      // Ask AI to format the result into a human-readable answer
      const formatPrompt = `Based on this query result, provide a clear, concise answer to the user's question: "${question}"

Query Result:
${JSON.stringify(queryResult.data, null, 2)}

IMPORTANT: All monetary values are in Indian Rupees (INR). Use the ₹ symbol (not $) when displaying amounts.

Provide a natural language answer with the key information. Be specific with numbers and names.`;

      this.conversationHistory.push({
        role: 'user',
        content: formatPrompt,
      });

      const formattedAnswer = await this.ollama.chat(this.conversationHistory);
      
      this.conversationHistory.push({
        role: 'assistant',
        content: formattedAnswer,
      });

      console.log('✅ Final answer:', formattedAnswer);

      return {
        answer: formattedAnswer,
        queryResult: queryResult,
        generatedQuery: queryCode,
      };
    } catch (error) {
      console.error('❌ Error:', error);
      return {
        answer: 'Sorry, I encountered an error processing your question.',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async checkConnection(): Promise<boolean> {
    return await this.ollama.checkHealth();
  }

  clearHistory() {
    this.conversationHistory = this.conversationHistory.slice(0, 1); // Keep system prompt
  }
}
