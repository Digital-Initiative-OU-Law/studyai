// Test API connectivity and CORS
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Enable request interception to see API calls
  await page.setRequestInterception(true);
  
  const apiCalls = [];
  
  page.on('request', request => {
    const url = request.url();
    if (url.includes('localhost:8000') || url.includes('api')) {
      apiCalls.push({
        url: url,
        method: request.method(),
        headers: request.headers()
      });
    }
    request.continue();
  });
  
  page.on('response', response => {
    const url = response.url();
    if (url.includes('localhost:8000') || url.includes('api')) {
      console.log(`API Response: ${response.status()} ${url}`);
    }
  });
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`Console Error: ${msg.text()}`);
    }
  });
  
  console.log('Testing API connectivity from frontend...\n');
  
  // Test health endpoint directly
  console.log('1. Testing backend health endpoint directly:');
  try {
    const healthResponse = await page.evaluate(async () => {
      const response = await fetch('http://localhost:8000/health');
      const data = await response.json();
      return { status: response.status, data };
    });
    console.log(`   ✅ Health check: ${healthResponse.status}`, healthResponse.data);
  } catch (error) {
    console.log(`   ❌ Health check failed:`, error.message);
  }
  
  // Test from frontend context (will use NEXT_PUBLIC_API_BASE)
  console.log('\n2. Testing API from frontend context:');
  await page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
  
  try {
    const apiTest = await page.evaluate(async () => {
      // This should use the frontend's configured API base
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';
      const response = await fetch(`${apiBase}/health`);
      return { 
        apiBase,
        status: response.status,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      };
    });
    console.log(`   API Base: ${apiTest.apiBase}`);
    console.log(`   Response Status: ${apiTest.status}`);
    console.log(`   CORS Headers:`, apiTest.headers['access-control-allow-origin'] || 'Not present');
  } catch (error) {
    console.log(`   ❌ API test failed:`, error.message);
  }
  
  // Test login endpoint (POST with CORS)
  console.log('\n3. Testing login endpoint (POST with CORS):');
  try {
    const loginTest = await page.evaluate(async () => {
      const apiBase = 'http://localhost:8000';
      const response = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'testpassword'
        })
      });
      return { 
        status: response.status,
        ok: response.ok,
        headers: {
          cors: response.headers.get('access-control-allow-origin'),
          contentType: response.headers.get('content-type')
        }
      };
    });
    console.log(`   Response Status: ${loginTest.status}`);
    console.log(`   CORS Header: ${loginTest.headers.cors || 'Not present'}`);
  } catch (error) {
    console.log(`   ❌ Login test failed:`, error.message);
  }
  
  console.log('\n4. Summary of API calls made:');
  if (apiCalls.length > 0) {
    apiCalls.forEach(call => {
      console.log(`   ${call.method} ${call.url}`);
    });
  } else {
    console.log('   No API calls intercepted');
  }
  
  await browser.close();
})().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});