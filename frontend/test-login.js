// Test script to run in browser console
async function testLogin() {
  console.log('Testing login functionality...');
  
  try {
    // Test 1: Check if API is reachable
    console.log('\n1. Testing API connectivity...');
    const testResponse = await fetch('/api/auth/test');
    const testData = await testResponse.json();
    console.log('✅ API test response:', testData);
    
    // Test 2: Check admin user exists
    console.log('\n2. Testing admin user...');
    const adminResponse = await fetch('/api/auth/test-admin');
    const adminData = await adminResponse.json();
    console.log('✅ Admin test response:', adminData);
    
    // Test 3: Test login
    console.log('\n3. Testing login...');
    const loginResponse = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: '0000',
        role: 'admin'
      })
    });
    
    console.log('✅ Login response status:', loginResponse.status);
    const loginData = await loginResponse.json();
    console.log('✅ Login response data:', loginData);
    
    // Test 4: Check cookies
    console.log('\n4. Checking cookies...');
    console.log('✅ All cookies:', document.cookie);
    
    return { success: true, data: { test: testData, admin: adminData, login: loginData } };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return { success: false, error: error.message };
  }
}

// Run the test
testLogin().then(result => {
  console.log('\n=== Test Complete ===');
  console.log('Result:', result);
}); 