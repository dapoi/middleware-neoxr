const express = require('express');
const router = express.Router();
const forwardRequest = require('../utils/forward-request');
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

module.exports = router;

// GET app config
router.get('/app-config', (_req, res) => {
  let config = { isDownloaderFeatureActive: true, isImageGeneratorFeatureActive: true };
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (e) {}
  res.json({
    version: require('../package.json').version,
    ...config
  });
});

// POST app config (update)
router.post('/app-config', express.json(), (req, res) => {
  const { isDownloaderFeatureActive, isImageGeneratorFeatureActive } = req.body;
  const newConfig = {
    isDownloaderFeatureActive: !!isDownloaderFeatureActive,
    isImageGeneratorFeatureActive: !!isImageGeneratorFeatureActive
  };
  fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
  res.json({ success: true, ...newConfig });
});