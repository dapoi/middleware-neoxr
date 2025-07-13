const express = require('express');
const router = express.Router();
const forwardRequest = require('../utils/forwardRequest');

router.get('/', (req, res) => {
  res.json({
    message: '🚀 API nyalaaa!',
    endpoints: {
      savefrom: '/savefrom?url=...',
      fb: '/fb?url=...',
      youtube: '/youtube?url=...&quality=...',
      meta: '/meta?q=...'
    },
    author: 'https://github.com/dapoi',
    timestamp: new Date().toISOString()
  });
});


router.get('/savefrom', async (req, res) => {
  const url = req.query.url;
  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: '❌ URL tidak valid' });
  }
  await forwardRequest(res, 'savefrom', { url });
});

router.get('/fb', async (req, res) => {
  const url = req.query.url;
  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: '❌ URL tidak valid' });
  }
  await forwardRequest(res, 'fb', { url });
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