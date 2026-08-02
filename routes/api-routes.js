const express = require('express');
const router = express.Router();
const forwardRequest = require('../utils/forward-request');
const { getDailyRequestCount, formatDuration, registerDevice, getRegisteredDevice } = forwardRequest;
const { requireAuth } = require('../utils/auth-middleware');
const fs = require('fs');
const path = require('path');
const configPath = path.join(__dirname, '../data/app-config.json');

// Helper: try primary endpoint, fallback to secondary if failed
const forwardWithFallback = async (res, primary, fallback, query) => {
  const req = res.req;
  const ip = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';

  // Intercept res.json and res.status to block error response from primary
  const originalJson = res.json.bind(res);
  const originalStatus = res.status.bind(res);
  let primaryFailed = false;

  res.json = (body) => {
    if (body && body.error) {
      primaryFailed = true;
      return res;
    }
    return originalJson(body);
  };
  res.status = (code) => {
    if (code >= 400) {
      primaryFailed = true;
      return res;
    }
    return originalStatus(code);
  };

  await forwardRequest(res, primary, query);

  if (primaryFailed) {
    // Restore original methods and try fallback
    res.json = originalJson;
    res.status = originalStatus;

    console.log(`┌─────────────────────────────────────────`);
    console.log(`│ ${primary.toUpperCase()} → fallback to ${fallback.toUpperCase()}`);
    console.log(`│ IP: ${ip}`);
    console.log(`└─────────────────────────────────────────`);

    await forwardRequest(res, fallback, query);
  }
};

const DEFAULT_CONFIG = {
  version: '',
  isDownloaderFeatureActive: true,
  isImageGeneratorFeatureActive: true,
  isGoImgFeatureActive: true,
  isWhatsAppStatusFeatureActive: true,
  isForceUpdateRequired: true,
  showSupportedPlatform: true,
  youtubeResolutions: ['360p', '480p', '720p'],
  audioQualities: ['128kbps'],
  maintenanceDay: null,
  reportString: ''
};

// In-memory config cache — preloaded on bootup to eliminate disk I/O on GET requests
let configCache = null;

const loadConfigFromDisk = () => {
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (e) {
    console.warn('Could not read config file, using default config:', e.message);
    return { ...DEFAULT_CONFIG };
  }
};

const getConfig = () => {
  if (!configCache) {
    configCache = loadConfigFromDisk();
  }
  return configCache;
};

const invalidateConfigCache = () => {
  configCache = loadConfigFromDisk();
};

// Bootup preload
configCache = loadConfigFromDisk();

// Helper function to get current day name
function getCurrentDayName() {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = new Date();
  return days[today.getDay()];
}

router.get('/', (req, res) => {
  res.json({
    message: '🚀 API nyala!',
    endpoints: {
      applemusic: '/api/applemusic?url=<applemusic_url>',
      douyin: '/api/douyin?url=<douyin_url>',
      fb: '/api/fb?url=<video_url>',
      genimg: '/api/genimg?prompt=<prompt>',
      goimg: '/api/goimg?q=<query>',
      ig: '/api/ig?url=<video_url>',
      meta: '/api/meta?q=<query>',
      pin: '/api/pin?url=<pinterest_url>',
      'pin-v2': '/api/pin-v2?url=<pinterest_url>',
      'pinterest-v2': '/api/pinterest-v2?q=<query>',
      pixiv: '/api/pixiv?url=<pixiv_url>',
      soundcloud: '/api/soundcloud?url=<soundcloud_url>',
      spotify: '/api/spotify?url=<spotify_url>',
      terabox: '/api/terabox?url=<terabox_url>',
      threads: '/api/threads?url=<threads_url>',
      tiktok: '/api/tiktok?url=<video_url>',
      twitter: '/api/twitter?url=<tweet_url>',
      videy: '/api/videy?url=<videy_url>',
      youtube: '/api/youtube?url=<video_url>&quality=<360p|480p|720p|1080p|128kbps>&type=<video|audio>',
    },
    author: 'https://github.com/dapoi',
    timestamp: new Date().toISOString()
  });
});

router.get('/applemusic', async (req, res) => {
  const url = req.query.url;
  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: '❌ Invalid URL' });
  }
  await forwardRequest(res, 'applemusic', { url });
});

router.get('/douyin', async (req, res) => {
  const url = req.query.url;
  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: '❌ Invalid URL' });
  }
  await forwardWithFallback(res, 'douyin', 'tiktok', { url });
});

router.get('/fb', async (req, res) => {
  const url = req.query.url;
  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: '❌ Invalid URL' });
  }
  await forwardRequest(res, 'fb', { url });
});

