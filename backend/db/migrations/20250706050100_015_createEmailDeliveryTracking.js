/**
 * Migration: Create Email Delivery Tracking tables
 */

exports.up = function(knex) {
  return knex.schema.createTable('email_deliveries', function(table) {
    table.increments('id').primary();
    table.string('message_id', 255).notNullable().unique(); // SMTP message ID
    table.string('template_name', 100).notNullable(); // Template used
    table.string('recipient_email', 255).notNullable();
    table.integer('user_id').unsigned().nullable(); // Recipient user ID if registered
    table.string('subject', 255).notNullable();
    table.string('status', 50).defaultTo('sent'); // sent, delivered, bounced, failed
    table.string('bounce_reason', 255).nullable();
    table.text('smtp_response').nullable();
    table.timestamp('sent_at').defaultTo(knex.fn.now());
    table.timestamp('delivered_at').nullable();
    table.timestamp('first_opened_at').nullable();
    table.timestamp('last_opened_at').nullable();
    table.integer('open_count').defaultTo(0);
    table.integer('click_count').defaultTo(0);
    table.text('tracking_pixel_url').nullable();
    table.text('metadata').nullable(); // JSON for additional tracking data
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Foreign key
    table.foreign('user_id').references('id').inTable('User').onDelete('SET NULL');

    // Indexes
    table.index('message_id');
    table.index('recipient_email');
    table.index('user_id');
    table.index('template_name');
    table.index('status');
    table.index('sent_at');
  }).then(() => {
    // Create email_clicks table for detailed click tracking
    return knex.schema.createTable('email_clicks', function(table) {
      table.increments('id').primary();
      table.integer('delivery_id').unsigned().notNullable();
      table.string('url', 500).notNullable();
      table.string('ip_address', 45).nullable();
      table.string('user_agent', 500).nullable();
      table.timestamp('clicked_at').defaultTo(knex.fn.now());
      table.text('referrer').nullable();
      table.text('metadata').nullable(); // JSON for additional click data

      // Foreign key
      table.foreign('delivery_id').references('id').inTable('email_deliveries').onDelete('CASCADE');

      // Indexes
      table.index('delivery_id');
      table.index('url');
      table.index('clicked_at');
    });
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('email_clicks')
    .then(() => knex.schema.dropTable('email_deliveries'));
}; 