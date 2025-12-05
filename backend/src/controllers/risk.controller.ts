import { Request, Response } from 'express';
import pool from '../config/db';
import { authMiddleware } from '../middleware/authMiddleware';

/**
 * GET /risk/forecast
 * Get health risk forecast for next 30 days
 */
function computeRiskScore(age: number, bmi: number, chronic?: string) {
  let score = 0;
  score += (age - 30) * 0.3;
  score += Math.max(0, (bmi - 22)) * 3;
  if (chronic && chronic !== 'none') score += 15;
  score = Math.max(0, Math.min(100, Math.round(score)));
  return score;
}

export const getForecast = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!userId || typeof userId !== 'string' || !uuidRegex.test(userId)) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } });
      return;
    }

    // check last forecast
    const last = await pool.query('SELECT id, risk_value, next_30_days_prediction, risk_trend, generated_at FROM risk_scores WHERE user_id = $1 ORDER BY generated_at DESC LIMIT 1', [userId]);
    if (last.rows.length > 0) {
      const row = last.rows[0];
      res.status(200).json({ success: true, data: { id: row.id, risk: row.risk_value, prediction: row.next_30_days_prediction, risk_trend: row.risk_trend, generated_at: row.generated_at } });
      return;
    }

    // else compute using user profile
    const userRes = await pool.query('SELECT age, height, weight, chronic_condition FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
      return;
    }
    const user = userRes.rows[0];
    const age = Number(user.age || 30);
    const height = Number(user.height || 170);
    const weight = Number(user.weight || 70);
    const chronic = user.chronic_condition || 'none';
    const bmi = Number((weight / ((height / 100) ** 2)).toFixed(1));
    const score = computeRiskScore(age, bmi, chronic);

    // Generate a simple next-12-months forecast
    const prediction = Array.from({ length: 12 }).map((_, i) => Math.max(0, Math.min(100, score + (i-6) * (chronic !== 'none' ? 1 : -0.3))));
    const trend = (prediction[prediction.length-1] - prediction[0]) > 0 ? 'increasing' : 'decreasing';

    const insert = await pool.query('INSERT INTO risk_scores (user_id, risk_value, next_30_days_prediction, risk_trend) VALUES ($1, $2, $3, $4) RETURNING id, risk_value, next_30_days_prediction, risk_trend, generated_at', [userId, score, JSON.stringify(prediction), trend]);
    const saved = insert.rows[0];
    res.status(201).json({ success: true, data: { id: saved.id, risk: saved.risk_value, prediction: saved.next_30_days_prediction, risk_trend: saved.risk_trend, generated_at: saved.generated_at } });
  } catch (error) {
    console.error('Get forecast error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Unable to compute forecast' } });
  }
};

/**
 * POST /risk/recalculate
 * Force recalculation of health risk forecast
 */
export const recalculateRisk = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    console.log('Recalculate requested, userId=', userId, 'body=', req.body);
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!userId || typeof userId !== 'string' || !uuidRegex.test(userId)) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } });
      return;
    }

    // override with request body values
    const { age, height, weight, chronic_condition } = req.body as any;
    let profile = { age: age ? Number(age) : undefined, height: height ? Number(height) : undefined, weight: weight ? Number(weight) : undefined, chronic_condition } as any;

    // fetch user if any missing
    const userRes = await pool.query('SELECT age, height, weight, chronic_condition FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
      return;
    }
    const user = userRes.rows[0];
    const finalAge = profile.age || Number(user.age || 30);
    const finalHeight = profile.height || Number(user.height || 170);
    const finalWeight = profile.weight || Number(user.weight || 70);
    const finalChronic = profile.chronic_condition || user.chronic_condition || 'none';
    console.log('Computed final profile:', { finalAge, finalHeight, finalWeight, finalChronic });
    if (!finalWeight || !finalHeight) {
      res.status(400).json({ success: false, error: { code: 'INVALID_PROFILE', message: 'Invalid height or weight provided' } });
      return;
    }
    const bmi = Number((finalWeight / ((finalHeight / 100) ** 2)).toFixed(1));
    const score = computeRiskScore(finalAge, bmi, finalChronic);
    const prediction = Array.from({ length: 12 }).map((_, i) => Math.max(0, Math.min(100, score + (i-6) * (finalChronic !== 'none' ? 1 : -0.3))));
    const trend = (prediction[prediction.length-1] - prediction[0]) > 0 ? 'increasing' : 'decreasing';

    let insert;
    try {
      insert = await pool.query('INSERT INTO risk_scores (user_id, risk_value, next_30_days_prediction, risk_trend) VALUES ($1,$2,$3,$4) RETURNING id, risk_value, next_30_days_prediction, risk_trend, generated_at', [userId, score, JSON.stringify(prediction), trend]);
    } catch (dbErr) {
      console.error('DB insert failed for risk_scores:', dbErr);
      throw dbErr; // let outer catch handle returning 500
    }
    const saved = insert.rows[0];
    res.status(201).json({ success: true, data: { id: saved.id, risk: saved.risk_value, prediction: saved.next_30_days_prediction, risk_trend: saved.risk_trend, generated_at: saved.generated_at } });
  } catch (error: any) {
    console.error('Recalculate risk error:', error);
    // If Postgres returned a useful detail, forward a subset for debugging in dev
    if (error?.code || error?.detail) {
      res.status(500).json({ success: false, error: { code: error?.code ?? 'PG_ERROR', message: error?.message ?? 'Database error', detail: error?.detail } });
    } else {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Unable to recalculate risk' } });
    }
  }
};

