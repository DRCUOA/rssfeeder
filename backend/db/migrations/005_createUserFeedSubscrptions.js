module.exports.up = async (db) => {
  await db.run(`
    CREATE TABLE IF NOT EXISTS UserFeedSubscription (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id         INTEGER NOT NULL 
                        REFERENCES User(id) ON DELETE CASCADE,
      feed_id         INTEGER NOT NULL 
                        REFERENCES Feed(id) ON DELETE CASCADE,
      auto_refresh    INTEGER NOT NULL DEFAULT 1,
      custom_interval INTEGER,       -- override seconds
      show_read_items INTEGER NOT NULL DEFAULT 0,
      created_at      TEXT    DEFAULT (datetime('now')),
      UNIQUE(user_id, feed_id)
    );
  `);
};

module.exports.down = async (db) => {
  await db.run(`DROP TABLE IF EXISTS UserFeedSubscription;`);
};
