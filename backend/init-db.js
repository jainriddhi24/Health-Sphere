"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Try postgres superuser first, fall back to riddhi
const connectionStrings = [
    'postgresql://postgres:postgres@localhost:5432/healthsphere',
    'postgresql://postgres:@localhost:5432/healthsphere',
    process.env.DATABASE_URL
];
let pool;
async function createUsersTable() {
    try {
        console.log('🔄 Attempting to initialize database...');
        let connected = false;
        for (const connStr of connectionStrings) {
            try {
                pool = new pg_1.Pool({ connectionString: connStr });
                const client = await pool.connect();
                client.release();
                console.log('✅ Connected to database');
                connected = true;
                break;
            }
            catch (e) {
                if (connStr) {
                    console.log(`⚠️  Connection attempt failed: ${connStr.split('@')[1] || 'unknown'}`);
                }
            }
        }
        if (!connected) {
            throw new Error('Could not connect to database with any credentials');
        }
        const client = await pool.connect();
        try {
            // Check if users table exists
            const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM pg_tables 
          WHERE tablename = 'users'
        );
      `);
            if (result.rows[0].exists) {
                console.log('✅ Users table already exists');
            }
            else {
                console.log('📋 Creating users table...');
                // Create users table without enum types (use VARCHAR instead)
                await client.query(`
          CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(100) NOT NULL,
            email VARCHAR(255) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            age INTEGER NOT NULL CHECK (age >= 13 AND age <= 120),
            gender VARCHAR(50) NOT NULL,
            height DECIMAL(5, 2) NOT NULL CHECK (height >= 100 AND height <= 250),
            weight DECIMAL(5, 2) NOT NULL CHECK (weight >= 30 AND weight <= 300),
            chronic_condition VARCHAR(50) DEFAULT 'none',
            premium_unlocked BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);
                console.log('✅ Users table created successfully');
            }
            // List all tables
            const tables = await client.query(`
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        ORDER BY tablename;
      `);
            if (tables.rows.length > 0) {
                console.log('📊 Tables in database:');
                tables.rows.forEach(row => {
                    console.log(`  - ${row.tablename}`);
                });
            }
        }
        finally {
            client.release();
        }
        // Ensure additional profile columns exist
        const columnsRes = await client.query(`
        SELECT column_name FROM information_schema.columns WHERE table_name = 'users';
      `);
        const existingCols = new Set(columnsRes.rows.map((r) => r.column_name));
        const alterStatements = [];
        if (!existingCols.has('medical_report_url')) {
            alterStatements.push("ALTER TABLE users ADD COLUMN medical_report_url VARCHAR(500);");
        }
        if (!existingCols.has('lifestyle')) {
            alterStatements.push("ALTER TABLE users ADD COLUMN lifestyle JSONB;");
        }
        if (!existingCols.has('personal_goals')) {
            alterStatements.push("ALTER TABLE users ADD COLUMN personal_goals TEXT[];");
        }
        if (!existingCols.has('medical_report_uploaded_at')) {
            alterStatements.push("ALTER TABLE users ADD COLUMN medical_report_uploaded_at TIMESTAMPTZ;");
        }
        for (const stmt of alterStatements) {
            console.log('🔧 Applying migration:', stmt);
            await client.query(stmt);
        }
        await pool.end();
        console.log('✅ Database initialization complete');
    }
    catch (error) {
        console.error('❌ Error:', error);
        if (pool) {
            await pool.end().catch(() => { });
        }
        process.exit(1);
    }
}
createUsersTable();
