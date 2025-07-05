module.exports.up = async (db) => {
  await db.run(`
    CREATE TABLE IF NOT EXISTS Category (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT    NOT NULL UNIQUE
    );
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS ItemCategory (
      item_id     INTEGER NOT NULL 
                    REFERENCES FeedItem(id) ON DELETE CASCADE,
      category_id INTEGER NOT NULL 
                    REFERENCES Category(id) ON DELETE CASCADE,
      PRIMARY KEY(item_id, category_id)
    );
  `);
};

module.exports.down = async (db) => {
  await db.run(`DROP TABLE IF EXISTS ItemCategory;`);
  await db.run(`DROP TABLE IF EXISTS Category;`);
};
