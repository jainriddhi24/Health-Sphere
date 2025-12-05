import { Request, Response } from 'express';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import pool from '../config/db';
import { hashPassword, comparePassword } from '../utils/hashPassword';
import { generateToken } from '../utils/generateToken';

/**
 * POST /auth/register
 * Register a new user account
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, age, gender, height, weight, chronic_condition } = req.body;

    // Validate required fields
    if (!name || !email || !password || !age || !gender || !height || !weight) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields',
          details: {
            required: ['name', 'email', 'password', 'age', 'gender', 'height', 'weight'],
          },
        },
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid email format',
        },
      });
      return;
    }

    // Validate password length
    if (password.length < 8) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Password must be at least 8 characters long',
        },
      });
      return;
    }

    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      res.status(409).json({
        success: false,
        error: {
          code: 'USER_EXISTS',
          message: 'User with this email already exists',
        },
      });
      return;
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Insert user into database
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, age, gender, height, weight, chronic_condition)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, name, email, age, gender, height, weight, chronic_condition, premium_unlocked, created_at`,
      [name, email, passwordHash, age, gender, height, weight, chronic_condition || 'none']
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          age: user.age,
          gender: user.gender,
          height: user.height,
          weight: user.weight,
          chronic_condition: user.chronic_condition,
          premium_unlocked: user.premium_unlocked,
          created_at: user.created_at,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred during registration',
      },
    });
  }
};

/**
 * POST /auth/login
 * Authenticate user and return JWT tokens
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required',
        },
      });
      return;
    }

    // Find user by email
    const result = await pool.query(
      'SELECT id, name, email, password_hash, premium_unlocked FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      });
      return;
    }

    const user = result.rows[0];

    // Compare password
    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      });
      return;
    }

    // Generate JWT token
    const token = generateToken(user.id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          premium_unlocked: user.premium_unlocked,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred during login',
      },
    });
  }
};

/**
 * GET /auth/profile
 * Get authenticated user's profile
 */
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      });
      return;
    }

    // To avoid SQL errors on deployments where optional columns may not yet be present,
    // dynamically build the SELECT list after checking information_schema
    const colsRes = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'users'`);
    const availableCols = new Set(colsRes.rows.map((r: any) => r.column_name));
    const baseFields = ['id', 'name', 'email', 'age', 'gender', 'height', 'weight', 'chronic_condition', 'premium_unlocked', 'created_at'];
    if (availableCols.has('lifestyle')) baseFields.push('lifestyle');
    if (availableCols.has('personal_goals')) baseFields.push('personal_goals');
    if (availableCols.has('medical_report_url')) baseFields.push('medical_report_url');
    if (availableCols.has('medical_report_uploaded_at')) baseFields.push('medical_report_uploaded_at');
    if (availableCols.has('processing_result')) baseFields.push('processing_result');
    const fieldList = baseFields.join(', ');
    let result;
    try {
      result = await pool.query(`SELECT ${fieldList} FROM users WHERE id = $1`, [userId]);
    } catch (e: any) {
      // If the database throws a missing-column error (42703), gracefully fall back
      if (e && e.code === '42703') {
        console.warn('Optional user columns missing, falling back to base fields for SELECT');
        result = await pool.query(`SELECT id, name, email, age, gender, height, weight, chronic_condition, premium_unlocked, created_at FROM users WHERE id = $1`, [userId]);
      } else {
        throw e;
      }
    }

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
      return;
    }

    const user = result.rows[0];

    // Build response data including optional columns if they were selected
    const respData: any = {
      id: user.id,
      name: user.name,
      email: user.email,
      age: user.age,
      gender: user.gender,
      height: user.height,
      weight: user.weight,
      chronic_condition: user.chronic_condition,
      premium_unlocked: user.premium_unlocked,
      created_at: user.created_at,
    };
    if ('lifestyle' in user) respData.lifestyle = user.lifestyle;
    if ('personal_goals' in user) respData.personal_goals = user.personal_goals;
    if ('medical_report_url' in user && user.medical_report_url) {
      const base = `${req.protocol}://${req.get('host')}`;
      // If DB already contains a full URL or path, trust it; otherwise build one
      if (user.medical_report_url.startsWith('http') || user.medical_report_url.startsWith('/uploads/')) {
        respData.medical_report_url = user.medical_report_url;
      } else {
        respData.medical_report_url = `${base}/uploads/${userId}/${user.medical_report_url}`;
      }
    }
    if ('medical_report_uploaded_at' in user) respData.medical_report_uploaded_at = user.medical_report_uploaded_at;
    if ('processing_result' in user) respData.processing_result = user.processing_result;

    res.status(200).json({ success: true, data: respData });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching profile',
      },
    });
  }
};

