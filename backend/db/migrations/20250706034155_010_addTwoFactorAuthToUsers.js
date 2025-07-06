/**
 * Migration: Add Two-Factor Authentication fields to User table
 */

exports.up = function(knex) {
  return knex.schema.table('User', function(table) {
    table.string('twofa_secret', 255).nullable().comment('TOTP secret key for 2FA');
    table.boolean('twofa_enabled').defaultTo(false).comment('Whether 2FA is enabled');
    table.json('twofa_backup_codes').nullable().comment('Backup codes for 2FA recovery');
  });
};

exports.down = function(knex) {
  return knex.schema.table('User', function(table) {
    table.dropColumn('twofa_secret');
    table.dropColumn('twofa_enabled');
    table.dropColumn('twofa_backup_codes');
  });
};