router.get('/ig', async (req, res) => {
  const url = req.query.url;
  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: '❌ Invalid URL' });
  }
  await forwardRequest(res, 'ig', { url });
});

// Dedicated handler for GenImg AI image generation (/genimg raw, /meta mapped for backward compatibility)
const handleGenImg = async (req, res, endpointName = 'GENIMG', isLegacy = false) => {
  const startTime = Date.now();
  const prompt = req.query.prompt || req.query.q;
  if (!prompt) return res.status(400).json({ error: '❌ Invalid prompt or query' });

  const apiKey = process.env.API_KEY;
  const genUrl = `https://api.neoxr.eu/api/genimg?prompt=${encodeURIComponent(prompt)}&apikey=${apiKey}`;
  const ip = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';

  const currentCount = getDailyRequestCount(ip);
  const device = getRegisteredDevice(ip);

  try {
    const fetch = require('node-fetch');
    const genRes = await fetch(genUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      timeout: 15000
    });

    if (!genRes.ok) {
      throw new Error(`GenImg API returned HTTP ${genRes.status}`);
    }

    const contentType = genRes.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('GenImg API returned non-JSON response');
    }

    const genData = await genRes.json();
    const latency = Date.now() - startTime;

    console.log('┌─────────────────────────────────────────');
    console.log(`│ ${endpointName.toUpperCase()} (GENIMG)`);
    console.log(`│ Status: OK (${formatDuration(latency)})`);
    console.log(`│ IP: ${ip}`);
    console.log(`│ Daily Requests: ${currentCount}`);
    if (device) console.log(`│ Device: ${device}`);
    console.log(`│ Prompt: ${prompt}`);
    console.log('└─────────────────────────────────────────');

    if (!isLegacy) {
      return res.json(genData);
    }

    // Map GenImg response to legacy Android ImageAiResponse format:
    // { data: { media: [{ url: "..." }] } }
    const mapped = {
      data: {
        media: genData.data?.url ? [{ url: genData.data.url }] : []
      }
    };

    return res.json(mapped);
  } catch (err) {
    const latency = Date.now() - startTime;
    console.log('┌─────────────────────────────────────────');
    console.log(`│ ${endpointName.toUpperCase()} (GENIMG)`);
    console.log(`│ Status: FAILED (${formatDuration(latency)})`);
    console.log(`│ IP: ${ip}`);
    console.log(`│ Daily Requests: ${currentCount}`);
    if (device) console.log(`│ Device: ${device}`);
    console.log(`│ Prompt: ${prompt}`);
    console.log(`│ Error: ${err.message}`);
    console.log('└─────────────────────────────────────────');

    return res.status(500).json({
      error: 'Failed to fetch data',
      details: err.message
    });
  }
};

router.get('/genimg', (req, res) => handleGenImg(req, res, 'genimg', false));
router.get('/meta', (req, res) => handleGenImg(req, res, 'meta', true));

// In-memory caching for Pinterest Search (/pinterest-v2 and /goimg)
// Cache expires after 5 minutes
const pinSearchCache = new Map();
const PIN_CACHE_TTL_MS = 5 * 60 * 1000;

const getCachedPinSearch = (query) => {
  const key = query.trim().toLowerCase();
  const cached = pinSearchCache.get(key);
  if (cached && (Date.now() - cached.timestamp < PIN_CACHE_TTL_MS)) {
    return cached.data;
  }
  if (cached) pinSearchCache.delete(key);
  return null;
};

const setCachedPinSearch = (query, data) => {
  const key = query.trim().toLowerCase();
  pinSearchCache.set(key, { data, timestamp: Date.now() });
  if (pinSearchCache.size > 500) {
    const oldestKey = pinSearchCache.keys().next().value;
    pinSearchCache.delete(oldestKey);
  }
};

