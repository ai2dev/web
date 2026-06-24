// api/reservations.js (Vercel Serverless Function)
// This function proxies GitHub API calls to read/write reservations.json.
// It uses the environment variable GITHUB_TOKEN (set in Vercel dashboard).

const fetch = require('node-fetch'); // Vercel runtime provides fetch, but keep for compatibility

const GITHUB_OWNER = 'ai2dev';
const GITHUB_REPO = 'web';
const GITHUB_BRANCH = 'main';
const GITHUB_API_URL = 'https://api.github.com';

// Helper: GitHub request with token
async function ghRequest(path, options = {}) {
  const resp = await fetch(`${GITHUB_API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `token ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      ...(options.headers || {}),
    },
  });
  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(`GitHub API error ${resp.status}: ${err.message}`);
  }
  return resp.json();
}

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      // Read reservations.json from repo
      const path = `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/reservations.json?ref=${GITHUB_BRANCH}`;
      const data = await ghRequest(path);
      const jsonStr = Buffer.from(data.content, 'base64').toString('utf-8');
      res.status(200).json(JSON.parse(jsonStr));
      return;
    }

    if (req.method === 'POST') {
      // Expect full reservations array in body
      const reservations = req.body; // Vercel parses JSON automatically
      if (!Array.isArray(reservations)) {
        res.status(400).json({ error: 'Body must be an array of reservations' });
        return;
      }

      // Get existing file SHA if it exists (to update) or undefined (to create)
      let sha;
      try {
        const getPath = `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/reservations.json?ref=${GITHUB_BRANCH}`;
        const existing = await ghRequest(getPath);
        sha = existing.sha;
      } catch (e) {
        // If 404, file does not exist – sha stays undefined
        if (!e.message.includes('404')) throw e;
      }

      const putPath = `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/reservations.json`;
      const body = {
        message: `Update reservations ${new Date().toISOString()}`,
        content: Buffer.from(JSON.stringify(reservations, null, 2)).toString('base64'),
        branch: GITHUB_BRANCH,
        ...(sha && { sha }),
      };

      const result = await ghRequest(putPath, { method: 'PUT', body: JSON.stringify(body) });
      res.status(200).json(result);
      return;
    }

    // Unsupported method
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
