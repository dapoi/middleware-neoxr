const fetch = require('node-fetch');
const dotenv = require('dotenv');
dotenv.config();

const API_KEY = process.env.API_KEY;
const BASE_URL = 'https://api.neoxr.my.id/api';

const forwardRequest = async (res, endpoint, query) => {
  const queryParams = new URLSearchParams({ ...query, apikey: API_KEY }).toString();
  const url = `${BASE_URL}/${endpoint}?${queryParams}`;

  const now = new Date().toISOString();
  console.log(`[${now}] [REQUEST] ${endpoint} → ${url}`);

  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log(`[${now}] [SUCCESS] ${endpoint} ✓`);
    res.json(data);
  } catch (err) {
    console.error(`[${now}] [ERROR] ${endpoint} ✗`, err.message);
    res.status(500).json({ error: 'Gagal ambil data dari Neoxr' });
  }
};

module.exports = forwardRequest;
