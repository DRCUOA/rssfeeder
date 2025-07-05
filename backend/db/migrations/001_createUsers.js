module.exports.up = async (knex) => {
  // Enable foreign keys for cascading deletes
  await knex.raw('PRAGMA foreign_keys = ON');

  return knex.schema.createTable('User', (table) => {
    table.increments('id').primary();
    table.text('name').notNullable();
    table.text('email').notNullable().unique();
    table.text('avatar_url').nullable();
    table.integer('dark_mode').notNullable().defaultTo(0);
    table.integer('text_size').notNullable().defaultTo(2); // 1=small…3=large
    table.text('theme_color').notNullable().defaultTo('orange');
    table.integer('push_notifications').notNullable().defaultTo(1);
    table.integer('email_notifications').notNullable().defaultTo(1);
    table.integer('new_feed_alerts').notNullable().defaultTo(0);
    table.integer('data_collection').notNullable().defaultTo(1);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

module.exports.down = async (knex) => {
  return knex.schema.dropTableIfExists('User');
};
