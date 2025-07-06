/**
 * Migration: Create Email Preferences table
 */

exports.up = function(knex) {
  return knex.schema.createTable('email_preferences', function(table) {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.string('preference_type', 100).notNullable(); // welcome, password_reset, marketing, newsletter, etc.
    table.boolean('is_enabled').defaultTo(true);
    table.string('frequency', 50).defaultTo('immediate'); // immediate, daily, weekly, monthly
    table.string('delivery_method', 50).defaultTo('email'); // email, sms, push (for future)
    table.text('custom_settings').nullable(); // JSON for additional settings
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Foreign key
    table.foreign('user_id').references('id').inTable('User').onDelete('CASCADE');

    // Composite unique constraint
    table.unique(['user_id', 'preference_type']);

    // Indexes
    table.index('user_id');
    table.index('preference_type');
    table.index('is_enabled');
  }).then(() => {
    // Create email_subscriptions table for bulk email lists
    return knex.schema.createTable('email_subscriptions', function(table) {
      table.increments('id').primary();
      table.string('list_name', 100).notNullable(); // newsletter, announcements, marketing
      table.string('list_description', 255).nullable();
      table.string('email', 255).notNullable();
      table.integer('user_id').unsigned().nullable(); // Null if not registered user
      table.string('status', 50).defaultTo('active'); // active, unsubscribed, bounced
      table.string('subscription_source', 100).nullable(); // registration, manual, import
      table.timestamp('subscribed_at').defaultTo(knex.fn.now());
      table.timestamp('unsubscribed_at').nullable();
      table.string('unsubscribe_reason', 255).nullable();
      table.text('metadata').nullable(); // JSON for additional subscription data
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      // Foreign key
      table.foreign('user_id').references('id').inTable('User').onDelete('CASCADE');

      // Composite unique constraint
      table.unique(['list_name', 'email']);

      // Indexes
      table.index('list_name');
      table.index('email');
      table.index('user_id');
      table.index('status');
      table.index('subscribed_at');
    });
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('email_subscriptions')
    .then(() => knex.schema.dropTable('email_preferences'));
}; 