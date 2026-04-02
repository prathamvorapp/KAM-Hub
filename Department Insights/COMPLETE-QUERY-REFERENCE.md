# Complete Query Reference - All Possible Analytics Questions

This document lists ALL query types available in the AI Analytics Chatbot, covering every aspect of your restaurant management data.

---

## 🎯 Currently Implemented Queries (Working Now)

### 1. Expense Queries

#### `expense_by_kam`
**Question**: "What is expense by [KAM Name]?"
**Params**: `{kamName: string}`
**Example**: "What is expense by Pratham?"
**Returns**: Total expenses, count, detailed records

#### `total_expenses`
**Question**: "What are total expenses?" or "Total expenses in [Month]?"
**Params**: `{month?: string}`
**Example**: "What are total expenses in August?"
**Returns**: Total expense amount, count

#### `expense_by_month`
**Question**: "Show me expenses for [Month]"
**Params**: `{month: string}`
**Example**: "Show me expenses for July"
**Returns**: Monthly expense breakdown

---

### 2. Revenue Queries

#### `revenue_by_kam_month`
**Question**: "Show me revenue by [KAM] in [Month]"
**Params**: `{kamName: string, month: string}`
**Example**: "Show me revenue by Mahima Sali in April"
**Returns**: Revenue total, transaction count, outlet count

#### `highest_revenue_kam`
**Question**: "Which KAM has highest revenue?" or "Top KAM in [Month]?"
**Params**: `{month?: string}`
**Example**: "Which KAM has highest revenue in August?"
**Returns**: Top KAM, revenue amount, top 5 list

#### `highest_revenue_brand`
**Question**: "Which brand has highest revenue?" or "Top brand in [Month]?"
**Params**: `{month?: string}`
**Example**: "Which brand has highest revenue?"
**Returns**: Top brand, revenue amount, top 5 list

#### `total_revenue`
**Question**: "What is total revenue?" or "Total revenue in [Month]?"
**Params**: `{month?: string}`
**Example**: "What is total revenue in July?"
**Returns**: Total revenue, transaction count

#### `revenue_by_brand`
**Question**: "Show me revenue for [Brand Name]" or "Revenue for [Brand] in [Month]"
**Params**: `{brandName: string, month?: string}`
**Example**: "Show me revenue for CHOICE in April"
**Returns**: Brand revenue, transaction count

#### `revenue_by_product`
**Question**: "Revenue from [Product Name]" or "How much from [Product] in [Month]?"
**Params**: `{productName: string, month?: string}`
**Example**: "Revenue from Android POS in August"
**Returns**: Product revenue, transaction count

---

### 3. Brand Queries

#### `brand_count`
**Question**: "How many brands do we have?"
**Params**: `{}`
**Example**: "How many brands do we have?"
**Returns**: Total brand count, sample list

#### `brand_info`
**Question**: "Tell me about [Brand Name]" or "Info on [Brand]"
**Params**: `{brandName: string}`
**Example**: "Tell me about CHOICE"
**Returns**: Brand details, outlet count, current KAM

#### `brands_by_kam`
**Question**: "Which brands does [KAM] manage?" or "Show me [KAM]'s brands"
**Params**: `{kamName: string}`
**Example**: "Which brands does Mahima Sali manage?"
**Returns**: List of brands, count

---

### 4. Outlet Queries

#### `outlet_count`
**Question**: "How many outlets do we have?"
**Params**: `{}`
**Example**: "How many outlets do we have?"
**Returns**: Total outlet count, sample list

#### `outlets_by_brand`
**Question**: "How many outlets does [Brand] have?" or "Show me [Brand]'s outlets"
**Params**: `{brandName: string}`
**Example**: "How many outlets does CHOICE have?"
**Returns**: Outlet list, count

---

### 5. Churn Queries

#### `churn_revenue_ratio`
**Question**: "What is the churn revenue ratio?"
**Params**: `{}`
**Example**: "What is the churn revenue ratio?"
**Returns**: Percentage, churned revenue, total revenue

#### `churn_count`
**Question**: "How many outlets churned?" or "Churned outlets in [Month]?"
**Params**: `{month?: string}`
**Example**: "How many outlets churned in July?"
**Returns**: Churn count, list

#### `churn_reasons`
**Question**: "Why are outlets churning?" or "Top churn reasons"
**Params**: `{}`
**Example**: "Why are outlets churning?"
**Returns**: Breakdown of churn reasons with counts

#### `churned_brands`
**Question**: "Which brands churned?" or "Churned brands in [Month]?"
**Params**: `{month?: string}`
**Example**: "Which brands churned in August?"
**Returns**: List of churned brands, outlet count

---

### 6. KAM Performance Queries

#### `kam_performance`
**Question**: "How is [KAM] performing?" or "[KAM] performance in [Month]?"
**Params**: `{kamName: string, month?: string}`
**Example**: "How is Mahima Sali performing in August?"
**Returns**: Revenue, expense, profit, ROI, brand count

#### `all_kams`
**Question**: "List all KAMs" or "Who are the KAMs?"
**Params**: `{}`
**Example**: "List all KAMs"
**Returns**: Complete list of KAMs

