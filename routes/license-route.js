
const fs = require('fs');
const path = require('path');
const express = require('express');
const router = express.Router();

router.get('/license', (req, res) => {
  const licensePath = path.join(__dirname, '../LICENSE');
  fs.readFile(licensePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).send('License file not found.');
    }
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>MIT License</title>
          <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
          <style>
            body {
              background: linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%);
              font-family: 'Roboto', monospace, sans-serif;
              margin: 0;
              padding: 0;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .container {
              background: #fff;
              box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.2);
              border-radius: 16px;
              padding: 2.5em 2em;
              max-width: 700px;
              width: 100%;
              margin: 2em;
            }
            h1 {
              text-align: center;
              font-size: 2.2em;
              font-weight: 700;
              color: #2d3a4b;
              margin-bottom: 1.2em;
              letter-spacing: 1px;
            }
            pre {
              background: #f7f9fa;
              border: 1px solid #e3e6ea;
              border-radius: 8px;
              padding: 1.5em;
              font-size: 1.05em;
              color: #333;
              white-space: pre-wrap;
              word-break: break-word;
              box-shadow: 0 2px 8px rgba(31, 38, 135, 0.07);
            }
            .footer {
              text-align: center;
              margin-top: 2em;
              color: #7a8ca3;
              font-size: 0.95em;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>MIT License</h1>
            <pre>${data}</pre>
            <div class="footer">&copy; 2025 MEVER</div>
          </div>
        </body>
      </html>
    `);
  });
});

module.exports = router;
