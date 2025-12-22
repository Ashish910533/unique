# Unique Gallery Backend

This adds a small backend that accepts image uploads and commits them into a GitHub repository using the GitHub REST API. Uploaded files are stored under the `images/` folder in the repo and then served via `raw.githubusercontent.com`.

## Setup

1. Create a GitHub Personal Access Token with `repo` scope (to modify repository contents).
2. Set environment variables before starting the server:

- `GITHUB_TOKEN` - your personal access token
- `GITHUB_OWNER` - GitHub username or org that owns the repo
- `GITHUB_REPO` - repository name
- `GITHUB_BRANCH` - branch to commit to (default: `main`)

Example (PowerShell):

```powershell
$env:GITHUB_TOKEN = "ghp_xxx..."
$env:GITHUB_OWNER = "youruser"
$env:GITHUB_REPO = "your-repo"
$env:GITHUB_BRANCH = "main"
npm install
node server.js
```

Or create a `.env` file in the project root with:

```
GITHUB_TOKEN=ghp_xxx
GITHUB_OWNER=youruser
GITHUB_REPO=your-repo
GITHUB_BRANCH=main
```

Then run:

```bash
npm install
node server.js
```

The server will listen on port `3000` by default.

## Endpoints

- `POST /api/upload` - multipart/form-data with field `image`. Returns `{ path, url }` where `url` is the public raw file URL.
- `POST /api/delete` - JSON `{ path }`. Deletes the file at `path` in the repo.
- `GET /api/ping` - returns `{ ok: true }` for health checks.

## Frontend

`index.html` was updated to call the backend. For Netlify deployments you should use the included Netlify Functions which proxy requests to the GitHub API securely.

Netlify setup summary:

- Add the following environment variables in your Netlify Site settings (`Site settings > Build & deploy > Environment`):
	- `GITHUB_TOKEN` (personal access token with `repo` scope)
	- `GITHUB_OWNER` (your GitHub username/org)
	- `GITHUB_REPO` (the repository name)
	- `GITHUB_BRANCH` (optional, default: `main`)

- The project includes Netlify functions in `netlify/functions/upload.js` and `netlify/functions/delete.js`. These accept JSON payloads:
	- `POST /.netlify/functions/upload` with `{ name, dataUrl }` to add an image to `images/` in your repo.
	- `POST /.netlify/functions/delete` with `{ path }` to remove the file from the repo.

- Locally, you can still run the Node server (`server.js`) which exposes `/api/upload` and `/api/delete` for local development. When deployed to Netlify, the frontend will call the Netlify Functions endpoints.

## Security

- Keep your `GITHUB_TOKEN` private. Do not commit it to the repository.
- For production usage, consider creating a narrow-scope token or adding authentication to the backend.
