module.exports.up = async (db) => {
  await db.run(`
    CREATE TABLE IF NOT EXISTS Nugget (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER NOT NULL 
                    REFERENCES User(id) ON DELETE CASCADE,
      item_id      INTEGER NOT NULL 
                    REFERENCES FeedItem(id) ON DELETE CASCADE,
      purpose      TEXT    NOT NULL,   -- reply | reshare | comment | bookmark
      instructions TEXT,
      service      TEXT    NOT NULL,   -- MakeAI | AutoShare | EngageBot
      scheduled_at TEXT,
      created_at   TEXT    DEFAULT (datetime('now'))
    );
  `);
};

module.exports.down = async (db) => {
  await db.run(`DROP TABLE IF EXISTS Nugget;`);
};