// Dedicated handler for Pinterest Search (/pinterest-v2 raw, /goimg mapped for backward compatibility)
const handlePinterestSearch = async (req, res, endpointName = 'PINTEREST-V2', isLegacy = false) => {
  const startTime = Date.now();
  if (endpointName === 'goimg') {
    const config = getConfig();
    if (!config.isGoImgFeatureActive) {
      return res.status(503).json({ 
        error: '🚧 GoImg feature is currently disabled',
        details: 'This feature has been temporarily disabled by the administrator.'
      });
    }
  }

  let q = req.query.q;
  let isDefaultQuery = false;
  
  if (!q) {
    const defaultQueries = [
      "anime",
      "meme absurd",
      "meme shitpost",
      "my bini",
      "waifu",
      "kpop"
    ];
    q = defaultQueries[Math.floor(Math.random() * defaultQueries.length)];
    isDefaultQuery = true;
  }

  const apiKey = process.env.API_KEY;
  const pinUrl = `https://api.neoxr.eu/api/pinterest-v2?q=${encodeURIComponent(q)}&show=25&type=image&apikey=${apiKey}`;
  const ip = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
  const currentCount = getDailyRequestCount(ip);
  const device = getRegisteredDevice(ip);

  // Helper function to respond (either raw or mapped)
  const sendResponse = (pinData, isCached = false) => {
    const latency = Date.now() - startTime;
    if (!isDefaultQuery) {
      console.log('┌─────────────────────────────────────────');
      console.log(`│ ${endpointName.toUpperCase()} (PINTEREST v2)`);
      console.log(`│ Status: ${isCached ? 'CACHED (5 min TTL)' : 'OK'} (${formatDuration(latency)})`);
      console.log(`│ IP: ${ip}`);
      console.log(`│ Daily Requests: ${currentCount}`);
      if (device) console.log(`│ Device: ${device}`);
      console.log(`│ Query: ${q}`);
      console.log('└─────────────────────────────────────────');
    }

    if (!isLegacy) {
      return res.json(pinData);
    }

    // Map Pinterest v2 response to legacy Android ImageSearchResponse format
    const mapped = {
      status: pinData.status ?? true,
      data: (pinData.data || []).map((item, index) => {
        const originalUrl = item.content?.[0]?.url || null;
        const previewUrl = originalUrl ? originalUrl.replace('/originals/', '/236x/') : null;
        return {
          id: `pin_${index}_${Date.now()}`,
          url: originalUrl,
          preview: { url: previewUrl },
          origin: { title: item.title || null }
        };
      })
    };

    return res.json(mapped);
  };

  // Check cache first
  const cachedData = getCachedPinSearch(q);
  if (cachedData) {
    return sendResponse(cachedData, true);
  }

  try {
    const fetch = require('node-fetch');
    const pinRes = await fetch(pinUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      timeout: 15000
    });

    if (!pinRes.ok) {
      throw new Error(`Pinterest API returned HTTP ${pinRes.status}`);
    }

    const contentType = pinRes.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Pinterest API returned non-JSON response');
    }

    const pinData = await pinRes.json();

    // Cache successful response
    if (pinData && pinData.status) {
      setCachedPinSearch(q, pinData);
    }

    return sendResponse(pinData, false);
  } catch (err) {
    const latency = Date.now() - startTime;
    if (!isDefaultQuery) {
      console.log('┌─────────────────────────────────────────');
      console.log(`│ ${endpointName.toUpperCase()} (PINTEREST v2)`);
      console.log(`│ Status: FAILED (${formatDuration(latency)})`);
      console.log(`│ IP: ${ip}`);
      console.log(`│ Daily Requests: ${currentCount}`);
      if (device) console.log(`│ Device: ${device}`);
      console.log(`│ Query: ${q}`);
      console.log(`│ Error: ${err.message}`);
      console.log('└─────────────────────────────────────────');
    }

    return res.status(500).json({
      error: 'Failed to fetch data',
      details: err.message
    });
  }
};

router.get('/pinterest-v2', (req, res) => handlePinterestSearch(req, res, 'pinterest-v2', false));
router.get('/goimg', (req, res) => handlePinterestSearch(req, res, 'goimg', true));

