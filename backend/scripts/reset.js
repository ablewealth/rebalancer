#!/usr/bin/env node
/**
 * Database Reset Script
 * Drops all tables and recreates the schema (DESTRUCTIVE!)
 */

const { query, testConnection } = require('../config/database');
const { runMigrations } = require('./migrate');

async function resetDatabase() {
    console.log('⚠️  WARNING: This will DESTROY all data in the database!');
    console.log('🔄 Resetting database...');
    
    try {
        // Test connection
        const connected = await testConnection();
        if (!connected) {
            throw new Error('Database connection failed');
        }
        
        // Get all tables
        const tables = await query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
        `);
        
        if (tables.rows.length > 0) {
            console.log(`🗑️  Dropping ${tables.rows.length} tables...`);
            
            // Drop all tables with CASCADE to handle dependencies
            for (const table of tables.rows) {
                await query(`DROP TABLE IF EXISTS ${table.table_name} CASCADE`);
                console.log(`   Dropped: ${table.table_name}`);
            }
        } else {
            console.log('ℹ️  No tables found to drop');
        }
        
        // Drop all sequences
        const sequences = await query(`
            SELECT sequence_name 
            FROM information_schema.sequences 
            WHERE sequence_schema = 'public'
        `);
        
        if (sequences.rows.length > 0) {
            console.log(`🔢 Dropping ${sequences.rows.length} sequences...`);
            for (const sequence of sequences.rows) {
                await query(`DROP SEQUENCE IF EXISTS ${sequence.sequence_name} CASCADE`);
                console.log(`   Dropped: ${sequence.sequence_name}`);
            }
        }
        
        // Drop all custom types
        const types = await query(`
            SELECT typname 
            FROM pg_type 
            WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
            AND typtype = 'e'
        `);
        
        if (types.rows.length > 0) {
            console.log(`📝 Dropping ${types.rows.length} custom types...`);
            for (const type of types.rows) {
                await query(`DROP TYPE IF EXISTS ${type.typname} CASCADE`);
                console.log(`   Dropped: ${type.typname}`);
            }
        }
        
        console.log('✅ Database reset complete');
        
        // Recreate schema
        console.log('🔄 Recreating schema...');
        await runMigrations();
        
        console.log('🎉 Database reset and migration complete!');
        
    } catch (error) {
        console.error('❌ Reset failed:', error.message);
        throw error;
    }
}

// Require confirmation for direct execution
if (require.main === module) {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    rl.question('Are you sure you want to RESET the database? This will DELETE ALL DATA! (yes/no): ', (answer) => {
        rl.close();
        
        if (answer.toLowerCase() === 'yes') {
            resetDatabase()
                .then(() => {
                    console.log('🎉 Database reset complete!');
                    process.exit(0);
                })
                .catch(error => {
                    console.error('💥 Fatal error:', error);
                    process.exit(1);
                });
        } else {
            console.log('❌ Reset cancelled');
            process.exit(0);
        }
    });
}

module.exports = { resetDatabase };
