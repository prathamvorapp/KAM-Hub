const axios = require('axios');

const BASE_URL = 'http://localhost:3022';
const credentials = {
  email: 'rahul.taak@petpooja.com',
  password: 'Test@123'
};

let sessionCookie = '';

async function login() {
  try {
    console.log('🔐 Logging in...');
    const response = await axios.post(`${BASE_URL}/api/auth/login`, credentials);
    
    if (response.data.success) {
      console.log('✅ Login successful!');
      console.log('User:', response.data.user);
      
      // Extract session cookie
      const cookies = response.headers['set-cookie'];
      if (cookies) {
        sessionCookie = cookies.find(c => c.startsWith('user-session='));
        console.log('🍪 Session cookie obtained');
      }
      
      return response.data.user;
    } else {
      console.error('❌ Login failed:', response.data.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Login error:', error.response?.data || error.message);
    return null;
  }
}

async function getBrands(search = '') {
  try {
    console.log('\n📊 Fetching brands...');
    const url = `${BASE_URL}/api/data/master-data?page=1&limit=1000${search ? `&search=${search}` : ''}`;
    
    const response = await axios.get(url, {
      headers: {
        'Cookie': sessionCookie
      }
    });
    
    if (response.data.success) {
      // Debug: Check the actual structure
      console.log('📋 Response structure:', JSON.stringify(response.data, null, 2).substring(0, 500));
      
      const brands = response.data.data.data || response.data.data || [];
      console.log(`✅ Found ${brands.length} brands`);
      
      // Show first 10 brands
      console.log('\n📋 Brand List (first 10):');
      brands.slice(0, 10).forEach((brand, index) => {
        console.log(`${index + 1}. ${brand.brandName || brand.brand_name || 'N/A'} (${brand.kamEmailId || brand.kam_email_id || 'N/A'})`);
      });
      
      return brands;
    } else {
      console.error('❌ Failed to fetch brands:', response.data.error);
      return [];
    }
  } catch (error) {
    console.error('❌ Error fetching brands:', error.response?.data || error.message);
    return [];
  }
}

async function searchBrand(brandName) {
  try {
    console.log(`\n🔍 Searching for brand: ${brandName}`);
    const brands = await getBrands(brandName);
    
    const exactMatch = brands.find(b => {
      const name = b.brandName || b.brand_name || '';
      return name.toLowerCase().includes(brandName.toLowerCase());
    });
    
    if (exactMatch) {
      const name = exactMatch.brandName || exactMatch.brand_name;
      const id = exactMatch._id || exactMatch.id;
      const kam = exactMatch.kamEmailId || exactMatch.kam_email_id;
      const zone = exactMatch.zone;
      
      console.log(`\n✅ Found brand: ${name}`);
      console.log(`   ID: ${id}`);
      console.log(`   KAM: ${kam}`);
      console.log(`   Zone: ${zone || 'N/A'}`);
      return exactMatch;
    } else {
      console.log(`❌ Brand "${brandName}" not found`);
      return null;
    }
  } catch (error) {
    console.error('❌ Error searching brand:', error.message);
    return null;
  }
}

async function getVisits() {
  try {
    console.log('\n📅 Fetching visits...');
    const response = await axios.get(`${BASE_URL}/api/data/visits?limit=1000`, {
      headers: {
        'Cookie': sessionCookie
      }
    });
    
    console.log('📋 Visits response:', JSON.stringify(response.data, null, 2).substring(0, 500));
    
    // Handle both response formats
    const visits = response.data.success ? response.data.data : response.data.data || [];
    console.log(`✅ Found ${visits.length} visits`);
    
    // Show visit summary
    const scheduled = visits.filter(v => v.visit_status === 'Scheduled').length;
    const completed = visits.filter(v => v.visit_status === 'Visit Done').length;
    const pending = visits.filter(v => v.visit_status === 'Completed').length;
    
    console.log(`\n📊 Visit Summary:`);
    console.log(`   Scheduled: ${scheduled}`);
    console.log(`   Completed (MOM Pending): ${pending}`);
    console.log(`   Visit Done: ${completed}`);
    
    // Show first 5 visits
    if (visits.length > 0) {
      console.log(`\n📋 Recent Visits (first 5):`);
      visits.slice(0, 5).forEach((visit, index) => {
        console.log(`${index + 1}. ${visit.brand_name} - ${visit.visit_status} (${visit.scheduled_date})`);
      });
    }
    
    return visits;
  } catch (error) {
    console.error('❌ Error fetching visits:', error.response?.data || error.message);
    return [];
  }
}

async function scheduleVisit(brandId, brandName, scheduledDate) {
  try {
    console.log(`\n📅 Scheduling visit for ${brandName} on ${scheduledDate}...`);
    
    const visitData = {
      brand_id: brandId,
      brand_name: brandName,
      scheduled_date: scheduledDate,
      visit_status: 'Scheduled',
      visit_year: new Date(scheduledDate).getFullYear().toString()
    };
    
    console.log('📤 Sending visit data:', visitData);
    
    const response = await axios.post(`${BASE_URL}/api/data/visits`, visitData, {
      headers: {
        'Cookie': sessionCookie,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📋 Schedule response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success) {
      console.log('✅ Visit scheduled successfully!');
      console.log('Visit ID:', response.data.data._id || response.data.data.id);
      return response.data.data;
    } else {
      console.error('❌ Failed to schedule visit:', response.data.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Error scheduling visit:', error.response?.data || error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Starting Visit Flow Test\n');
  console.log('=' .repeat(50));
  
  // Step 1: Login
  const user = await login();
  if (!user) {
    console.error('\n❌ Cannot proceed without login');
    return;
  }
  
  // Step 2: Get all brands and count
  const brands = await getBrands();
  console.log(`\n📊 Total Brand Count: ${brands.length}`);
  
  // Step 3: Search for "Madam Chocolate" brand
  const madamChocolate = await searchBrand('Madam Chocolate');
  
  // Step 4: Get current visits
  await getVisits();
  
  // Step 5: Schedule visit for Madam Chocolate if found
  if (madamChocolate) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const scheduledDate = tomorrow.toISOString().split('T')[0];
    
    const brandId = madamChocolate.id || madamChocolate._id;
    const brandName = madamChocolate.brand_name || madamChocolate.brandName;
    
    await scheduleVisit(brandId, brandName, scheduledDate);
    
    // Refresh visits to show the new one
    console.log('\n🔄 Refreshing visits...');
    await getVisits();
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Test completed!');
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
