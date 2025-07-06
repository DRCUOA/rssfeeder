/**
 * Migration: Create Sessions table for session management
 */

exports.up = function(knex) {
  return knex.schema.createTable('Session', function(table) {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.string('session_token', 255).notNullable().unique();
    table.string('refresh_token', 512).nullable();
    table.string('device_info', 500).nullable();
    table.string('ip_address', 45).nullable(); // IPv6 support
    table.string('user_agent', 1000).nullable();
    table.timestamp('last_activity').defaultTo(knex.fn.now());
    table.timestamp('expires_at').notNullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Foreign key
    table.foreign('user_id').references('id').inTable('User').onDelete('CASCADE');

    // Indexes
    table.index('user_id');
    table.index('session_token');
    table.index('last_activity');
    table.index('expires_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('Session');
};
