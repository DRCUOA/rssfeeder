module.exports.up = async (knex) => {
  return knex.schema.createTable('UserFeedSubscription', (table) => {
    table.increments('id').primary();
    table.integer('user_id').notNullable().references('id').inTable('User').onDelete('CASCADE');
    table.integer('feed_id').notNullable().references('id').inTable('Feed').onDelete('CASCADE');
    table.integer('auto_refresh').notNullable().defaultTo(1);
    table.integer('custom_interval').nullable(); // override seconds
    table.integer('show_read_items').notNullable().defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['user_id', 'feed_id']);
  });
};

module.exports.down = async (knex) => {
  return knex.schema.dropTableIfExists('UserFeedSubscription');
};
