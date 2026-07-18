const express = require('express');
const router = express.Router();
const forwardRequest = require('../utils/forward-request');
const { requireAuth } = require('../utils/auth-middleware');
const fs = require('fs');
const path = require('path');
const configPath = path.join(__dirname, '../data/app-config.json');

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
      goimg: '/api/goimg?q=<query>',
      ig: '/api/ig?url=<video_url>',
      meta: '/api/meta?q=<query>',
      pinterest: '/api/pin-v2?url=<pinterest_url>',
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
  await forwardRequest(res, 'douyin', { url });
});

router.get('/fb', async (req, res) => {
  const url = req.query.url;
  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: '❌ Invalid URL' });
  }
  await forwardRequest(res, 'fb', { url });
});

router.get('/goimg', async (req, res) => {
  // Check if goimg feature is enabled
  let config = { isGoImgFeatureActive: true };
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (e) {
    // Use default config if file reading fails
  }
  
  if (!config.isGoImgFeatureActive) {
    return res.status(503).json({ 
      error: '🚧 GoImg feature is currently disabled',
      details: 'This feature has been temporarily disabled by the administrator.'
    });
  }

  let q = req.query.q;
  let isDefaultQuery = false;
  
  // Use random default query if no query provided
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

  await forwardRequest(res, 'goimg', { q, isDefaultQuery });
});

router.get('/ig', async (req, res) => {
  const url = req.query.url;
  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: '❌ Invalid URL' });
  }
  await forwardRequest(res, 'ig', { url });
});

router.get('/meta', async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: '❌ Invalid query' });

  await forwardRequest(res, 'meta', {
    q,
    session: '',
    lang: req.query.lang || 'en'
  });
});

router.get('/pin-v2', async (req, res) => {
  const url = req.query.url;
  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: '❌ Invalid URL' });
  }
  await forwardRequest(res, 'pin-v2', { url });
});

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
  await forwardRequest(res, 'tiktok', { url });
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
// This endpoint is now public, no header or session protection
router.get('/app-config', (req, res) => {
  let config = { 
    version: '1.0.0', 
    isDownloaderFeatureActive: true, 
    isImageGeneratorFeatureActive: true,
    isGoImgFeatureActive: true,
    isWhatsAppStatusFeatureActive: true,
    isForceUpdateRequired: false,
    showSupportedPlatform: true,
    youtubeResolutions: ["360p", "480p", "720p", "1080p"],
    audioQualities: [],
    maintenanceDay: null,
    reportString: ""
  };
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Always send current day for real-time display
    config.currentMaintenanceDay = getCurrentDayName();
  } catch (e) {
    console.warn('Could not read config file, using default config:', e.message);
  }
  res.json(config);
});

// POST app config (update) - Protected endpoint
router.post('/app-config', requireAuth, express.json(), (req, res) => {
  // Read current config
  let currentConfig = { 
    version: '1.0.0', 
    isDownloaderFeatureActive: true, 
    isImageGeneratorFeatureActive: true,
    isGoImgFeatureActive: true,
    isWhatsAppStatusFeatureActive: true,
    isForceUpdateRequired: false,
    showSupportedPlatform: true,
    youtubeResolutions: ["360p", "480p", "720p", "1080p"],
    audioQualities: [],
    maintenanceDay: null,
    reportString: ""
  };
  try {
    currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (e) {
    console.warn('Could not read current config file, using default config:', e.message);
  }

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
    const rawData = fs.readFileSync(configPath, 'utf8');
    const configData = JSON.parse(rawData);
    
    // Save the incoming message into the config's reportString
    configData.reportString = message;
    
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));
    
    // Return 204 No Content (matches Unit in Kotlin)
    res.status(204).send();
  } catch (err) {
    console.error('Error updating report string:', err);
    res.status(500).json({ error: 'Failed to update report string' });
  }
});

module.exports = router;
