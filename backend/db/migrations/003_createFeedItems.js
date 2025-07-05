module.exports.up = async (knex) => {
  await knex.schema.createTable('FeedItem', (table) => {
    table.increments('id').primary();
    table.integer('feed_id').notNullable().references('id').inTable('Feed').onDelete('CASCADE');
    table.text('guid').notNullable();
    table.text('title').notNullable();
    table.text('link').notNullable();
    table.text('summary').nullable();
    table.text('content').nullable();
    table.text('author').nullable();
    table.text('image_url').nullable();
    table.timestamp('published_at').nullable();
    table.timestamp('fetched_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['feed_id', 'guid']);
  });

  // For efficient infinite-scroll ordering
  return knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_feeditem_published ON FeedItem(published_at DESC, id DESC)');
};

module.exports.down = async (knex) => {
  await knex.schema.raw('DROP INDEX IF EXISTS idx_feeditem_published');
  return knex.schema.dropTableIfExists('FeedItem');
};
