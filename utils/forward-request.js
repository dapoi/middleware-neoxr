const fetch = require('node-fetch');
const dotenv = require('dotenv');
dotenv.config();

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

  try {
    // Add timeout and headers for better compatibility
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NeoxrProxy/1.0)',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 15000 // 15 seconds timeout
    });
    
    // Check if response is ok
    if (!response.ok) {
      console.error(`[${now}] [HTTP_ERROR] ${endpoint} ✗ Status: ${response.status} ${response.statusText}`);
      return res.status(500).json({ 
        error: 'Gagal ambil data dari Neoxr',
        details: `HTTP ${response.status}: ${response.statusText}`,
        url: BASE_URL // Don't expose full URL with API key
      });
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error(`[${now}] [CONTENT_ERROR] ${endpoint} ✗ Expected JSON, got: ${contentType}`);
      const text = await response.text();
      console.error(`[${now}] [RESPONSE_TEXT] ${text.substring(0, 200)}...`);
      return res.status(500).json({ 
        error: 'Gagal ambil data dari Neoxr',
        details: 'Invalid response format from API'
      });
    }

    const data = await response.json();
    console.log(`[${now}] [SUCCESS] ${endpoint} ✓`);
    res.json(data);
  } catch (err) {
    console.error(`[${now}] [ERROR] ${endpoint} ✗`, {
      message: err.message,
      code: err.code,
      type: err.type,
      stack: err.stack?.split('\n')[0] // Only first line of stack
    });
    
    let errorMessage = 'Gagal ambil data dari Neoxr';
    let errorDetails = err.message;
    
    // Provide more specific error messages
    if (err.code === 'ENOTFOUND') {
      errorDetails = 'DNS resolution failed - cannot reach Neoxr API';
    } else if (err.code === 'ECONNREFUSED') {
      errorDetails = 'Connection refused - Neoxr API might be down';
    } else if (err.code === 'ETIMEDOUT') {
      errorDetails = 'Request timeout - Neoxr API is not responding';
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: errorDetails 
    });
  }
};

module.exports = forwardRequest;
