CREATE TABLE IF NOT EXISTS stats (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  page_views INTEGER NOT NULL DEFAULT 0,
  download_clicks INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO stats (id, page_views, download_clicks)
VALUES (1, 0, 0);
