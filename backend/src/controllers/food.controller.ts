import { Request, Response } from 'express';
import axios from 'axios';
import fs from 'fs';
import crypto from 'crypto';
import FormData from 'form-data';
import pool from '../config/db';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

/**
 * POST /food/scan
 * Upload food image for recognition
 */
export const scanFood = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('scanFood received request from', req.ip);
    const file = (req as any).file;
    const userId = (req as any).user?.userId || null;
    if (!file) { res.status(400).json({ error: 'No file uploaded' }); return; }

    // Build form-data to proxy to ML service
    const form = new FormData();
    form.append('image', fs.createReadStream(file.path), file.originalname || file.filename);

    try {
      const response = await axios.post(`${ML_SERVICE_URL}/food/recognize`, form, {
        headers: { ...form.getHeaders() },
        timeout: 120000
      });

      // Optionally persist to DB if authenticated
      try {
        if (userId && response && response.data) {
          const d = response.data as any;
          await pool.query(`INSERT INTO meals (user_id, meal_label, calories, sodium, sugar, unhealthy_score, confidence, image_url) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [userId, d.meal_label, Number(d.calories || 0), Number(d.sodium || 0), Number(d.sugar || 0), Number(d.unhealthy_score || 0), Number(d.confidence || 0), file.path]);
        }
      } catch (persistErr) {
        console.warn('Failed to persist meal', persistErr);
      }

      res.status(200).json(response.data);
      return;
    } catch (apiErr: any) {
      // Distinguish connectivity errors vs. ML service response errors
      console.error('ML service error (scanFood):', apiErr?.code || apiErr?.response?.status, apiErr?.response?.data || apiErr?.message || apiErr);
      const isConnError = !!apiErr?.code && !apiErr?.response;
      const fallbackEnabled = String(process.env.ML_FALLBACK || '').toLowerCase() === 'true';
      if (isConnError && fallbackEnabled) {
        console.warn('ML service unreachable; returning fallback mock result');
        // Build deterministic fallback using file path hash
        const hash = crypto.createHash('md5').update(file.path).digest('hex');
        const idx = parseInt(hash.slice(0, 8), 16) % 6;
        const mockFoods = [
          { meal_label: 'Grilled Chicken Salad', calories: 320, sodium: 450, sugar: 3.5, unhealthy_score: 15, confidence: 0.86 },
          { meal_label: 'Burger with Fries', calories: 850, sodium: 1200, sugar: 8, unhealthy_score: 78, confidence: 0.78 },
          { meal_label: 'Pizza', calories: 280, sodium: 650, sugar: 2, unhealthy_score: 55, confidence: 0.71 },
          { meal_label: 'Sushi Platter', calories: 380, sodium: 800, sugar: 5, unhealthy_score: 28, confidence: 0.81 },
          { meal_label: 'Caesar Wrap', calories: 420, sodium: 720, sugar: 4, unhealthy_score: 42, confidence: 0.75 },
          { meal_label: 'Pad Thai', calories: 520, sodium: 980, sugar: 12, unhealthy_score: 52, confidence: 0.7 },
        ];
        const selected = mockFoods[idx];
        const fallback = {
          meal_label: selected.meal_label,
          calories: selected.calories,
          sodium: selected.sodium,
          sugar: selected.sugar,
          unhealthy_score: selected.unhealthy_score,
          confidence: selected.confidence,
          candidates: mockFoods.slice(0, 3),
        } as any;
        // Optionally persist
        try { if (userId) await pool.query(`INSERT INTO meals (user_id, meal_label, calories, sodium, sugar, unhealthy_score, confidence, image_url) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [userId, fallback.meal_label, fallback.calories, fallback.sodium, fallback.sugar, fallback.unhealthy_score, fallback.confidence, file.path]); } catch (e) { console.warn('Failed to persist fallback meal', e); }
        res.status(200).json(fallback);
        return;
      }
      if (isConnError) {
        const fallbackEnabled = String(process.env.ML_FALLBACK || '').toLowerCase() === 'true';
        if (fallbackEnabled) {
          console.warn('ML service unreachable; returning fallback mock result (scanFood)');
          const hash = crypto.createHash('md5').update(file.path).digest('hex');
          const idx = parseInt(hash.slice(0, 8), 16) % 6;
          const mockFoods = [
            { meal_label: 'Grilled Chicken Salad', calories: 320, sodium: 450, sugar: 3.5, unhealthy_score: 15, confidence: 0.86 },
            { meal_label: 'Burger with Fries', calories: 850, sodium: 1200, sugar: 8, unhealthy_score: 78, confidence: 0.78 },
            { meal_label: 'Pizza', calories: 280, sodium: 650, sugar: 2, unhealthy_score: 55, confidence: 0.71 },
            { meal_label: 'Sushi Platter', calories: 380, sodium: 800, sugar: 5, unhealthy_score: 28, confidence: 0.81 },
            { meal_label: 'Caesar Wrap', calories: 420, sodium: 720, sugar: 4, unhealthy_score: 42, confidence: 0.75 },
            { meal_label: 'Pad Thai', calories: 520, sodium: 980, sugar: 12, unhealthy_score: 52, confidence: 0.7 },
          ];
          const selected = mockFoods[idx];
          const fallback = {
            meal_label: selected.meal_label,
            calories: selected.calories,
            sodium: selected.sodium,
            sugar: selected.sugar,
            unhealthy_score: selected.unhealthy_score,
            confidence: selected.confidence,
            candidates: mockFoods.slice(0, 3),
          } as any;
          try { if (userId) await pool.query(`INSERT INTO meals (user_id, meal_label, calories, sodium, sugar, unhealthy_score, confidence, image_url) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [userId, fallback.meal_label, fallback.calories, fallback.sodium, fallback.sugar, fallback.unhealthy_score, fallback.confidence, file.path]); } catch (e) { console.warn('Failed to persist fallback meal', e); }
          res.status(200).json(fallback);
          return;
        }
        res.status(503).json({ error: `ML service unreachable: ${apiErr.code || apiErr.message}` });
        return;
      }
      const statusCode = apiErr?.response?.status || 502;
      const data = apiErr?.response?.data || { error: `ML service error: ${apiErr?.message || 'unknown'}` };
      res.status(statusCode).json(data);
      return;
    }
  } catch (err: any) {
    console.error('Error in scanFood:', err);
    res.status(500).json({ error: 'Failed to scan food' });
    return;
  }
};

/**
 * POST /food/feedback
 * Accept user feedback about an incorrectly recognized meal.
 */
export const feedbackFood = async (req: Request, res: Response): Promise<void> => {
  try {
    const { original_label, corrected_label, confidence, image_path } = req.body as { original_label?: string; corrected_label?: string; confidence?: number; image_path?: string };
    const userId = (req as any).user?.userId || null;
    if (!corrected_label) { res.status(400).json({ error: 'corrected_label is required' }); return; }

    // Log or persist into a corrections table if available
    try {
      await pool.query(`INSERT INTO meal_corrections (user_id, image_path, original_label, corrected_label, confidence) VALUES ($1,$2,$3,$4,$5)`, [userId, image_path || null, original_label || null, corrected_label, confidence || null]);
    } catch (persistErr) {
      console.warn('Failed to persist meal correction', persistErr);
    }

    res.status(200).json({ success: true, message: 'Feedback recorded' });
    return;
  } catch (err: any) {
    console.error('Error in feedbackFood:', err);
    res.status(500).json({ error: 'Failed to record feedback' });
    return;
  }
};

/**
 * GET /food/history
 * Get user's meal history
 */
export const getFoodHistory = async (req: Request, res: Response): Promise<void> => {
  // TODO: Implement meal history retrieval
  res.status(501).json({
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Food history not implemented yet',
    },
  });
};

/**
 * GET /food/test
 * Test endpoint that sends a small embedded sample image to the ML service
 * This endpoint is useful to validate end-to-end flow without manual upload.
 */
export const testScanFood = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('testScanFood: called');
    // Small 1x1 PNG base64 (transparent) - valid minimal image
    const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAgAB/ky3YQAAAABJRU5ErkJggg==';
    const buffer = Buffer.from(base64Png, 'base64');
    const tmpFilePath = `uploads/sample-test-${Date.now()}.png`;
    // Ensure uploads directory exists
    try {
      fs.mkdirSync('uploads', { recursive: true });
    } catch (mkdirErr) {}
    fs.writeFileSync(tmpFilePath, buffer);

    const form = new FormData();
    form.append('image', fs.createReadStream(tmpFilePath), 'sample-test.png');

    try {
      // Check ML health first if not in fallback mode
      const fallbackEnabled = String(process.env.ML_FALLBACK || '').toLowerCase() === 'true';
      if (fallbackEnabled) {
        // Return deterministic fallback instead of calling ML service
        const idx = parseInt(crypto.createHash('md5').update(tmpFilePath).digest('hex').slice(0, 8), 16) % 6;
        const mockFoods = [
          { meal_label: 'Grilled Chicken Salad', calories: 320, sodium: 450, sugar: 3.5, unhealthy_score: 15, confidence: 0.86 },
          { meal_label: 'Burger with Fries', calories: 850, sodium: 1200, sugar: 8, unhealthy_score: 78, confidence: 0.78 },
          { meal_label: 'Pizza', calories: 280, sodium: 650, sugar: 2, unhealthy_score: 55, confidence: 0.71 },
          { meal_label: 'Sushi Platter', calories: 380, sodium: 800, sugar: 5, unhealthy_score: 28, confidence: 0.81 },
          { meal_label: 'Caesar Wrap', calories: 420, sodium: 720, sugar: 4, unhealthy_score: 42, confidence: 0.75 },
          { meal_label: 'Pad Thai', calories: 520, sodium: 980, sugar: 12, unhealthy_score: 52, confidence: 0.7 },
        ];
        const selected = mockFoods[idx];
        const fallback = {
          meal_label: selected.meal_label,
          calories: selected.calories,
          sodium: selected.sodium,
          sugar: selected.sugar,
          unhealthy_score: selected.unhealthy_score,
          confidence: selected.confidence,
          candidates: mockFoods.slice(0, 3),
        } as any;
        res.status(200).json(fallback);
        try { fs.unlinkSync(tmpFilePath); } catch (e) { /* ignore */ }
        return;
      }
      if (!fallbackEnabled) {
        try {
          await axios.get(`${ML_SERVICE_URL}/food/health`, { timeout: 2000 });
        } catch (hErr: any) {
          console.error('ML health check failed before test scan:', hErr?.code || hErr?.message || hErr);
          res.status(503).json({ error: 'ML service health check failed', detail: hErr?.message || hErr?.code || 'unknown' });
          try { fs.unlinkSync(tmpFilePath); } catch (e) { /* ignore */ }
          return;
        }
      }

      const response = await axios.post(`${ML_SERVICE_URL}/food/recognize`, form, { headers: { ...form.getHeaders() }, timeout: 120000 });
      console.log('testScanFood got response:', response?.status);
      res.status(200).json(response.data);
      try { fs.unlinkSync(tmpFilePath); } catch (e) { /* ignore */ }
      return;
    } catch (apiErr: any) {
      console.error('ML service error (testScanFood):', apiErr?.code || apiErr?.response?.status, apiErr?.message || apiErr);
      if (!!apiErr?.code && !apiErr?.response) {
        res.status(503).json({ error: `ML service unreachable: ${apiErr.code || apiErr.message}` });
        return;
      }
      const statusCode = apiErr?.response?.status || 502;
      const data = apiErr?.response?.data || { error: `ML service error: ${apiErr?.message || 'unknown'}` };
      res.status(statusCode).json(data);
      return;
    }
  } catch (err: any) {
    console.error('Error in testScanFood:', err);
    res.status(500).json({ error: 'Failed to run test scan' });
    return;
  }
};

