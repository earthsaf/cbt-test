// Simple test to verify API connection
const testAPI = async () => {
  const baseURL = window.location.origin + '/api';
  console.log('Testing API connection to:', baseURL);
  
  try {
    // Test health endpoint
    const healthResponse = await fetch(`${baseURL.replace('/api', '')}/health`);
    console.log('Health endpoint status:', healthResponse.status);
    
    // Test API endpoint
    const apiResponse = await fetch(`${baseURL}/auth/login`, {
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
    
    console.log('API endpoint status:', apiResponse.status);
    const data = await apiResponse.json();
    console.log('API response:', data);
    
  } catch (error) {
    console.error('API test failed:', error);
  }
};

// Run test if in browser
if (typeof window !== 'undefined') {
  testAPI();
} 