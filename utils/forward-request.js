const fetch = require('node-fetch');
const { Agent } = require('http');
const { Agent: HttpsAgent } = require('https');
const dotenv = require('dotenv');
dotenv.config();

// In-memory request counting (resets on server restart)
const requestCounts = new Map();

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

// Simple logging config - no env needed!
const HIDE_TIMEOUT_ERRORS = true;    // Set false if you want to see timeout details
const SHOW_SIMPLE_LOGS = true;       // Set false to disable all logs

const forwardRequest = async (res, endpoint, query) => {
  // Get user info for logging
  const req = res.req;
  const userIP = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
  const packageName = req.headers['x-package-name'] || '-';
  
  // Track request count per IP per day
  const currentDate = new Date().toDateString();
  const countKey = `${userIP}-${currentDate}`;
  const currentCount = (requestCounts.get(countKey) || 0) + 1;
  requestCounts.set(countKey, currentCount);
  
  // Clean up old counts (keep only current and previous day)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayDate = yesterday.toDateString();
  for (const [key] of requestCounts) {
    if (!key.includes(currentDate) && !key.includes(yesterdayDate)) {
      requestCounts.delete(key);
    }
  }
  // Log endpoint usage for analytics, including X-Package-Name header, method, and IP
  try {
    const req = res.req;
    let packageName = (req && req.headers && req.headers['x-package-name']) || '-';
    const method = (req && req.method) || '-';
    const ip = (req && (req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.socket?.remoteAddress)) || '-';
    const usageLog = `[{time}] {method} {endpoint} | package: {package} | ip: {ip} | count: {count}/day\n`
      .replace('{time}', new Date().toISOString())
      .replace('{method}', method)
      .replace('{endpoint}', endpoint)
      .replace('{package}', packageName)
      .replace('{ip}', ip)
      .replace('{count}', currentCount);
    require('fs').appendFile(
      require('path').join(__dirname, '../usage.log'),
      usageLog,
      err => { if (err && process.env.NODE_ENV !== 'production') console.error('Usage log error:', err); }
    );
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') console.error('Usage log error:', e);
  }
  // Check if API_KEY is available
  if (!API_KEY) {
    console.error('API_KEY is not set in environment variables');
    return res.status(500).json({ error: 'API key configuration error' });
  }

  const queryParams = new URLSearchParams({ ...query, apikey: API_KEY }).toString();
  const url = `${BASE_URL}/${endpoint}?${queryParams}`;
  const now = new Date().toISOString();

  // Retry logic with maximum 2 attempts
  const maxRetries = 2;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Only log attempt in non-production
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[${now}] [ATTEMPT] ${attempt}/${maxRetries} for ${endpoint}`);
      }
      
      // Add timeout and headers for better compatibility
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NeoxrProxy/1.0)',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 30000, // Increase timeout to 30 seconds
        agent: url.startsWith('https:') ? httpsAgent : httpAgent // Use correct agent
      });
      
      // Check if response is ok
      if (!response.ok) {
        if (SHOW_SIMPLE_LOGS) {
          console.log('┌─────────────────────────────────────────');
          console.log(`│ ${endpoint.toUpperCase()}`);
          console.log(`│ Status: HTTP ERROR ${response.status}`);
          console.log(`│ IP: ${userIP}`);
          console.log(`│ Daily Requests: ${currentCount}`);
          console.log(`│ Error: ${response.statusText}`);
          console.log('└─────────────────────────────────────────');
        }
        
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
        if (SHOW_SIMPLE_LOGS) {
          console.error(`[${now}] [CONTENT_ERROR] ${endpoint} ✗ Expected JSON, got: ${contentType}`);
        }
        return res.status(500).json({ 
          error: 'Failed to fetch data',
          details: 'Invalid response format from API'
        });
      }

      const data = await response.json();
      // Beautiful box format success log
      if (SHOW_SIMPLE_LOGS) {
        console.log('┌─────────────────────────────────────────');
        console.log(`│ ${endpoint.toUpperCase()}`);
        console.log('│ Status: OK');
        console.log(`│ IP: ${userIP}`);
        console.log(`│ Daily Requests: ${currentCount}`);
        if (endpoint === 'meta' && query.q) {
          console.log(`│ Query: ${query.q}`);
        }
        console.log('└─────────────────────────────────────────');
      }
      return res.json(data);
      
    } catch (err) {
      lastError = err;
      
      // Simple error logging - hide timeout spam but show other errors
      const isTimeoutError = err.code === 'ETIMEDOUT' || err.message.includes('timeout') || err.type === 'request-timeout';
      
      if (SHOW_SIMPLE_LOGS && (!isTimeoutError || !HIDE_TIMEOUT_ERRORS)) {
        console.error(`[${now}] [ERROR] ${endpoint} ✗ Attempt ${attempt}: ${err.message}`);
      }
      
      // If this is not the last attempt and the error is retryable
      if (attempt < maxRetries && (err.code === 'ETIMEDOUT' || err.message.includes('timeout') || err.code === 'ECONNRESET')) {
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
  
  // Provide more specific error messages for the user
  if (lastError.code === 'ENOTFOUND') {
    errorDetails = 'DNS resolution failed - cannot reach Neoxr API';
  } else if (lastError.code === 'ECONNREFUSED') {
    errorDetails = 'Connection refused - Neoxr API might be down';
  } else if (lastError.code === 'ETIMEDOUT' || lastError.message.includes('timeout')) {
    errorDetails = 'Request timeout - Neoxr API is not responding';
  }
  
  // Beautiful box format for final failure
  if (SHOW_SIMPLE_LOGS) {
    console.log('┌─────────────────────────────────────────');
    console.log(`│ ${endpoint.toUpperCase()}`);
    console.log('│ Status: FAILED');
    console.log(`│ IP: ${userIP}`);
    console.log(`│ Daily Requests: ${currentCount}`);
    if (endpoint === 'meta' && query.q) {
      console.log(`│ Query: ${query.q}`);
    }
    console.log(`│ Error: ${errorDetails}`);
    console.log('└─────────────────────────────────────────');
  }
  
  res.status(500).json({ 
    error: errorMessage,
    details: errorDetails,
    attempts: maxRetries
  });
};

module.exports = forwardRequest;