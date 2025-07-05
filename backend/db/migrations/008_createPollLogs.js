module.exports.up = async (db) => {
  await db.run(`
    CREATE TABLE IF NOT EXISTS PollLog (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      feed_id    INTEGER NOT NULL 
                    REFERENCES Feed(id) ON DELETE CASCADE,
      run_at     TEXT    DEFAULT (datetime('now')),
      success    INTEGER NOT NULL,
      new_items  INTEGER NOT NULL
    );
  `);
};

module.exports.down = async (db) => {
  await db.run(`DROP TABLE IF EXISTS PollLog;`);
};
