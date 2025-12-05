import { Request, Response } from 'express';
import axios from 'axios';
import pool from '../config/db';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

/**
 * POST /chatbot/query
 * Submit query to premium AI health assistant
 */
export const queryChatbot = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId || null;
    const { query, context, allow_processing_result } = req.body as { query?: string; context?: any; allow_processing_result?: boolean };
    if (!query) { res.status(400).json({ success: false, error: { code: 'MISSING_QUERY', message: 'query field is required' } }); return; }

    // Build payload to ML service
    // If the user has an uploaded/processed report, include that into user_profile
    let userProfile: any = req.body.user_profile || {};
    if (userId) {
      // Honor allow_processing_result flag from the client. Default is true (include processing_result)
      const includeProcessingResult = allow_processing_result !== false;
      try {
        const r = await pool.query('SELECT processing_result FROM users WHERE id = $1', [userId]);
        if (includeProcessingResult && r.rows.length > 0 && r.rows[0].processing_result) {
          try {
            const proc = r.rows[0].processing_result;
            // If processing_result is stored as JSON string ensure object
            userProfile.processing_result = typeof proc === 'string' ? JSON.parse(proc) : proc;
          } catch (e) {
            userProfile.processing_result = r.rows[0].processing_result;
          }
        }
      } catch (dbErr) {
        console.warn('Failed to fetch processing_result for user', userId, dbErr);
      }
    }
    const payload = {
      query,
      user_id: userId || 'guest',
      user_profile: userProfile,
      context: context || null,
    };
    try {
      const mlRes = await axios.post(`${ML_SERVICE_URL}/chatbot/query`, payload, { timeout: 120000 });
      const d = mlRes.data as any;
      // Extra debug logs about model usage
      console.log('ML Response used_api:', d?.used_api, 'model:', d?.model, 'confidence:', d?.confidence);
      // Normalize diet_plan field
      const dietPlan = d?.diet_plan || d?.dietPlan || d?.data?.diet_plan || [];
      const responseText = d?.response || d?.text || d?.summary || '';
      // Persist chat log if user logged in
      if (userId) {
        try {
          // Ensure the chat_logs table exists before attempting an INSERT
          const existsRes = await pool.query(`SELECT EXISTS (SELECT FROM pg_tables WHERE tablename = 'chat_logs');`);
          const chatLogsExists = existsRes.rows?.[0]?.exists || false;
          if (!chatLogsExists) {
            console.warn('Chat logs table does not exist; skipping persistence of chat log');
          } else {
            // Try to include structured JSON in generated_json if the column exists
            const colsRes = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'chat_logs'`);
            const availableCols = new Set(colsRes.rows.map((r: any) => r.column_name));
            if (availableCols.has('generated_json')) {
              await pool.query(`INSERT INTO chat_logs (user_id, query, response, generated_json, model, confidence) VALUES ($1,$2,$3,$4,$5,$6)`, [userId, query, responseText || "", JSON.stringify(d) || null, (d.model || 'remote'), Number(d.confidence || 0)]);
            } else {
              await pool.query(`INSERT INTO chat_logs (user_id, query, response, model, confidence) VALUES ($1,$2,$3,$4,$5)`, [userId, query, responseText || "", (d.model || 'remote'), Number(d.confidence || 0)]);
            }
          }
        } catch (e) { console.warn('Failed to persist chat log', e); }
      }
      // Return enriched data (response text + diet_plan + sources + metadata)
      res.json({ success: true, data: { response: responseText, sources: d?.sources || [], diet_plan: dietPlan, confidence: d?.confidence || 0, model: d?.model || 'remote', metadata: d?.metadata || null } });
      return;
    } catch (apiErr: any) {
      // Detect connection/refused errors and log more actionable message
      if (apiErr?.code === 'ECONNREFUSED' || apiErr?.errno === 'ECONNREFUSED') {
        console.error('Chatbot ML error: ML service is unreachable (ECONNREFUSED). Falling back to local suggestions.');
      } else {
        console.error('Chatbot ML error (queryChatbot):', apiErr?.code || apiErr?.response?.status, apiErr?.message || apiErr);
      }
      const fallbackEnabled = String(process.env.ML_FALLBACK || 'true').toLowerCase() === 'true'; // Enable fallback by default
      if (fallbackEnabled) {
        // Intelligent fallback based on query content
        let response = 'Hi there! I am your HealthSphere assistant. ';
        let dietPlan: string[] = [];

        const lowerQuery = query.toLowerCase();
        if (lowerQuery.includes('diet') || lowerQuery.includes('food') || lowerQuery.includes('nutrition') || lowerQuery.includes('eat')) {
          response += 'For a healthy diet, focus on whole foods, plenty of vegetables, lean proteins, and whole grains. Stay hydrated and limit processed foods.';
          dietPlan = [
            'Include at least 5 servings of fruits and vegetables daily',
            'Choose lean proteins like chicken, fish, beans, and nuts',
            'Limit added sugars and processed foods',
            'Stay hydrated with at least 8 glasses of water per day'
          ];
        } else if (lowerQuery.includes('exercise') || lowerQuery.includes('workout') || lowerQuery.includes('fitness') || lowerQuery.includes('activity')) {
          response += 'Regular physical activity is crucial for health. Aim for 150 minutes of moderate aerobic activity or 75 minutes of vigorous activity per week, plus strength training twice a week.';
          dietPlan = [
            'Combine exercise with a balanced diet for best results',
            'Include protein-rich foods to support muscle recovery',
            'Stay hydrated before, during, and after workouts',
            'Consider post-workout snacks with carbs and protein'
          ];
        } else if (lowerQuery.includes('weight') || lowerQuery.includes('lose') || lowerQuery.includes('gain')) {
          response += 'Weight management involves both diet and exercise. Focus on sustainable changes rather than quick fixes. Consult a healthcare professional for personalized advice.';
          dietPlan = [
            'Create a moderate calorie deficit for weight loss (500 calories/day)',
            'Focus on nutrient-dense foods that keep you full',
            'Track your food intake and portion sizes',
            'Include regular physical activity in your routine'
          ];
        } else if (lowerQuery.includes('sleep') || lowerQuery.includes('rest')) {
          response += 'Good sleep is essential for health. Aim for 7-9 hours per night. Maintain a consistent sleep schedule and create a relaxing bedtime routine.';
          dietPlan = [
            'Avoid caffeine and heavy meals close to bedtime',
            'Include foods rich in tryptophan like turkey, bananas, and nuts',
            'Stay hydrated but reduce fluid intake before bed',
            'Consider a light snack if hungry before sleep'
          ];
        } else if (lowerQuery.includes('stress') || lowerQuery.includes('anxiety') || lowerQuery.includes('mental')) {
          response += 'Managing stress is important for overall health. Practice mindfulness, regular exercise, and maintain social connections. Consider speaking with a mental health professional if needed.';
          dietPlan = [
            'Include omega-3 rich foods like fatty fish, walnuts, and flaxseeds',
            'Limit caffeine and alcohol which can increase anxiety',
            'Eat regular, balanced meals to stabilize blood sugar',
            'Consider foods rich in magnesium like leafy greens and nuts'
          ];
        } else {
          response += 'While the AI service is temporarily unavailable, I can help with general health advice. What specific health topic are you interested in?';
          dietPlan = [
            'Focus on a balanced plate: half vegetables/fruits, quarter protein, quarter whole grains',
            'Include healthy fats from avocados, nuts, and olive oil',
            'Limit sodium, added sugars, and saturated fats',
            'Stay active with at least 30 minutes of movement daily'
          ];
        }

        const fallback = {
          response,
          sources: [],
          query_id: 'fallback',
          confidence: 0.6,
          diet_plan: dietPlan
        };
        if (userId) {
          try {
            const existsRes = await pool.query(`SELECT EXISTS (SELECT FROM pg_tables WHERE tablename = 'chat_logs');`);
            const chatLogsExists = existsRes.rows?.[0]?.exists || false;
            if (!chatLogsExists) {
              console.warn('Chat logs table does not exist; skipping persistence of fallback chat log');
            } else {
              await pool.query(`INSERT INTO chat_logs (user_id, query, response, model, confidence) VALUES ($1,$2,$3,$4,$5)`, [userId, query, fallback.response, 'fallback', fallback.confidence]);
            }
          } catch (e) { console.warn('Failed to persist fallback chat log', e); }
        }
        res.json({ success: true, data: fallback });
        return;
      }
      const statusCode = apiErr?.response?.status || 502;
      const data = apiErr?.response?.data || { error: `ML service error: ${apiErr?.message || 'unknown'}` };
      res.status(statusCode).json(data);
      return;
    }
  } catch (err: any) {
    console.error('Error in queryChatbot:', err);
    res.status(500).json({ success: false, error: { code: 'ERROR', message: 'Failed to query chatbot' } });
    return;
  }
};

/**
 * GET /chatbot/status
 * Get chatbot usage status and limits
 */
export const getChatbotStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    try {
      const mlRes = await axios.get(`${ML_SERVICE_URL}/chatbot/status`, { timeout: 3000 });
      res.json({ success: true, data: mlRes.data });
      return;
    } catch (apiErr: any) {
      const fallbackEnabled = String(process.env.ML_FALLBACK || '').toLowerCase() === 'true';
      if (fallbackEnabled) {
        res.json({ success: true, data: { status: 'running', model: 'mock', rag_enabled: false } });
        return;
      }
      const statusCode = apiErr?.response?.status || 502;
      const data = apiErr?.response?.data || { error: `ML service error: ${apiErr?.message || 'unknown'}` };
      res.status(statusCode).json(data);
      return;
    }
  } catch (err: any) {
    console.error('Error in getChatbotStatus:', err);
    res.status(500).json({ success: false, error: { code: 'ERROR', message: 'Failed to get chatbot status' } });
    return;
  }
};