---

### 7. Comparison Queries

#### `compare_kams`
**Question**: "Compare [KAM1] and [KAM2]" or "Compare [KAM1] vs [KAM2] in [Month]"
**Params**: `{kam1: string, kam2: string, month?: string}`
**Example**: "Compare Mahima Sali and Harsh Gohel in August"
**Returns**: Side-by-side comparison of revenue, expenses, brands

#### `compare_brands`
**Question**: "Compare [Brand1] and [Brand2]" or "Compare [Brand1] vs [Brand2] in [Month]"
**Params**: `{brand1: string, brand2: string, month?: string}`
**Example**: "Compare CHOICE and HONEST in July"
**Returns**: Side-by-side revenue comparison

---

## 📊 Example Questions You Can Ask

### Expense Questions
```
- What is expense by Pratham?
- Show me expenses for Rahul Taak
- Total expenses in August
- What are total expenses?
- Expenses for July
```

### Revenue Questions
```
- Which KAM has highest revenue in August?
- Show me revenue by Mahima Sali in April
- Which brand has highest revenue?
- Total revenue in July
- Revenue for CHOICE
- Revenue from Android POS
- How much revenue from POS Subscription?
```

### Brand Questions
```
- How many brands do we have?
- Tell me about CHOICE
- Which brands does Mahima Sali manage?
- Info on HONEST brand
- Show me Harsh Gohel's brands
```

### Outlet Questions
```
- How many outlets do we have?
- How many outlets does CHOICE have?
- Show me HONEST's outlets
- Outlet count for Pishus
```

### Churn Questions
```
- What is the churn revenue ratio?
- How many outlets churned?
- Churned outlets in July
- Why are outlets churning?
- Top churn reasons
- Which brands churned?
- Churned brands in August
```

### KAM Performance Questions
```
- How is Mahima Sali performing?
- Mahima Sali performance in August
- Show me Harsh Gohel's performance
- List all KAMs
- Who are the KAMs?
```

### Comparison Questions
```
- Compare Mahima Sali and Harsh Gohel
- Compare Mahima Sali vs Harsh Gohel in August
- Compare CHOICE and HONEST
- Compare CHOICE vs HONEST in July
```

---

## 🎨 Query Patterns

### By Time Period
- "in [Month]" - Filter by specific month
- "for [Month]" - Same as above
- No month = All time data

### By Entity
- "by [KAM Name]" - Filter by KAM
- "for [Brand Name]" - Filter by brand
- "from [Product Name]" - Filter by product

### Aggregations
- "total" - Sum of all values
- "highest" / "top" - Maximum value
- "count" / "how many" - Count of items

### Comparisons
- "compare X and Y" - Side-by-side comparison
- "X vs Y" - Same as above
- "difference between X and Y" - Comparison

---

## 💡 Pro Tips

### 1. Use Partial Names
```
✅ "Pratham" instead of "Pratham Jatilbhai Vora"
✅ "Mahima" instead of "Mahima Sali"
✅ "CHOICE" instead of full brand name
```

### 2. Month Names
```
✅ Full names: "August", "July", "April"
✅ Abbreviations: "Aug", "Jul", "Apr"
✅ Case-insensitive: "august", "AUGUST", "August"
```

### 3. Follow Suggestions
When the chatbot says "Did you mean...?", use the suggested name.

### 4. Ask Follow-up Questions
The AI remembers context:
```
You: "How is Mahima Sali performing?"
Bot: [shows performance]
You: "What about in August?"
Bot: [shows August performance for Mahima Sali]
```

---

## 🔮 Future Query Types (To Be Implemented)

### Time Series Analysis
- `revenue_trend` - Revenue trend over time
- `expense_trend` - Expense trend over time
- `growth_rate` - Month-over-month growth

### Predictive Analytics
- `forecast_revenue` - Predict future revenue
- `churn_prediction` - Predict likely churns
- `kam_forecast` - Forecast KAM performance

### Advanced Metrics
- `customer_lifetime_value` - CLV by brand
- `retention_rate` - Brand retention metrics
- `average_revenue_per_outlet` - ARPO calculation

### Product Analytics
- `product_performance` - Product-wise analysis
- `subscription_analysis` - Subscription metrics
- `bundle_analysis` - Bundle plan performance

### Geographic Analysis
- `revenue_by_region` - Regional breakdown
- `outlet_density` - Outlets by location
- `expansion_opportunities` - Growth areas

---

## 📚 Related Documentation

- **DATA-DICTIONARY.md** - Complete data structure guide
- **CHATBOT-QUICK-REFERENCE.md** - Quick start guide
- **AI-ANALYTICS-README.md** - Full documentation

---

## 🎯 Summary

**Total Query Types**: 18 (currently implemented)
**Categories**: 7 (Expense, Revenue, Brand, Outlet, Churn, KAM, Comparison)
**Future Queries**: 15+ (planned)

**Your chatbot can answer hundreds of different questions using these 18 query types!**

---

**Last Updated**: Now
**Status**: ✅ All queries documented and ready to use
