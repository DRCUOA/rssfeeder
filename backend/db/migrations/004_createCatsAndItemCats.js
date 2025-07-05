module.exports.up = async (knex) => {
  await knex.schema.createTable('Category', (table) => {
    table.increments('id').primary();
    table.text('name').notNullable().unique();
  });

  return knex.schema.createTable('ItemCategory', (table) => {
    table.integer('item_id').notNullable().references('id').inTable('FeedItem').onDelete('CASCADE');
    table.integer('category_id').notNullable().references('id').inTable('Category').onDelete('CASCADE');
    table.primary(['item_id', 'category_id']);
  });
};

module.exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('ItemCategory');
  return knex.schema.dropTableIfExists('Category');
};
