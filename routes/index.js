const express = require('express');
const { findTone } = require('../lib/tones');
const { VARIABLES, isAvailable, buildPostPrompt, searchTrends, generatePosts } = require('../lib/claude');

const router = express.Router();

const NO_CLAUDE_MESSAGE = 'Claude Code（claude コマンド）が見つかりません。Claude Code をインストールしてログインしてから、サーバーを起動し直してください。';

router.get('/api/config', (req, res) => {
  res.json({ available: isAvailable(), variables: VARIABLES });
});

// 4つの変数がすべて入っているかを確かめる（入力欄の初期文字のままも不可。口調は10パターンの番号）
function readVariables(body) {
  const values = {};
  const missing = [];
  for (const v of VARIABLES) {
    const value = typeof body?.[v.key] === 'string' ? body[v.key].trim() : '';
    const invalid = v.options ? !findTone(value) : value === v.placeholder;
    if (!value || invalid) missing.push(v.label);
    values[v.key] = value;
  }
  return { values, missing };
}

router.post('/api/prompt', (req, res) => {
  const { values, missing } = readVariables(req.body);
  if (missing.length) return res.status(400).json({ error: `未入力の項目があります：${missing.join('、')}` });
  res.json({ prompt: buildPostPrompt(values) });
});

router.post('/api/trends', async (req, res) => {
  if (!isAvailable()) return res.status(503).json({ error: NO_CLAUDE_MESSAGE });
  const category = typeof req.body?.category === 'string' ? req.body.category.trim() : '';
  const season = req.body?.season !== false;
  const today = new Date().toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo', dateStyle: 'long' });
  try {
    res.json(await searchTrends({ category, season, today }));
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: err.message });
  }
});

router.post('/api/posts', async (req, res) => {
  const { values, missing } = readVariables(req.body);
  if (missing.length) return res.status(400).json({ error: `未入力の項目があります：${missing.join('、')}` });
  if (!isAvailable()) return res.status(503).json({ error: NO_CLAUDE_MESSAGE });
  try {
    res.json({ text: await generatePosts(values) });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: err.message });
  }
});

module.exports = router;
