const fetch = require('node-fetch');
const { Agent } = require('http');
const { Agent: HttpsAgent } = require('https');
const dotenv = require('dotenv');
dotenv.config();

// Create HTTPS agent that forces IPv4 for HTTPS URLs
const httpsAgent = new HttpsAgent({
  family: 4, // Force IPv4
  keepAlive: true,
  maxSockets: 10
});

// Create HTTP agent for HTTP URLs (fallback)
const httpAgent = new Agent({
  family: 4, // Force IPv4
  keepAlive: true,
  maxSockets: 10
});

const API_KEY = process.env.API_KEY;
const BASE_URL = 'https://api.neoxr.my.id/api';

const forwardRequest = async (res, endpoint, query) => {
  // Check if API_KEY is available
  if (!API_KEY) {
    console.error('API_KEY is not set in environment variables');
    return res.status(500).json({ error: 'API key configuration error' });
  }

  const queryParams = new URLSearchParams({ ...query, apikey: API_KEY }).toString();
  const url = `${BASE_URL}/${endpoint}?${queryParams}`;

  const now = new Date().toISOString();
  console.log(`[${now}] [REQUEST] ${endpoint} → ${url}`);
  console.log(`[${now}] [API_KEY] ${API_KEY ? 'Available' : 'Missing'}`);
  console.log(`[${now}] [NETWORK] Using IPv4 HTTPS agent for outbound requests`);

  // Retry logic with maximum 2 attempts
  const maxRetries = 2;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[${now}] [ATTEMPT] ${attempt}/${maxRetries} for ${endpoint}`);
      
      // Add timeout and headers for better compatibility
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NeoxrProxy/1.0)',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 30000, // Naikkan timeout ke 30 detik
        agent: url.startsWith('https:') ? httpsAgent : httpAgent // Use correct agent
      });
      
      // Check if response is ok
      if (!response.ok) {
        console.error(`[${now}] [HTTP_ERROR] ${endpoint} ✗ Status: ${response.status} ${response.statusText}`);
        
        // For certain HTTP errors, do not retry for these status codes
        if (response.status === 404 || response.status === 401 || response.status === 403) {
          return res.status(500).json({ 
            error: 'Failed to fetch data',
            details: `HTTP ${response.status}: ${response.statusText}`
          });
        }
        
        // For other status codes, try to retry
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error(`[${now}] [CONTENT_ERROR] ${endpoint} ✗ Expected JSON, got: ${contentType}`);
        const text = await response.text();
        console.error(`[${now}] [RESPONSE_TEXT] ${text.substring(0, 200)}...`);
        return res.status(500).json({ 
          error: 'Failed to fetch data',
          details: 'Invalid response format from API'
        });
      }

      const data = await response.json();
      console.log(`[${now}] [SUCCESS] ${endpoint} ✓ (attempt ${attempt})`);
      return res.json(data);
      
    } catch (err) {
      lastError = err;
      console.error(`[${now}] [ERROR] ${endpoint} ✗ Attempt ${attempt}`, {
        message: err.message,
        code: err.code,
        type: err.type
      });
      
      // If this is not the last attempt and the error is retryable
      if (attempt < maxRetries && (err.code === 'ETIMEDOUT' || err.message.includes('timeout') || err.code === 'ECONNRESET')) {
        console.log(`[${now}] [RETRY] ${endpoint} → Will retry in 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
        continue;
      }
      
      // If this is the last attempt or the error is not retryable, break
      break;
    }
  }
  
  // If it reaches here, all attempts have failed
  let errorMessage = 'Failed to fetch data';
  let errorDetails = lastError.message;
  
  // Provide more specific error messages
  if (lastError.code === 'ENOTFOUND') {
    errorDetails = 'DNS resolution failed - cannot reach Neoxr API';
  } else if (lastError.code === 'ECONNREFUSED') {
    errorDetails = 'Connection refused - Neoxr API might be down';
  } else if (lastError.code === 'ETIMEDOUT' || lastError.message.includes('timeout')) {
    errorDetails = 'Request timeout - Neoxr API is not responding after multiple attempts';
  }
  
  res.status(500).json({ 
    error: errorMessage,
    details: errorDetails,
    attempts: maxRetries
  });
};

module.exports = forwardRequest;
