import { Request, Response } from 'express';
import axios from 'axios';
import path from 'path';
import pool from '../config/db';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export const uploadReport = async (req: Request, res: Response) => {
  try {
    const file = (req as any).file;
    const user = (req as any).user;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const payload = {
      userId: user?.userId || null,
      filePath: file.path,
      originalName: file.originalname
    };

    let response;
    try {
      response = await axios.post(`${ML_SERVICE_URL}/process-report`, payload, { timeout: 120000 });
    } catch (apiErr: any) {
      // Log and bubble up the ML service error details for easier debugging
      const status = apiErr?.response?.status;
      const data = apiErr?.response?.data;
      const message = apiErr?.message;
      // If FastAPI returned a structured detail, flatten it to { error }
      let errorData = data;
      if (data && data.detail) {
        // Accept FastAPI detail shape and move it into a top-level `error` property
        const detail = data.detail;
        if (typeof detail === 'string') {
          errorData = { error: detail };
        } else if (detail && typeof detail === 'object' && detail.error) {
          errorData = { error: detail.error, type: detail.type, debug: detail.traceback };
        } else {
          errorData = { error: JSON.stringify(detail) };
        }
      }
      // If nothing useful, fallback to existing message
      if (!errorData) errorData = { error: `ML service error: ${message || 'unknown'}` };
      console.error('ML service error (uploadReport):', { status, data, message, errorData });
      const statusCode = status || 502;
      return res.status(statusCode).json(errorData);
    }

    // If we have an authenticated user (or userId in req.user), persist processing_result
    try {
      const userId = (req as any).user?.userId || null;
      if (userId && response && response.data) {
        const colsRes = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'users'`);
        const availableCols = new Set(colsRes.rows.map((r: any) => r.column_name));
        if (availableCols.has('processing_result')) {
          await pool.query(`UPDATE users SET processing_result = $1 WHERE id = $2`, [response.data, userId]);
          // Also notify ML service to ingest this processing_result into the vector store so the assistant can RAG on it
          // Fire-and-forget: don't wait for this to complete, just log if it fails
          axios.post(`${ML_SERVICE_URL}/chatbot/ingest_user`, { user_id: userId, text: JSON.stringify(response.data), metadata: { source: 'processing_result' } }, { timeout: 60000 }).catch((ingestErr: any) => {
            console.warn('Failed to ingest processing_result to ML service (background task)', ingestErr?.message || ingestErr);
          });
        }
      }
    } catch (persistErr) {
      console.warn('Failed to persist processing_result for uploadReport', persistErr);
    }

    return res.status(200).json(response.data);
  } catch (err: any) {
    console.error('Error uploading report:', err?.response?.data || err.message || err);
    return res.status(500).json({ error: 'Failed to process report' });
  }
};

export const getLatestUserReport = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    if (!userId) return res.status(400).json({ error: 'User ID required' });

    // Get the latest processing_result for the user
    const sel = await pool.query(`SELECT processing_result FROM users WHERE id = $1`, [userId]);
    if (sel.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const processingResult = sel.rows[0].processing_result;
    if (!processingResult) return res.status(404).json({ error: 'No report found for user' });

    return res.status(200).json({ processing_result: processingResult });
  } catch (err: any) {
    console.error('Error fetching latest user report:', err?.message || err);
    return res.status(500).json({ error: 'Failed to fetch report' });
  }
};

export default { uploadReport, getLatestUserReport };

export const processUserReport = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Get filename from DB
    const sel = await pool.query(`SELECT medical_report_url FROM users WHERE id = $1`, [userId]);
    if (sel.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const filename = sel.rows[0].medical_report_url;
    if (!filename) return res.status(404).json({ error: 'No uploaded report for user' });

    const uploadsDir = path.resolve('uploads');
    const filePath = path.join(uploadsDir, userId, filename);
    console.log('Processing report:', { userId, filename, filePath });
    const payload = { userId, filePath, originalName: filename };
    let response;
    try {
      response = await axios.post(`${ML_SERVICE_URL}/process-report`, payload, { timeout: 120000 });
      console.log('ML Service response received:', { status: response.status, dataKeys: Object.keys(response.data || {}) });
    } catch (apiErr: any) {
      // Log and bubble up the ML service error details for easier debugging
      const status = apiErr?.response?.status;
      const data = apiErr?.response?.data;
      const message = apiErr?.message;
      let errorData = data;
      if (data && data.detail) {
        const detail = data.detail;
        if (typeof detail === 'string') {
          errorData = { error: detail };
        } else if (detail && typeof detail === 'object' && detail.error) {
          errorData = { error: detail.error, type: detail.type, debug: detail.traceback };
        } else {
          errorData = { error: JSON.stringify(detail) };
        }
      }
      if (!errorData) errorData = { error: `ML service error: ${message || 'unknown'}` };
      console.error('ML service error (processUserReport):', { status, data, message, filePath, errorData });
      const statusCode = status || 502;
      return res.status(statusCode).json(errorData);
    }
    // Persist processing output if column exists
    try {
      const colsRes = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'users'`);
      const availableCols = new Set(colsRes.rows.map((r: any) => r.column_name));
      if (availableCols.has('processing_result')) {
        console.log('Persisting processing_result to database');
        await pool.query(`UPDATE users SET processing_result = $1 WHERE id = $2`, [response.data, userId]);
        try {
          await axios.post(`${ML_SERVICE_URL}/chatbot/ingest_user`, { user_id: userId, text: JSON.stringify(response.data), metadata: { source: 'processing_result' } }, { timeout: 300000 });
        } catch (ingestErr: any) {
          console.warn('Failed to ingest processing_result to ML service', ingestErr?.message || ingestErr);
        }
      }
    } catch (persistErr) {
      console.warn('Failed to persist processing result', persistErr);
    }
    return res.status(200).json(response.data);
  } catch (err: any) {
    console.error('Error processing existing report', err?.response?.data || err?.message || err);
    return res.status(500).json({ error: 'Failed to process report' });
  }
};
