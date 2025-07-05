module.exports.up = async (knex) => {
  await knex.schema.createTable('ReadState', (table) => {
    table.integer('user_id').notNullable().references('id').inTable('User').onDelete('CASCADE');
    table.integer('item_id').notNullable().references('id').inTable('FeedItem').onDelete('CASCADE');
    table.timestamp('read_at').defaultTo(knex.fn.now());
    table.primary(['user_id', 'item_id']);
  });

  return knex.schema.createTable('Bookmark', (table) => {
    table.integer('user_id').notNullable().references('id').inTable('User').onDelete('CASCADE');
    table.integer('item_id').notNullable().references('id').inTable('FeedItem').onDelete('CASCADE');
    table.timestamp('bookmarked_at').defaultTo(knex.fn.now());
    table.primary(['user_id', 'item_id']);
  });
};

module.exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('Bookmark');
  return knex.schema.dropTableIfExists('ReadState');
};
