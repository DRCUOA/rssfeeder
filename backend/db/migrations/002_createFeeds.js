module.exports.up = async (db) => {
  await db.run(`
    CREATE TABLE IF NOT EXISTS Feed (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      name             TEXT    NOT NULL,
      url              TEXT    UNIQUE NOT NULL,
      status           TEXT    NOT NULL DEFAULT 'active',  -- active | paused
      fetch_interval   INTEGER NOT NULL DEFAULT 3600,      -- seconds
      last_fetched_at  TEXT,
      created_at       TEXT    DEFAULT (datetime('now')),
      updated_at       TEXT    DEFAULT (datetime('now'))
    );
  `);
};

module.exports.down = async (db) => {
  await db.run(`DROP TABLE IF EXISTS Feed;`);
};
