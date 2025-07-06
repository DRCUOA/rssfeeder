/**
 * Migration: Add Google ID field to User table for OAuth integration
 */

exports.up = function(knex) {
  return knex.schema.table('User', function(table) {
    table.string('google_id', 255).nullable().unique().comment('Google OAuth ID');
    table.boolean('email_verified').defaultTo(false).comment('Whether email is verified');
  });
};

exports.down = function(knex) {
  return knex.schema.table('User', function(table) {
    table.dropColumn('google_id');
    table.dropColumn('email_verified');
  });
};
