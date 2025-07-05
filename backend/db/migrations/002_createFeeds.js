module.exports.up = async (knex) => {
  return knex.schema.createTable('Feed', (table) => {
    table.increments('id').primary();
    table.text('name').notNullable();
    table.text('url').notNullable().unique();
    table.text('status').notNullable().defaultTo('active'); // active | paused
    table.integer('fetch_interval').notNullable().defaultTo(3600); // seconds
    table.timestamp('last_fetched_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

module.exports.down = async (knex) => {
  return knex.schema.dropTableIfExists('Feed');
};
