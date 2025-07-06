/**
 * Migration: Create Email Templates table for customizable email templates
 */

exports.up = function(knex) {
  return knex.schema.createTable('email_templates', function(table) {
    table.increments('id').primary();
    table.string('name', 100).notNullable().unique(); // welcome, password_reset, password_change, etc.
    table.string('subject', 255).notNullable();
    table.text('html_content').notNullable(); // HTML template with variables
    table.text('text_content').notNullable(); // Plain text template with variables
    table.text('variables').nullable(); // JSON array of template variables
    table.boolean('is_active').defaultTo(true);
    table.string('category', 50).defaultTo('system'); // system, marketing, transactional
    table.text('description').nullable();
    table.string('from_name', 100).nullable();
    table.string('from_email', 255).nullable();
    table.integer('created_by').unsigned().nullable(); // User who created/modified
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Foreign key
    table.foreign('created_by').references('id').inTable('User').onDelete('SET NULL');

    // Indexes
    table.index('name');
    table.index('category');
    table.index('is_active');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('email_templates');
}; 