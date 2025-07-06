/**
 * Migration: Create token_blacklist table
 * Purpose: Enable advanced token management with blacklisting and revocation
 */

exports.up = function(knex) {
  return knex.schema.createTable('token_blacklist', (table) => {
    table.increments('id').primary();
    table.string('token_id').notNullable().index();
    table.integer('user_id').unsigned().notNullable().index();
    table.string('reason').notNullable().defaultTo('user_logout');
    table.timestamp('expires_at').notNullable().index();
    table.timestamps(true, true);
    
    // Foreign key constraint
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    
    // Indexes for performance
    table.index(['token_id', 'expires_at']);
    table.index(['user_id', 'expires_at']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('token_blacklist');
}; 