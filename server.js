require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } }); // 8MB limit
app.use(cors());
app.use(express.json());

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';

if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
  console.warn('Warning: GITHUB_TOKEN, GITHUB_OWNER, or GITHUB_REPO not set in environment. API calls will fail until configured.');
}

const GITHUB_API = 'https://api.github.com';

function githubHeaders() {
  return {
    'Authorization': `Bearer ${GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'unique-gallery-backend'
  };
}

app.get('/api/ping', (req, res) => res.json({ ok: true }));

// Upload endpoint: accepts single file field 'image'
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    if (!GITHUB_TOKEN) return res.status(500).json({ error: 'Server not configured with GITHUB_TOKEN' });

    const originalName = path.basename(req.file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const repoPath = `images/${timestamp}_${originalName}`;

    const contentBase64 = req.file.buffer.toString('base64');

    const url = `${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodeURIComponent(repoPath)}`;

    const body = {
      message: `Add image ${originalName}`,
      content: contentBase64,
      branch: GITHUB_BRANCH
    };

    const r = await fetch(url, {
      method: 'PUT',
      headers: githubHeaders(),
      body: JSON.stringify(body)
    });

    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data });

    const rawUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${repoPath}`;

    return res.json({ path: repoPath, url: rawUrl });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err) });
  }
});

// Delete endpoint: expects JSON { path }
app.post('/api/delete', async (req, res) => {
  try {
    const { path: filePath } = req.body || {};
    if (!filePath) return res.status(400).json({ error: 'path is required' });
    if (!GITHUB_TOKEN) return res.status(500).json({ error: 'Server not configured with GITHUB_TOKEN' });

    // Get file info to retrieve SHA
    const getUrl = `${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodeURIComponent(filePath)}?ref=${GITHUB_BRANCH}`;
    const infoRes = await fetch(getUrl, { headers: githubHeaders() });
    const info = await infoRes.json();
    if (!infoRes.ok) return res.status(infoRes.status).json({ error: info });

    const sha = info.sha;
    const delUrl = `${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodeURIComponent(filePath)}`;
    const body = {
      message: `Remove image ${filePath}`,
      sha,
      branch: GITHUB_BRANCH
    };
    const r = await fetch(delUrl, { method: 'DELETE', headers: githubHeaders(), body: JSON.stringify(body) });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data });

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
