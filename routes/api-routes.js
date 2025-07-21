const express = require('express');
const router = express.Router();
const forwardRequest = require('../utils/forward-request');
const { requireAuth } = require('../utils/auth-middleware');
const fs = require('fs');
const path = require('path');
const configPath = path.join(__dirname, '../utils/app-config.json');

router.get('/', (req, res) => {
  res.json({
    message: '🚀 API nyala!',
    endpoints: {
      fb: '/api/fb?url=<video_url>',
      ig: '/api/ig?url=<video_url>',
      tiktok: '/api/tiktok?url=<video_url>',
      twitter: '/api/twitter?url=<tweet_url>',
      youtube: '/api/youtube?url=<video_url>&quality=<quality>',
      meta: '/api/meta?q=<query>'
    },
    author: 'https://github.com/dapoi',
    timestamp: new Date().toISOString()
  });
});

router.get('/fb', async (req, res) => {
  const url = req.query.url;
  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: '❌ URL tidak valid' });
  }
  await forwardRequest(res, 'fb', { url });
});

router.get('/ig', async (req, res) => {
  const url = req.query.url;
  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: '❌ URL tidak valid' });
  }
  await forwardRequest(res, 'ig', { url });
});

router.get('/tiktok', async (req, res) => {
  const url = req.query.url;
  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: '❌ URL tidak valid' });
  }
  await forwardRequest(res, 'tiktok', { url });
});

router.get('/twitter', async (req, res) => {
  const url = req.query.url;
  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: '❌ URL tidak valid' });
  }
  await forwardRequest(res, 'twitter', { url });
});

router.get('/youtube', async (req, res) => {
  const url = req.query.url;
  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: '❌ URL tidak valid' });
  }
  await forwardRequest(res, 'youtube', {
    url,
    quality: req.query.quality,
    type: req.query.type || 'video'
  });
});

router.get('/meta', async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: '❌ Query tidak valid' });

  await forwardRequest(res, 'meta', {
    q,
    session: 'bb286368-37d4-485d-9522-fb88ee8f92b4',
    lang: req.query.lang || 'en'
  });
});

// Check authentication status - Protected endpoint
router.get('/auth-check', requireAuth, (_req, res) => {
  res.json({ authenticated: true });
});

// GET app config - Public endpoint
router.get('/app-config', (_req, res) => {
  let config = { 
    version: '1.0.0', 
    isDownloaderFeatureActive: true, 
    isImageGeneratorFeatureActive: true,
    youtubeResolutions: ["360p", "480p", "720p", "1080p"]
  };
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (e) {}
  res.json(config);
});

// POST app config (update) - Protected endpoint
router.post('/app-config', requireAuth, express.json(), (req, res) => {
  // Read current config
  let currentConfig = { 
    version: '1.0.0', 
    isDownloaderFeatureActive: true, 
    isImageGeneratorFeatureActive: true,
    youtubeResolutions: ["360p", "480p", "720p", "1080p"]
  };
  try {
    currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (e) {}

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

  // Build clean config object (never use spread operator with req.body)
  const newConfig = {
    version: req.body.version !== undefined ? req.body.version : currentConfig.version,
    isDownloaderFeatureActive: req.body.isDownloaderFeatureActive !== undefined ? !!req.body.isDownloaderFeatureActive : currentConfig.isDownloaderFeatureActive,
    isImageGeneratorFeatureActive: req.body.isImageGeneratorFeatureActive !== undefined ? !!req.body.isImageGeneratorFeatureActive : currentConfig.isImageGeneratorFeatureActive,
    youtubeResolutions
  };
  
  fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
  res.json({ success: true, ...newConfig });
});

module.exports = router;