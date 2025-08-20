#!/usr/bin/env node
/**
 * Database Status Script
 * Shows the current status of the database and migrations
 */

const { query, testConnection } = require('../config/database');

async function checkDatabaseStatus() {
    console.log('🔍 Checking database status...');
    
    try {
        // Test connection
        const connected = await testConnection();
        if (!connected) {
            console.log('❌ Database connection failed');
            return;
        }
        
        console.log('✅ Database connection successful');
        
        // Check if tables exist
        const tables = await query(`
            SELECT table_name, table_type
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        if (tables.rows.length === 0) {
            console.log('⚠️  No tables found - run migrations first');
            return;
        }
        
        console.log('\n📋 Database Tables:');
        for (const table of tables.rows) {
            const count = await query(`SELECT COUNT(*) as count FROM ${table.table_name}`);
            console.log(`   ${table.table_name}: ${count.rows[0].count} records`);
        }
        
        // Check migrations
        try {
            const migrations = await query(`
                SELECT version, applied_at, description 
                FROM migrations 
                ORDER BY applied_at DESC
            `);
            
            console.log('\n🔄 Applied Migrations:');
            for (const migration of migrations.rows) {
                console.log(`   ${migration.version}: ${migration.description} (${migration.applied_at})`);
            }
        } catch (error) {
            console.log('\n⚠️  Migrations table not found');
        }
        
        // Check database size and performance
        const dbStats = await query(`
            SELECT 
                pg_size_pretty(pg_database_size(current_database())) as database_size,
                current_database() as database_name,
                version() as postgres_version
        `);
        
        console.log('\n📊 Database Information:');
        console.log(`   Database: ${dbStats.rows[0].database_name}`);
        console.log(`   Size: ${dbStats.rows[0].database_size}`);
        console.log(`   PostgreSQL Version: ${dbStats.rows[0].postgres_version.split(',')[0]}`);
        
        // Check recent activity
        try {
            const recentActivity = await query(`
                SELECT 
                    schemaname,
                    tablename,
                    n_tup_ins as inserts,
                    n_tup_upd as updates,
                    n_tup_del as deletes
                FROM pg_stat_user_tables 
                WHERE n_tup_ins + n_tup_upd + n_tup_del > 0
                ORDER BY n_tup_ins + n_tup_upd + n_tup_del DESC
            `);
            
            if (recentActivity.rows.length > 0) {
                console.log('\n📈 Table Activity:');
                for (const activity of recentActivity.rows) {
                    console.log(`   ${activity.tablename}: ${activity.inserts}i, ${activity.updates}u, ${activity.deletes}d`);
                }
            }
        } catch (error) {
            // Statistics may not be available
        }
        
        console.log('\n✅ Database status check complete');
        
    } catch (error) {
        console.error('❌ Status check failed:', error.message);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    checkDatabaseStatus()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('💥 Fatal error:', error);
            process.exit(1);
        });
}

module.exports = { checkDatabaseStatus };
