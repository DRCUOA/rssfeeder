module.exports.up = async (db) => {
  // enable foreign-keys for cascading deletes
  await db.run(`PRAGMA foreign_keys = ON;`);

  await db.run(`
    CREATE TABLE IF NOT EXISTS User (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      name                TEXT    NOT NULL,
      email               TEXT    UNIQUE NOT NULL,
      avatar_url          TEXT,
      dark_mode           INTEGER NOT NULL DEFAULT 0,
      text_size           INTEGER NOT NULL DEFAULT 2,    -- 1=small…3=large
      theme_color         TEXT    NOT NULL DEFAULT 'orange',
      push_notifications  INTEGER NOT NULL DEFAULT 1,
      email_notifications INTEGER NOT NULL DEFAULT 1,
      new_feed_alerts     INTEGER NOT NULL DEFAULT 0,
      data_collection     INTEGER NOT NULL DEFAULT 1,
      created_at          TEXT    DEFAULT (datetime('now')),
      updated_at          TEXT    DEFAULT (datetime('now'))
    );
  `);
};

module.exports.down = async (db) => {
  await db.run(`DROP TABLE IF EXISTS User;`);
};
