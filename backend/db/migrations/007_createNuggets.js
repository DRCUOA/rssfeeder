module.exports.up = async (knex) => {
  return knex.schema.createTable('Nugget', (table) => {
    table.increments('id').primary();
    table.integer('user_id').notNullable().references('id').inTable('User').onDelete('CASCADE');
    table.integer('item_id').notNullable().references('id').inTable('FeedItem').onDelete('CASCADE');
    table.text('purpose').notNullable(); // reply | reshare | comment | bookmark
    table.text('instructions').nullable();
    table.text('service').notNullable(); // MakeAI | AutoShare | EngageBot
    table.timestamp('scheduled_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

module.exports.down = async (knex) => {
  return knex.schema.dropTableIfExists('Nugget');
};
