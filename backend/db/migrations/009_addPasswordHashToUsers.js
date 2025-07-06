module.exports.up = async (knex) => {
  // Enable foreign keys for cascading deletes
  await knex.raw('PRAGMA foreign_keys = ON');

  return knex.schema.alterTable('User', (table) => {
    table.text('password_hash').nullable(); // Nullable for users who might register via OAuth
    table.text('reset_token').nullable(); // For password reset functionality
    table.timestamp('reset_token_expires').nullable(); // Reset token expiration
    table.timestamp('last_login').nullable(); // Track last login time
    table.integer('login_attempts').notNullable().defaultTo(0); // Track failed login attempts
    table.timestamp('locked_until').nullable(); // Account lockout timestamp
  });
};

module.exports.down = async (knex) => {
  return knex.schema.alterTable('User', (table) => {
    table.dropColumn('password_hash');
    table.dropColumn('reset_token');
    table.dropColumn('reset_token_expires');
    table.dropColumn('last_login');
    table.dropColumn('login_attempts');
    table.dropColumn('locked_until');
  });
}; 