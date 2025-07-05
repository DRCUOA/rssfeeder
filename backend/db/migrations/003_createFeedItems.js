module.exports.up = async (db) => {
  await db.run(`
    CREATE TABLE IF NOT EXISTS FeedItem (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      feed_id      INTEGER NOT NULL 
                    REFERENCES Feed(id) ON DELETE CASCADE,
      guid         TEXT    NOT NULL,
      title        TEXT    NOT NULL,
      link         TEXT    NOT NULL,
      summary      TEXT,
      content      TEXT,
      author       TEXT,
      image_url    TEXT,
      published_at TEXT,
      fetched_at   TEXT    NOT NULL DEFAULT (datetime('now')),
      created_at   TEXT    DEFAULT (datetime('now')),
      UNIQUE(feed_id, guid)
    );
  `);

  // for efficient infinite-scroll ordering
  await db.run(`
    CREATE INDEX IF NOT EXISTS idx_feeditem_published 
    ON FeedItem(published_at DESC, id DESC);
  `);
};

module.exports.down = async (db) => {
  await db.run(`DROP INDEX IF EXISTS idx_feeditem_published;`);
  await db.run(`DROP TABLE IF EXISTS FeedItem;`);
};