/**
 * PUT /auth/profile
 * Update authenticated user's profile including file upload (medical report)
 */
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } });
      return;
    }

    // Note: multer will attach file to req.file if uploaded
    const { name, age, gender, height, weight, chronic_condition, lifestyle, personal_goals } = req.body as any;
    // Query which columns exist to avoid updating non-existent columns
    const colsRes = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'users'`);
    const availableCols = new Set(colsRes.rows.map((r: any) => r.column_name));
    const file = (req as any).file;

    // Build update dynamic setter list
    const updates: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (name) { updates.push(`name = $${idx++}`); params.push(name); }
    if (age) { updates.push(`age = $${idx++}`); params.push(Number(age)); }
    if (gender) { updates.push(`gender = $${idx++}`); params.push(gender); }
    if (height) { updates.push(`height = $${idx++}`); params.push(Number(height)); }
    if (weight) { updates.push(`weight = $${idx++}`); params.push(Number(weight)); }
    if (chronic_condition) { updates.push(`chronic_condition = $${idx++}`); params.push(chronic_condition); }
    if (lifestyle && availableCols.has('lifestyle')) {
      // Accept JSON string or object
      const parsed = typeof lifestyle === 'string' ? JSON.parse(lifestyle) : lifestyle;
      updates.push(`lifestyle = $${idx++}`); params.push(parsed);
    }
    if (personal_goals && availableCols.has('personal_goals')) {
      const arr = typeof personal_goals === 'string' ? personal_goals.split(',').map((s: string) => s.trim()).filter(Boolean) : personal_goals;
      updates.push(`personal_goals = $${idx++}`); params.push(arr);
    }
    let fileNotPersisted = false;
    let fileSaved = false;
    if (file && availableCols.has('medical_report_url')) {
      // Save only the filename for portability; we'll serve it from /uploads
      updates.push(`medical_report_url = $${idx++}`);
      params.push(file.filename || '');
      if (availableCols.has('medical_report_uploaded_at')) {
        updates.push(`medical_report_uploaded_at = $${idx++}`);
        params.push(new Date());
      }
      fileSaved = true;
    } else if (file) {
      // multer still saved the file to disk, but we do not have a DB column to persist the filename
      fileNotPersisted = true;
      console.warn('medical_report_url column not found; uploaded file saved on disk but not persisted to DB');
    }

    if (updates.length === 0) {
      // If the client uploaded a file but the DB doesn't have a column to persist the filename,
      // consider this a successful upload (file saved on disk) rather than a validation error.
      if (fileNotPersisted) {
        const sel = await pool.query(`SELECT id, email, name ${availableCols.has('medical_report_url') ? ', medical_report_url' : ''}${availableCols.has('medical_report_uploaded_at') ? ', medical_report_uploaded_at' : ''} FROM users WHERE id = $1`, [userId]);
        const dbUser = sel.rows[0] || null;
        const respUser: any = dbUser ? { id: dbUser.id, email: dbUser.email, name: dbUser.name } : null;
        if (dbUser && 'medical_report_url' in dbUser) respUser.medical_report_url = dbUser.medical_report_url;
        if (dbUser && 'medical_report_uploaded_at' in dbUser) respUser.medical_report_uploaded_at = dbUser.medical_report_uploaded_at;
        res.status(200).json({ success: true, message: 'File uploaded but not saved to DB; missing column medical_report_url', data: { user: respUser } });
        return;
      }
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'No valid fields provided to update' } });
      return;
    }

    params.push(userId);
    // Build RETURNING list to avoid referencing missing columns
    const returningFields = ['id', 'name', 'email', 'age', 'gender', 'height', 'weight', 'chronic_condition', 'premium_unlocked', 'created_at', 'updated_at'];
    if (availableCols.has('lifestyle')) returningFields.push('lifestyle');
    if (availableCols.has('personal_goals')) returningFields.push('personal_goals');
    if (availableCols.has('medical_report_uploaded_at')) returningFields.push('medical_report_uploaded_at');
    if (availableCols.has('medical_report_url')) returningFields.push('medical_report_url');
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING ${returningFields.join(', ')}`;
    const result = await pool.query(query, params);
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
      return;
    }

    const dbUser = result.rows[0];
    let responseMessage = 'Profile updated';
    if (fileSaved) responseMessage += ' (file saved)';
    if (fileNotPersisted) responseMessage += ' (file not saved in DB; column missing)';

    // Transform dbUser into API-safe response with full URL (if present)
    const respUser: any = {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      age: dbUser.age,
      gender: dbUser.gender,
      height: dbUser.height,
      weight: dbUser.weight,
      chronic_condition: dbUser.chronic_condition,
      premium_unlocked: dbUser.premium_unlocked,
      created_at: dbUser.created_at,
      updated_at: dbUser.updated_at,
    };
    if ('lifestyle' in dbUser) respUser.lifestyle = dbUser.lifestyle;
    if ('personal_goals' in dbUser) respUser.personal_goals = dbUser.personal_goals;
    if ('medical_report_url' in dbUser && dbUser.medical_report_url) {
      const base = `${req.protocol}://${req.get('host')}`;
      if (dbUser.medical_report_url.startsWith('http') || dbUser.medical_report_url.startsWith('/uploads/')) {
        respUser.medical_report_url = dbUser.medical_report_url;
      } else {
        respUser.medical_report_url = `${base}/uploads/${userId}/${dbUser.medical_report_url}`;
      }
    }
    if ('medical_report_uploaded_at' in dbUser) respUser.medical_report_uploaded_at = dbUser.medical_report_uploaded_at;

    // If we've saved a file, try to call the ML service automatically to process
    // the uploaded medical report and include its results in the response.
    if (fileSaved) {
      try {
        const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
        const fullPath = (file as any).path; // multer attaches the full disk path
        const payload = {
          userId: userId || null,
          filePath: fullPath,
          originalName: file.originalname,
        };
        const mlres = await axios.post(`${ML_SERVICE_URL}/process-report`, payload, { timeout: 120000 });
        // Attach processing result alongside the returned user data
        if (mlres && mlres.data) {
          // Persist the processing result in DB if column exists
          try {
            const colsRes2 = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'users'`);
            const availableCols2 = new Set(colsRes2.rows.map((r: any) => r.column_name));
            if (availableCols2.has('processing_result')) {
              await pool.query(`UPDATE users SET processing_result = $1 WHERE id = $2`, [mlres.data, userId]);
              // update respUser to include the new processing field
              if (respUser) respUser.processing_result = mlres.data;
            }
          } catch (persistErr) {
            console.warn('Failed to persist processing_result', persistErr);
          }
          res.status(200).json({ success: true, message: responseMessage, data: { user: respUser, processing: mlres.data } });
          return;
        }
      } catch (err) {
        const msg = (err as any)?.response?.data || (err as any)?.message || String(err);
        console.warn('Failed to call ML service', msg);
        // continue and return user info despite processing failure
      }
    }

    res.status(200).json({ success: true, message: responseMessage, data: { user: respUser } });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An error occurred while updating profile' } });
  }
};

/**
 * DELETE /auth/profile/report
 * Removes the user's uploaded medical report file and clears DB fields
 */
export const deleteMedicalReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } }); return; }

    const colsRes = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'users'`);
    const availableCols = new Set(colsRes.rows.map((r: any) => r.column_name));
    if (!availableCols.has('medical_report_url')) {
      res.status(400).json({ success: false, error: { code: 'UNSUPPORTED', message: 'Medical file column not available in database' } });
      return;
    }

    const sel = await pool.query(`SELECT medical_report_url FROM users WHERE id = $1`, [userId]);
    if (sel.rows.length === 0) { res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } }); return; }
    const filename = sel.rows[0].medical_report_url;
    if (!filename) { res.status(404).json({ success: false, error: { code: 'FILE_NOT_FOUND', message: 'No medical report found' } }); return; }

    // Attempt to delete file from uploads directory
    const uploadsDir = path.resolve('uploads');
    const filePath = path.join(uploadsDir, userId, filename);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.warn('Failed to delete file from disk:', err);
      // proceed to clear DB even if file removal fails
    }

    // After deleting file, remove folder if empty
    try {
      const userDir = path.join(uploadsDir, userId);
      if (fs.existsSync(userDir)) {
        const files = fs.readdirSync(userDir);
        if (files.length === 0) fs.rmdirSync(userDir);
      }
    } catch (err) {
      console.warn('unable to cleanup user upload directory', err);
    }

    // Build update statement to clear DB fields
    const updates: string[] = [];
    const params: any[] = [];
    let idx = 1;
    updates.push(`medical_report_url = $${idx++}`);
    params.push(null);
    if (availableCols.has('medical_report_uploaded_at')) {
      updates.push(`medical_report_uploaded_at = $${idx++}`);
      params.push(null);
    }
    if (availableCols.has('processing_result')) {
      updates.push(`processing_result = $${idx++}`);
      params.push(null);
    }
    params.push(userId);
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, email, name, medical_report_url` + (availableCols.has('medical_report_uploaded_at') ? ', medical_report_uploaded_at' : '') + (availableCols.has('processing_result') ? ', processing_result' : '');
    const result = await pool.query(query, params);
    if (result.rows.length === 0) { res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } }); return; }
    res.status(200).json({ success: true, message: 'Report deleted', data: { user: result.rows[0] } });
    return;
  } catch (error) {
    console.error('Delete medical report error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An error occurred while deleting medical report' } });
  }
};