// Dedicated handler for Pinterest Pin Downloader (/pin raw, /pin-v2 mapped for backward compatibility)
const handlePinDownload = async (req, res, endpointName = 'PIN', isLegacy = false) => {
  const startTime = Date.now();
  const url = req.query.url;
  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: '❌ Invalid URL' });
  }

  const apiKey = process.env.API_KEY;
  const pinUrl = `https://api.neoxr.eu/api/pin?url=${encodeURIComponent(url)}&apikey=${apiKey}`;
  const ip = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
  const currentCount = getDailyRequestCount(ip);
  const device = getRegisteredDevice(ip);

  try {
    const fetch = require('node-fetch');
    const pinRes = await fetch(pinUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      timeout: 15000
    });

    if (!pinRes.ok) {
      throw new Error(`Pin API returned HTTP ${pinRes.status}`);
    }

    const contentType = pinRes.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Pin API returned non-JSON response');
    }

    const pinData = await pinRes.json();
    const latency = Date.now() - startTime;

    const truncateStr = (str, maxLen = 60) => (str && str.length > maxLen ? str.substring(0, maxLen) + '...' : (str || ''));

    console.log('┌─────────────────────────────────────────');
    console.log(`│ ${endpointName.toUpperCase()} (PIN API)`);
    console.log(`│ Status: OK (${formatDuration(latency)})`);
    console.log(`│ IP: ${ip}`);
    console.log(`│ Daily Requests: ${currentCount}`);
    if (device) console.log(`│ Device: ${device}`);
    console.log(`│ URL: ${truncateStr(url, 60)}`);
    console.log('└─────────────────────────────────────────');

    if (!isLegacy) {
      return res.json(pinData);
    }

    // Map to legacy Android PinterestDownloaderResponse format
    const items = pinData.data || [];
    const videoExts = ['.mp4', '.webm', '.mov'];
    const isVideo = items.some(item => {
      const u = (item.url || '').toLowerCase();
      return videoExts.some(ext => u.endsWith(ext)) || u.includes('/videos/');
    });

    const mapped = {
      status: pinData.status ?? true,
      data: {
        is_video: isVideo,
        content: items.map(item => ({
          url: item.url || null,
          thumbnail: item.thumbnail || (item.url ? item.url.replace('/originals/', '/236x/') : null)
        }))
      }
    };

    return res.json(mapped);
  } catch (err) {
    const latency = Date.now() - startTime;
    const truncateStr = (str, maxLen = 60) => (str && str.length > maxLen ? str.substring(0, maxLen) + '...' : (str || ''));

    console.log('┌─────────────────────────────────────────');
    console.log(`│ ${endpointName.toUpperCase()} (PIN API)`);
    console.log(`│ Status: FAILED (${formatDuration(latency)})`);
    console.log(`│ IP: ${ip}`);
    console.log(`│ Daily Requests: ${currentCount}`);
    if (device) console.log(`│ Device: ${device}`);
    console.log(`│ URL: ${truncateStr(url, 60)}`);
    console.log(`│ Error: ${err.message}`);
    console.log('└─────────────────────────────────────────');

    return res.status(500).json({
      error: 'Failed to fetch data',
      details: err.message
    });
  }
};

router.get('/pin', (req, res) => handlePinDownload(req, res, 'pin', false));
router.get('/pin-v2', (req, res) => handlePinDownload(req, res, 'pin-v2', true));

router.get('/pixiv', async (req, res) => {
  const url = req.query.url;
  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: '❌ Invalid URL' });
  }
  await forwardRequest(res, 'pixiv', { url });
});

router.get('/soundcloud', async (req, res) => {
  const url = req.query.url;
  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: '❌ Invalid URL' });
  }
  await forwardRequest(res, 'soundcloud', { url });
});

router.get('/spotify', async (req, res) => {
  const url = req.query.url;
  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: '❌ Invalid URL' });
  }
  await forwardRequest(res, 'spotify', { url });
});

router.get('/terabox', async (req, res) => {
  const url = req.query.url;
  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: '❌ Invalid URL' });
  }
  await forwardRequest(res, 'terabox', { url });
});

router.get('/threads', async (req, res) => {
  const url = req.query.url;
  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: '❌ Invalid URL' });
  }
  await forwardRequest(res, 'threads', { url });
});

router.get('/tiktok', async (req, res) => {
  const url = req.query.url;
  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: '❌ Invalid URL' });
  }
  await forwardWithFallback(res, 'tiktok', 'douyin', { url });
});

router.get('/twitter', async (req, res) => {
  const url = req.query.url;
  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: '❌ Invalid URL' });
  }
  await forwardRequest(res, 'twitter', { url });
});

router.get('/videy', async (req, res) => {
  const url = req.query.url;
  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: '❌ Invalid URL' });
  }
  await forwardRequest(res, 'videy', { url });
});

router.get('/youtube', async (req, res) => {
  const url = req.query.url;
  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: '❌ Invalid URL' });
  }
  await forwardRequest(res, 'youtube', {
    url,
    quality: req.query.quality,
    type: req.query.type || 'video'
  });
});

// Check authentication status - Protected endpoint
router.get('/auth-check', requireAuth, (_req, res) => {
  res.json({ authenticated: true });
});

// GET app config - Public endpoint
const allowedPackageNames = ['com.dapascript.mever'];
// Serve 100% from RAM with HTTP cache headers
router.get('/app-config', (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
  // Register device name per IP if provided (used later in other endpoint logs)
  const rawDevice = req.query.device || req.query.device_name || req.query.deviceName || req.query.model
    || req.headers['x-device-name'] || req.headers['x-device-model'];
  if (rawDevice && rawDevice !== '-') registerDevice(ip, rawDevice);

  const config = getConfig();
  res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=30');
  res.json({ ...config, currentMaintenanceDay: getCurrentDayName() });
});

