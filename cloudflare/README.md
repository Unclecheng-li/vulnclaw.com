# Cloudflare Workers + D1 Stats

This folder contains the backend for global page views and download click counts.

## Database schema

Run `schema.sql` in your D1 database, or use:

```bash
wrangler d1 execute vulnclaw_stats --file=./cloudflare/schema.sql
```

## Deploy

1. Create a D1 database.
2. Replace `database_id` in `wrangler.toml`.
3. Deploy the worker:

```bash
wrangler deploy
```

## Frontend

Set `STATS_API_BASE` in `script.js` to your Worker URL or custom domain.
