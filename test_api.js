// Simple API test script
const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function testAPI() {
  console.log('🧪 Testing Barber App API...\n');

  try {
    // Test 1: Get nearby barbers
    console.log('1. Testing nearby barbers...');
    const barbersResponse = await axios.get(`${API_BASE}/barbers/nearby?lat=40.7128&lng=-74.0060&radius=10`);
    console.log('✅ Found barbers:', barbersResponse.data.length);
    console.log('   First barber:', barbersResponse.data[0]?.shop_name || 'None');

    // Test 2: Get barber services
    if (barbersResponse.data.length > 0) {
      const barberId = barbersResponse.data[0].id;
      console.log('\n2. Testing barber services...');
      const servicesResponse = await axios.get(`${API_BASE}/barbers/${barberId}/services`);
      console.log('✅ Found services:', servicesResponse.data.length);
      servicesResponse.data.forEach(service => {
        console.log(`   - ${service.name}: $${service.price} (${service.duration}min)`);
      });
    }

    // Test 3: Test authentication
    console.log('\n3. Testing authentication...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'mike@barbershop.com',
      password: 'password123'
    });
    console.log('✅ Login successful for:', loginResponse.data.user.firstName);

    console.log('\n🎉 All API tests passed!');

  } catch (error) {
    console.error('❌ API Test failed:', error.response?.data?.error || error.message);
  }
}

testAPI();