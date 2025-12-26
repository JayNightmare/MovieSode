# MovieSode — Setup Guide

Split your movies into 20–25 minute episodes and watch them like a series.

## Prerequisites

- Node.js 20+ and npm
- A MongoDB connection string (local, Atlas, or Cosmos DB for MongoDB)
- Windows/macOS/Linux

## Quickstart

1. Install dependencies

```bash
npm install
```

2. Create `.env.local` in the project root

```ini
# Mongo connection (required)
MONGODB_URI=mongodb://localhost:27017/moviesode

# Internal base URL for server-side fetches (required for dev)
BASE_URL=http://localhost:3000

# Optional local paths for future processing
UPLOAD_DIR=./uploads
OUTPUT_DIR=./output
```

3. Start the dev server

```bash
npm run dev
```

4. Open http://localhost:3000

## Environment Variables

- MONGODB_URI: Your MongoDB connection string. Examples:
     - Local: `mongodb://localhost:27017/moviesode`
     - Atlas: `mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority`
     - Cosmos DB (MongoDB): use the connection string from the Azure portal
- BASE_URL: Used by server components to call internal API routes. In development set to `http://localhost:3000`.
- UPLOAD_DIR / OUTPUT_DIR: Local folders where uploads/outputs will live (planned for future processing steps).

## Scripts

- dev: `next dev`
- build: `next build`
- start: `next start`
- lint: `eslint`

## Notes

- The UI is deliberately minimal and will evolve with upload/processing features.
- You can point `MONGODB_URI` at Cosmos DB for MongoDB if desired; no code changes required.
