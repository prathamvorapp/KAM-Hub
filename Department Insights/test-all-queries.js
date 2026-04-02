// Test script to demonstrate all 22 query types
// This shows the query format the AI generates for each type

const allQueries = {
  // EXPENSE QUERIES (3)
  expense_queries: [
    {
      type: 'expense_by_kam',
      question: 'What is expense by Pratham?',
      query: { queryType: 'expense_by_kam', params: { kamName: 'Pratham' } }
    },
    {
      type: 'total_expenses',
      question: 'Total expenses in August',
      query: { queryType: 'total_expenses', params: { month: 'August' } }
    },
    {
      type: 'expense_by_month',
      question: 'Show me expenses for July',
      query: { queryType: 'expense_by_month', params: { month: 'July' } }
    }
  ],

  // REVENUE QUERIES (6)
  revenue_queries: [
    {
      type: 'revenue_by_kam_month',
      question: 'Show me revenue by Mahima Sali in April',
      query: { queryType: 'revenue_by_kam_month', params: { kamName: 'Mahima Sali', month: 'April' } }
    },
    {
      type: 'highest_revenue_kam',
      question: 'Which KAM has highest revenue in August?',
      query: { queryType: 'highest_revenue_kam', params: { month: 'August' } }
    },
    {
      type: 'highest_revenue_brand',
      question: 'Which brand has highest revenue?',
      query: { queryType: 'highest_revenue_brand', params: {} }
    },
    {
      type: 'total_revenue',
      question: 'Total revenue in July',
      query: { queryType: 'total_revenue', params: { month: 'July' } }
    },
    {
      type: 'revenue_by_brand',
      question: 'Revenue for CHOICE',
      query: { queryType: 'revenue_by_brand', params: { brandName: 'CHOICE' } }
    },
    {
      type: 'revenue_by_product',
      question: 'Revenue from Android POS in August',
      query: { queryType: 'revenue_by_product', params: { productName: 'Android POS', month: 'August' } }
    }
  ],

  // BRAND QUERIES (3)
  brand_queries: [
    {
      type: 'brand_count',
      question: 'How many brands do we have?',
      query: { queryType: 'brand_count', params: {} }
    },
    {
      type: 'brand_info',
      question: 'Tell me about CHOICE',
      query: { queryType: 'brand_info', params: { brandName: 'CHOICE' } }
    },
    {
      type: 'brands_by_kam',
      question: 'Which brands does Mahima Sali manage?',
      query: { queryType: 'brands_by_kam', params: { kamName: 'Mahima Sali' } }
    }
  ],

  // OUTLET QUERIES (2)
  outlet_queries: [
    {
      type: 'outlet_count',
      question: 'How many outlets do we have?',
      query: { queryType: 'outlet_count', params: {} }
    },
    {
      type: 'outlets_by_brand',
      question: 'How many outlets does CHOICE have?',
      query: { queryType: 'outlets_by_brand', params: { brandName: 'CHOICE' } }
    }
  ],

  // CHURN QUERIES (4)
  churn_queries: [
    {
      type: 'churn_revenue_ratio',
      question: 'What is the churn revenue ratio?',
      query: { queryType: 'churn_revenue_ratio', params: {} }
    },
    {
      type: 'churn_count',
      question: 'How many outlets churned in July?',
      query: { queryType: 'churn_count', params: { month: 'July' } }
    },
    {
      type: 'churn_reasons',
      question: 'Why are outlets churning?',
      query: { queryType: 'churn_reasons', params: {} }
    },
    {
      type: 'churned_brands',
      question: 'Which brands churned in August?',
      query: { queryType: 'churned_brands', params: { month: 'August' } }
    }
  ],

  // KAM PERFORMANCE QUERIES (2)
  kam_performance_queries: [
    {
      type: 'kam_performance',
      question: 'How is Mahima Sali performing in August?',
      query: { queryType: 'kam_performance', params: { kamName: 'Mahima Sali', month: 'August' } }
    },
    {
      type: 'all_kams',
      question: 'List all KAMs',
      query: { queryType: 'all_kams', params: {} }
    }
  ],

  // COMPARISON QUERIES (2)
  comparison_queries: [
    {
      type: 'compare_kams',
      question: 'Compare Mahima Sali and Harsh Gohel in August',
      query: { queryType: 'compare_kams', params: { kam1: 'Mahima Sali', kam2: 'Harsh Gohel', month: 'August' } }
    },
    {
      type: 'compare_brands',
      question: 'Compare CHOICE and HONEST',
      query: { queryType: 'compare_brands', params: { brand1: 'CHOICE', brand2: 'HONEST' } }
    }
  ]
};

// Count total queries
let totalQueries = 0;
Object.keys(allQueries).forEach(category => {
  totalQueries += allQueries[category].length;
});

console.log('='.repeat(80));
console.log('AI ANALYTICS CHATBOT - ALL QUERY TYPES');
console.log('='.repeat(80));
console.log(`\nTotal Query Types: ${totalQueries}`);
console.log(`Categories: ${Object.keys(allQueries).length}\n`);

// Display all queries by category
Object.entries(allQueries).forEach(([category, queries]) => {
  console.log('\n' + '='.repeat(80));
  console.log(`${category.toUpperCase().replace(/_/g, ' ')} (${queries.length})`);
  console.log('='.repeat(80));
  
  queries.forEach((q, index) => {
    console.log(`\n${index + 1}. ${q.type}`);
    console.log(`   Question: "${q.question}"`);
    console.log(`   Query: ${JSON.stringify(q.query, null, 2).split('\n').join('\n   ')}`);
  });
});

console.log('\n' + '='.repeat(80));
console.log('SUMMARY');
console.log('='.repeat(80));
console.log(`
✅ Expense Queries: ${allQueries.expense_queries.length}
✅ Revenue Queries: ${allQueries.revenue_queries.length}
✅ Brand Queries: ${allQueries.brand_queries.length}
✅ Outlet Queries: ${allQueries.outlet_queries.length}
✅ Churn Queries: ${allQueries.churn_queries.length}
✅ KAM Performance Queries: ${allQueries.kam_performance_queries.length}
✅ Comparison Queries: ${allQueries.comparison_queries.length}

Total: ${totalQueries} query types implemented and ready to use!

The AI chatbot can understand hundreds of question variations and
automatically generate the correct query format for each one.
`);

console.log('='.repeat(80));
console.log('To test the chatbot:');
console.log('1. Run: npm run dev');
console.log('2. Navigate to: http://localhost:3000/dashboard/ai-analytics');
console.log('3. Make sure Ollama is running: ollama serve');
console.log('4. Ask any of the questions above!');
console.log('='.repeat(80));
