const http = require('http');

function testAPI() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:3000/api/data', (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          const brands = jsonData.brands;
          
          console.log('=== Final Verification ===\n');
          console.log(`Total brands: ${brands.length}`);
          console.log(`Brands with KAM: ${brands.filter(b => b.kam_assignment).length}`);
          
          // Count unique emails with KAM
          const uniqueEmailsWithKAM = new Set();
          brands.forEach(b => {
            if (b.kam_assignment) {
              uniqueEmailsWithKAM.add(b.email.toLowerCase());
            }
          });
          console.log(`Unique emails with KAM: ${uniqueEmailsWithKAM.size}`);
          console.log(`Expected: 1207`);
          
          // Monthly counts
          console.log('\n=== Monthly Brand Counts ===\n');
          
          const months = [
            { name: 'April 2025', end: new Date(2025, 3, 30, 23, 59, 59, 999), expected: 752 },
            { name: 'May 2025', end: new Date(2025, 4, 31, 23, 59, 59, 999), expected: 794 },
            { name: 'June 2025', end: new Date(2025, 5, 30, 23, 59, 59, 999), expected: 870 },
            { name: 'July 2025', end: new Date(2025, 6, 31, 23, 59, 59, 999), expected: 917 },
            { name: 'August 2025', end: new Date(2025, 7, 31, 23, 59, 59, 999), expected: 955 },
            { name: 'September 2025', end: new Date(2025, 8, 30, 23, 59, 59, 999), expected: 1013 },
          ];
          
          months.forEach(month => {
            const emails = new Set();
            brands.forEach(b => {
              if (b.kam_assignment?.assign_date_1) {
                const assignDate = new Date(b.kam_assignment.assign_date_1);
                if (assignDate <= month.end) {
                  emails.add(b.email.toLowerCase());
                }
              }
            });
            const match = emails.size === month.expected ? '✓' : '✗';
            console.log(`${month.name}: ${emails.size} (expected: ${month.expected}) ${match}`);
          });
          
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

setTimeout(() => {
  testAPI().catch(console.error);
}, 1000);
