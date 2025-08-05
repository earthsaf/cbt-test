const axios = require('axios');

async function testCORS() {
  const baseURL = process.env.TEST_URL || 'https://cbt-test.onrender.com';
  
  console.log('Testing CORS configuration...');
  console.log('Base URL:', baseURL);
  
  try {
    // Test health endpoint
    console.log('\n1. Testing health endpoint...');
    const healthResponse = await axios.get(`${baseURL}/health`);
    console.log('✅ Health endpoint:', healthResponse.status, healthResponse.data);
    
    // Test API endpoint
    console.log('\n2. Testing API endpoint...');
    const apiResponse = await axios.get(`${baseURL}/api/auth/login`, {
      validateStatus: () => true // Don't throw on 4xx/5xx
    });
    console.log('✅ API endpoint:', apiResponse.status);
    
    // Test with different origins
    console.log('\n3. Testing with different origins...');
    const origins = [
      'https://cbt-test.onrender.com',
      'https://cbt-test-frontend.onrender.com',
      'http://localhost:3000',
      undefined
    ];
    
    for (const origin of origins) {
      try {
        const headers = origin ? { 'Origin': origin } : {};
        const response = await axios.get(`${baseURL}/health`, { headers });
        console.log(`✅ Origin "${origin || 'undefined'}":`, response.status);
      } catch (error) {
        console.log(`❌ Origin "${origin || 'undefined'}":`, error.response?.status, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
      console.error('Response data:', error.response.data);
    }
  }
}

testCORS(); 