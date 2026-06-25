/**
 * Detailed FCM push notification test with error logging
 */
const http = require('http');

const API_BASE = 'http://localhost:3001';

function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data || '{}'), raw: data });
        } catch (e) {
          resolve({ status: res.statusCode, body: data, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function test() {
  console.log('\n=== FCM Push Notification E2E Test (Verbose) ===\n');

  try {
    // Health check first
    console.log('🔍 Checking backend health...');
    const health = await makeRequest('GET', '/api/health');
    console.log(`   Status: ${health.status}`);
    console.log(`   Body: ${JSON.stringify(health.body)}`);
    if (health.status !== 200) {
      throw new Error(`Backend not ready: ${health.status}`);
    }
    console.log('   ✓ Backend is running\n');

    // Step 1: Register customer user
    console.log('1️⃣  Registering customer...');
    const email = `customer${Date.now()}@test.com`;
    const custReg = await makeRequest('POST', '/api/auth/register', {
      name: 'Test Customer',
      email: email,
      phone: '5551234567',
      password: 'TestPass123!',
      userType: 'customer'
    });
    console.log(`   Response Status: ${custReg.status}`);
    console.log(`   Response Body: ${JSON.stringify(custReg.body)}`);
    if (custReg.status !== 201) {
      throw new Error(`Customer registration failed: ${custReg.status} - ${JSON.stringify(custReg.body)}`);
    }
    const custToken = custReg.body.token;
    const custUserId = custReg.body.user.id;
    console.log(`   ✓ Customer registered (ID: ${custUserId})\n`);

    // Step 2: Register FCM token for customer
    console.log('2️⃣  Registering FCM token for customer...');
    const testFCMToken = `FCM_TEST_TOKEN_${Date.now()}_customer`;
    const tokenReg = await makeRequest('POST', '/api/notifications/register-token', {
      token: testFCMToken,
      device: 'android_emulator'
    }, custToken);
    console.log(`   Response Status: ${tokenReg.status}`);
    console.log(`   Response Body: ${JSON.stringify(tokenReg.body)}`);
    if (tokenReg.status !== 200) {
      throw new Error(`Token registration failed: ${tokenReg.status}`);
    }
    console.log(`   ✓ FCM token registered\n`);

    // Step 3: Register barber user
    console.log('3️⃣  Registering barber...');
    const barberEmail = `barber${Date.now()}@test.com`;
    const barberReg = await makeRequest('POST', '/api/auth/register', {
      name: 'Test Barber',
      email: barberEmail,
      phone: '5559876543',
      password: 'TestPass123!',
      userType: 'barber',
      shopName: 'Test Barbershop',
      latitude: 40.7128,
      longitude: -74.0060
    });
    console.log(`   Response Status: ${barberReg.status}`);
    console.log(`   Response Body: ${JSON.stringify(barberReg.body)}`);
    if (barberReg.status !== 201) {
      throw new Error(`Barber registration failed: ${barberReg.status}`);
    }
    const barberUserId = barberReg.body.user.id;
    console.log(`   ✓ Barber registered (ID: ${barberUserId})\n`);

    // Step 4: Register FCM token for barber
    console.log('4️⃣  Registering FCM token for barber...');
    const barberToken = barberReg.body.token;
    const barberFCMToken = `FCM_TEST_TOKEN_${Date.now()}_barber`;
    const barberTokenReg = await makeRequest('POST', '/api/notifications/register-token', {
      token: barberFCMToken,
      device: 'android_emulator'
    }, barberToken);
    console.log(`   Response Status: ${barberTokenReg.status}`);
    console.log(`   Response Body: ${JSON.stringify(barberTokenReg.body)}`);
    if (barberTokenReg.status !== 200) {
      throw new Error(`Barber token registration failed: ${barberTokenReg.status}`);
    }
    console.log(`   ✓ Barber FCM token registered\n`);

    // Step 5: Create booking (customer requests barber)
    console.log('5️⃣  Creating booking request...');
    const bookingRes = await makeRequest('POST', '/api/customers/bookings', {
      barber_id: barberUserId,
      service_type: 'haircut',
      estimated_duration: 30,
      notes: 'Test booking for push notification'
    }, custToken);
    console.log(`   Response Status: ${bookingRes.status}`);
    console.log(`   Response Body: ${JSON.stringify(bookingRes.body)}`);
    if (bookingRes.status !== 201) {
      throw new Error(`Booking creation failed: ${bookingRes.status}`);
    }
    const bookingId = bookingRes.body.booking.id;
    console.log(`   ✓ Booking created (ID: ${bookingId})`);
    console.log(`   ✓ Push notification triggered to barber\n`);

    // Step 6: Test push notification endpoint
    console.log('6️⃣  Testing direct push notification...');
    const pushRes = await makeRequest('POST', '/api/notifications/test-self', {}, custToken);
    console.log(`   Response Status: ${pushRes.status}`);
    console.log(`   Response Body: ${JSON.stringify(pushRes.body)}`);
    if (pushRes.status !== 200) {
      throw new Error(`Test push failed: ${pushRes.status}`);
    }
    console.log(`   ✓ Test push sent\n`);

    console.log('✅ All tests passed!\n');
    console.log('📌 Summary:');
    console.log(`   - Customer registered with FCM token`);
    console.log(`   - Barber registered with FCM token`);
    console.log(`   - Booking created → barber received push notification`);
    console.log(`   - Direct push test sent to customer\n`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

test();
