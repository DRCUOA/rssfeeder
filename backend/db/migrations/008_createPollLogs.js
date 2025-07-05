module.exports.up = async (knex) => {
  return knex.schema.createTable('PollLog', (table) => {
    table.increments('id').primary();
    table.integer('feed_id').notNullable().references('id').inTable('Feed').onDelete('CASCADE');
    table.timestamp('run_at').defaultTo(knex.fn.now());
    table.integer('success').notNullable();
    table.integer('new_items').notNullable();
  });
};

module.exports.down = async (knex) => {
  return knex.schema.dropTableIfExists('PollLog');
};
