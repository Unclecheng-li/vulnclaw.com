export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const allowedOrigin = env.ALLOWED_ORIGIN || '*';

    if (request.method === 'OPTIONS') {
      return corsResponse(null, allowedOrigin);
    }

    if (url.pathname === '/api/stats/page-view') {
      if (request.method !== 'GET') {
        return jsonResponse({ error: 'Method not allowed' }, 405, allowedOrigin);
      }
      const counts = await incrementAndRead(env.DB, 'page_views', 1);
      return jsonResponse({
        pageViews: counts.page_views,
        downloadClicks: counts.download_clicks
      }, 200, allowedOrigin);
    }

    if (url.pathname === '/api/stats/download-click') {
      if (request.method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed' }, 405, allowedOrigin);
      }
      const counts = await incrementAndRead(env.DB, 'download_clicks', 1);
      return jsonResponse({
        pageViews: counts.page_views,
        downloadClicks: counts.download_clicks
      }, 200, allowedOrigin);
    }

    if (url.pathname === '/api/stats/summary') {
      if (request.method !== 'GET') {
        return jsonResponse({ error: 'Method not allowed' }, 405, allowedOrigin);
      }
      const counts = await readCounts(env.DB);
      return jsonResponse({
        pageViews: counts.page_views,
        downloadClicks: counts.download_clicks
      }, 200, allowedOrigin);
    }

    return jsonResponse({ error: 'Not found' }, 404, allowedOrigin);
  }
};

async function readCounts(db) {
  const row = await db.prepare(
    'SELECT page_views, download_clicks FROM stats WHERE id = 1'
  ).first();

  if (row) {
    return row;
  }

  await db.prepare(
    'INSERT INTO stats (id, page_views, download_clicks) VALUES (1, 0, 0)'
  ).run();

  return { page_views: 0, download_clicks: 0 };
}

async function incrementAndRead(db, column, amount) {
  await db.prepare(
    `INSERT INTO stats (id, page_views, download_clicks)
     VALUES (1, 0, 0)
     ON CONFLICT(id) DO NOTHING`
  ).run();

  await db.prepare(
    `UPDATE stats
     SET ${column} = ${column} + ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = 1`
  ).bind(amount).run();

  return readCounts(db);
}

function jsonResponse(data, status = 200, allowedOrigin = '*') {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

function corsResponse(body, allowedOrigin = '*') {
  return new Response(body, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
