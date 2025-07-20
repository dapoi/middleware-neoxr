const express = require('express');
const path = require('path');
const router = express.Router();

// Route to serve the license page
router.get('/license', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/license.html'));
});

module.exports = router;