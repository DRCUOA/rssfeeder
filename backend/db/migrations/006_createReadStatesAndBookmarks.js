module.exports.up = async (db) => {
  await db.run(`
    CREATE TABLE IF NOT EXISTS ReadState (
      user_id  INTEGER NOT NULL 
                REFERENCES User(id) ON DELETE CASCADE,
      item_id  INTEGER NOT NULL 
                REFERENCES FeedItem(id) ON DELETE CASCADE,
      read_at  TEXT    DEFAULT (datetime('now')),
      PRIMARY KEY(user_id, item_id)
    );
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS Bookmark (
      user_id       INTEGER NOT NULL 
                      REFERENCES User(id) ON DELETE CASCADE,
      item_id       INTEGER NOT NULL 
                      REFERENCES FeedItem(id) ON DELETE CASCADE,
      bookmarked_at TEXT    DEFAULT (datetime('now')),
      PRIMARY KEY(user_id, item_id)
    );
  `);
};

module.exports.down = async (db) => {
  await db.run(`DROP TABLE IF EXISTS Bookmark;`);
  await db.run(`DROP TABLE IF EXISTS ReadState;`);
};
