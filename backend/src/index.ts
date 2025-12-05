import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';

// Import route handlers
import authRoutes from './routes/auth.routes';
import workoutRoutes from './routes/workout.routes';
import foodRoutes from './routes/food.routes';
import riskRoutes from './routes/risk.routes';
import assistantRoutes from './routes/assistant.routes';
import communityRoutes from './routes/community.routes';
import chatbotRoutes from './routes/chatbot.routes';
import reportRoutes from './routes/report.routes';

// Import database connection
import { testConnection } from './config/db';
import pool from './config/db';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5050;
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Root route
app.get('/', (req: Request, res: Response) => {
  res.json({ status: 'HealthSphere Backend Running' });
});

// Lightweight health-check under /api — consumers can use this to quickly check the backend status
app.get('/api', (req: Request, res: Response) => {
  const mlService = process.env.ML_SERVICE_URL || 'http://localhost:8000';
  res.json({ status: 'ok', api: 'HealthSphere Backend', mlService, timestamp: new Date().toISOString() });
});

// Simple ML service health check proxy
app.get('/api/ml/health', async (req: Request, res: Response) => {
  const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
  try {
    const mlRes = await axios.get(ML_SERVICE_URL + '/', { timeout: 2000 });
    res.json({ ml: mlRes.data, ok: true });
  } catch (err: any) {
    res.status(503).json({ ok: false, error: err.message || 'ML service unreachable', code: err.code });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/food', foodRoutes);
app.use('/api/risk', riskRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/report', reportRoutes);

// Global error handler for JSON parsing errors
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && err.message.includes('JSON')) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_JSON', message: 'Invalid JSON in request body' } });
  }
  next(err);
});

// Multer and general error handler: return JSON-friendly responses for client
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!err) return next();
  // Multer errors have a "code" and name 'MulterError'
  if (err.name === 'MulterError' || err.code === 'LIMIT_FILE_SIZE') {
    const message = err.message || 'File upload error';
    return res.status(400).json({ success: false, error: { code: 'UPLOAD_ERROR', message } });
  }
  // Custom typed errors (like our unsupported type)
  if (err.code === 'UNSUPPORTED_FILE_TYPE' || err.code === 'UNSUPPORTED') {
    const message = err.message || 'Unsupported file type';
    return res.status(400).json({ success: false, error: { code: err.code || 'UNSUPPORTED_FILE_TYPE', message } });
  }
  // Generic handler: include message but avoid leaking stack in production
  const status = err.status && Number(err.status) ? Number(err.status) : 500;
  const message = err.message || 'An unexpected error occurred';
  console.error('Unhandled error middleware:', err);
  return res.status(status).json({ success: false, error: { code: 'INTERNAL_ERROR', message } });
});

// Start server
const startServer = async () => {
  try {
    // In development mode, attempt to run DB initialization to create optional columns
    if (process.env.NODE_ENV !== 'production') {
      try {
        console.log('🔁 Running DB initialization script (development mode)');
        await import('./init-db');
      } catch (initErr) {
        // If init fails, log and continue; getProfile/updateProfile handlers handle missing columns gracefully
        console.warn('⚠️ DB init script failed:', initErr);
      }
    }
    // Test database connection
    await testConnection();
    // Check if the ML service is reachable and log status
    try {
      const mlCheck = await axios.get(ML_SERVICE_URL + '/', { timeout: 2000 });
      console.log('✅ ML Service reachable:', mlCheck?.data || mlCheck?.status);
    } catch (mlErr: any) {
      console.warn('⚠️ ML Service health check failed:', mlErr?.code || mlErr?.message || mlErr);
    }

    // In development, auto-create chat_logs if missing to avoid runtime failures
    if (process.env.NODE_ENV !== 'production') {
      try {
        const client = await pool.connect();
        try {
          const existsRes = await client.query(`SELECT EXISTS (SELECT FROM pg_tables WHERE tablename = 'chat_logs');`);
          const exists = existsRes.rows?.[0]?.exists || false;
          if (!exists) {
            console.log('📋 chat_logs table missing, creating it (development mode)');
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
            console.log('✅ Created chat_logs table');
          }
        } finally {
          client.release();
        }
      } catch (e) {
        console.warn('⚠️ Failed to check/create chat_logs table:', e);
      }
    }
    console.log(`📡 ML Service URL: ${ML_SERVICE_URL}`);
    app.listen(PORT, () => {
      console.log(`🚀 HealthSphere Backend Server running on port ${PORT}`);
      console.log(`📡 API available at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

