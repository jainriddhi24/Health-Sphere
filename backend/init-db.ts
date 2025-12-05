import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Try postgres superuser first, fall back to riddhi
const connectionStrings = [
  'postgresql://postgres:postgres@localhost:5432/healthsphere',
  'postgresql://postgres:@localhost:5432/healthsphere',
  process.env.DATABASE_URL
];

let pool: Pool;

async function createUsersTable() {
  try {
    console.log('🔄 Attempting to initialize database...');
    
    let connected = false;
    for (const connStr of connectionStrings) {
      try {
        pool = new Pool({ connectionString: connStr });
        const client = await pool.connect();
        client.release();
        console.log('✅ Connected to database');
        connected = true;
        break;
      } catch (e) {
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
      // Ensure pgcrypto extension for gen_random_uuid() is enabled
      await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

      // Check if users table exists
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM pg_tables 
          WHERE tablename = 'users'
        );
      `);
      
      if (result.rows[0].exists) {
        console.log('✅ Users table already exists');
      } else {
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

      // Ensure chat_logs table exists (insert logs for chatbot interactions)
      const chatLogsExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM pg_tables
          WHERE tablename = 'chat_logs'
        );
      `);
      if (!chatLogsExists.rows[0].exists) {
        console.log('📋 Creating chat_logs table...');
        await client.query(`
          CREATE TABLE IF NOT EXISTS chat_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            query TEXT NOT NULL,
            response TEXT NOT NULL,
            generated_json JSONB,
            model VARCHAR(200) DEFAULT 'mock',
            confidence DECIMAL(3,2),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);
        console.log('✅ chat_logs table created successfully');
      } else {
        console.log('✅ chat_logs already exists');
      }

      // Ensure additional profile columns exist
      const columnsRes = await client.query(`
        SELECT column_name FROM information_schema.columns WHERE table_name = 'users';
      `);
      const existingCols = new Set(columnsRes.rows.map((r: any) => r.column_name));
      const alterStatements: string[] = [];
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
      // Add processing result column to store ML microservice outputs (JSONB)
      if (!existingCols.has('processing_result')) {
        alterStatements.push("ALTER TABLE users ADD COLUMN processing_result JSONB;");
      }
      for (const stmt of alterStatements) {
        console.log('🔧 Applying migration:', stmt);
        await client.query(stmt);
      }
    } finally {
      client.release();
    }

    // Create community tables
    const client2 = await pool.connect();
    try {
      console.log('📋 Creating community tables...');
      
      // Community challenges table
      await client2.query(`
        CREATE TABLE IF NOT EXISTS community_challenges (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title VARCHAR(200) NOT NULL,
          description TEXT,
          category VARCHAR(50),
          difficulty VARCHAR(20) DEFAULT 'medium',
          goal VARCHAR(300),
          prize VARCHAR(300),
          start_date TIMESTAMP WITH TIME ZONE NOT NULL,
          end_date TIMESTAMP WITH TIME ZONE NOT NULL,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          CHECK (end_date > start_date)
        );
      `).catch(() => console.log('✅ community_challenges already exists'));

      // Ensure community_challenges has all required columns for seed data (add if missing)
      const ccColsRes = await client2.query(`
        SELECT column_name FROM information_schema.columns WHERE table_name = 'community_challenges';
      `);
      const ccExistingCols = new Set(ccColsRes.rows.map((r: any) => r.column_name));
      const ccAlterStatements: string[] = [];
      if (!ccExistingCols.has('difficulty')) {
        ccAlterStatements.push("ALTER TABLE community_challenges ADD COLUMN difficulty VARCHAR(20) DEFAULT 'medium';");
      }
      if (!ccExistingCols.has('category')) {
        ccAlterStatements.push("ALTER TABLE community_challenges ADD COLUMN category VARCHAR(50);");
      }
      if (!ccExistingCols.has('goal')) {
        ccAlterStatements.push("ALTER TABLE community_challenges ADD COLUMN goal VARCHAR(300);");
      }
      if (!ccExistingCols.has('prize')) {
        ccAlterStatements.push("ALTER TABLE community_challenges ADD COLUMN prize VARCHAR(300);");
      }
      for (const stmt of ccAlterStatements) {
        console.log('🔧 Applying community_challenges migration:', stmt);
        await client2.query(stmt);
      }

      // Challenge participants table
      await client2.query(`
        CREATE TABLE IF NOT EXISTS challenge_participants (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          challenge_id UUID NOT NULL REFERENCES community_challenges(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          progress_metric DECIMAL(10, 2) DEFAULT 0,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(challenge_id, user_id)
        );
      `).catch(() => console.log('✅ challenge_participants already exists'));

      // Community groups table
      await client2.query(`
        CREATE TABLE IF NOT EXISTS community_groups (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(200) NOT NULL,
          description TEXT,
          category VARCHAR(50),
          max_members INTEGER,
          created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          image_url VARCHAR(500),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `).catch(() => console.log('✅ community_groups already exists'));

      // Community group members table
      await client2.query(`
        CREATE TABLE IF NOT EXISTS community_group_members (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          group_id UUID NOT NULL REFERENCES community_groups(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(group_id, user_id)
        );
      `).catch(() => console.log('✅ community_group_members already exists'));

      // Social posts table
      await client2.query(`
        CREATE TABLE IF NOT EXISTS social_posts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          post_type VARCHAR(50) DEFAULT 'general',
          image_url VARCHAR(500),
          likes_count INTEGER DEFAULT 0,
          comments_count INTEGER DEFAULT 0,
          metadata JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `).catch(() => console.log('✅ social_posts already exists'));

      // Social post likes table
      await client2.query(`
        CREATE TABLE IF NOT EXISTS social_post_likes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          post_id UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(post_id, user_id)
        );
      `).catch(() => console.log('✅ social_post_likes already exists'));

      // Social post comments table
      await client2.query(`
        CREATE TABLE IF NOT EXISTS social_post_comments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          post_id UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `).catch(() => console.log('✅ social_post_comments already exists'));

      console.log('✅ Community tables initialized');
    } catch (error) {
      console.error('⚠️  Error creating community tables:', error);
    } finally {
      client2.release();
    }

    await pool.end();
    console.log('✅ Database initialization complete');
  } catch (error) {
    console.error('❌ Error:', error);
    if (pool) {
      await pool.end().catch(() => {});
    }
    process.exit(1);
  }
}

createUsersTable();
