#!/usr/bin/env node
/**
 * Database Migration Script for Neon Integration
 * Runs the schema.sql file against the configured database
 */

const fs = require('fs');
const path = require('path');
const { query, testConnection } = require('../config/database');

async function runMigrations() {
    console.log('🚀 Starting database migrations...');
    
    try {
        // Test connection first
        const connected = await testConnection();
        if (!connected) {
            throw new Error('Database connection failed');
        }
        
        // Read schema file
        const schemaPath = path.join(__dirname, '../database/schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        // Split schema into individual statements
        const statements = schema
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('CREATE DATABASE'));
        
        console.log(`📋 Found ${statements.length} migration statements`);
        
        // Execute each statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (statement.trim()) {
                console.log(`📝 Executing migration ${i + 1}/${statements.length}...`);
                await query(statement);
            }
        }
        
        // Verify tables were created
        const result = await query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        console.log('✅ Migrations completed successfully!');
        console.log('📊 Created tables:', result.rows.map(row => row.table_name).join(', '));
        
        // Insert migration record
        await query(`
            INSERT INTO migrations (version, applied_at, description) 
            VALUES ($1, NOW(), $2)
            ON CONFLICT (version) DO NOTHING
        `, ['001', 'Initial schema setup for tax harvesting system']);
        
        console.log('🔄 Migration record updated');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    runMigrations()
        .then(() => {
            console.log('🎉 Database setup complete!');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Fatal error:', error);
            process.exit(1);
        });
}

module.exports = { runMigrations };
