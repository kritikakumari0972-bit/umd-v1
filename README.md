# Universal Social Media Downloader

A lightweight Next.js app for extracting downloadable media links and streaming files from shared URLs.

## Features
- Accepts direct media URLs and social-sharing links
- Uses yt-dlp for extraction and format discovery
- Supports streaming and download responses
- Stores extraction metadata locally in `.data/extracts`
- Postgres-ready via Drizzle for metadata persistence

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Scripts

- `npm run dev` — start the development server
- `npm run build` — build the production app
- `npm run lint` — ESLint validation
- `npm run typecheck` — TypeScript validation

## Notes
This project uses Next.js 16 and PostgreSQL through Drizzle.