// POST app config (update) - Protected endpoint
router.post('/app-config', requireAuth, express.json(), (req, res) => {
  const currentConfig = getConfig();

  // Always convert youtubeResolutions to array format for storage
  let youtubeResolutions = [];
  
  if (req.body.youtubeResolutions) {
    if (typeof req.body.youtubeResolutions === 'object' && !Array.isArray(req.body.youtubeResolutions)) {
      // Convert boolean object from UI to array of enabled resolutions
      Object.keys(req.body.youtubeResolutions).forEach(resolution => {
        if (req.body.youtubeResolutions[resolution] === true) {
          youtubeResolutions.push(resolution);
        }
      });
    } else if (Array.isArray(req.body.youtubeResolutions)) {
      youtubeResolutions = req.body.youtubeResolutions;
    }
  } else {
    // Keep current resolutions if not provided
    youtubeResolutions = Array.isArray(currentConfig.youtubeResolutions) 
      ? currentConfig.youtubeResolutions 
      : Object.keys(currentConfig.youtubeResolutions || {}).filter(key => currentConfig.youtubeResolutions[key]);
  }

  // Handle audioQualities the same way as youtubeResolutions
  let audioQualities = [];
  
  if (req.body.audioQualities) {
    if (typeof req.body.audioQualities === 'object' && !Array.isArray(req.body.audioQualities)) {
      // Convert boolean object from UI to array of enabled audio qualities
      Object.keys(req.body.audioQualities).forEach(quality => {
        if (req.body.audioQualities[quality] === true) {
          audioQualities.push(quality);
        }
      });
    } else if (Array.isArray(req.body.audioQualities)) {
      audioQualities = req.body.audioQualities;
    }
  } else {
    // Keep current audio qualities if not provided
    audioQualities = Array.isArray(currentConfig.audioQualities) 
      ? currentConfig.audioQualities 
      : Object.keys(currentConfig.audioQualities || {}).filter(key => currentConfig.audioQualities[key]);
  }

  // Build clean config object (never use spread operator with req.body)
  const newConfig = {
    version: req.body.version !== undefined ? req.body.version : currentConfig.version,
    isDownloaderFeatureActive: req.body.isDownloaderFeatureActive !== undefined ? !!req.body.isDownloaderFeatureActive : currentConfig.isDownloaderFeatureActive,
    isImageGeneratorFeatureActive: req.body.isImageGeneratorFeatureActive !== undefined ? !!req.body.isImageGeneratorFeatureActive : currentConfig.isImageGeneratorFeatureActive,
    isGoImgFeatureActive: req.body.isGoImgFeatureActive !== undefined ? !!req.body.isGoImgFeatureActive : currentConfig.isGoImgFeatureActive,
    isWhatsAppStatusFeatureActive: req.body.isWhatsAppStatusFeatureActive !== undefined ? !!req.body.isWhatsAppStatusFeatureActive : currentConfig.isWhatsAppStatusFeatureActive,
    isForceUpdateRequired: req.body.isForceUpdateRequired !== undefined ? !!req.body.isForceUpdateRequired : currentConfig.isForceUpdateRequired,
    showSupportedPlatform: req.body.showSupportedPlatform !== undefined ? !!req.body.showSupportedPlatform : (currentConfig.showSupportedPlatform !== undefined ? currentConfig.showSupportedPlatform : true),
    youtubeResolutions,
    audioQualities,
    maintenanceDay: req.body.maintenanceDay !== undefined ? req.body.maintenanceDay : currentConfig.maintenanceDay,
    reportString: req.body.reportString !== undefined ? req.body.reportString : (currentConfig.reportString || "")
  };
  
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
  invalidateConfigCache(); // force next GET to re-read from disk
  res.json({ success: true, ...newConfig });
});

// POST report - Public endpoint to update reportString from app via Query Param
router.post('/report', (req, res) => {
  // Read from req.query.message to match @Query("message") in Retrofit
  const message = req.query.message;
  
  if (message === undefined) {
    return res.status(400).json({ error: '❌ message query parameter is required' });
  }

  try {
    const configData = { ...getConfig() };
    
    // Save the incoming message into the config's reportString
    configData.reportString = message;
    
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));
    invalidateConfigCache(); // reload into memory
    
    // Return 204 No Content (matches Unit in Kotlin)
    res.status(204).send();
  } catch (err) {
    console.error('Error updating report string:', err);
    res.status(500).json({ error: 'Failed to update report string' });
  }
});

module.exports = router;
