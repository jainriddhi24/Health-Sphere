import { Pool } from 'pg';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres@localhost:5432/health_sphere'
});

async function migrate() {
  const uploadsRoot = path.join(process.cwd(), 'uploads');
  try {
    const res = await pool.query(`SELECT id, medical_report_url FROM users WHERE medical_report_url IS NOT NULL`);
    for (const row of res.rows) {
      const { id, medical_report_url } = row;
      if (!medical_report_url) continue;
      const oldPath = path.join(uploadsRoot, medical_report_url);
      const newDir = path.join(uploadsRoot, id);
      const newPath = path.join(newDir, medical_report_url);
      if (fs.existsSync(oldPath)) {
        if (!fs.existsSync(newDir)) fs.mkdirSync(newDir, { recursive: true });
        fs.renameSync(oldPath, newPath);
        console.log(`Moved ${oldPath} -> ${newPath}`);
      } else {
        console.log(`Skipping: ${oldPath} not found for user ${id}`);
      }
    }
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
}

migrate().catch(e => {
  console.error(e);
  process.exit(1);
});
