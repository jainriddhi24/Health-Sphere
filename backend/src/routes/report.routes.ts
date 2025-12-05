import express from 'express';
import uploadMiddleware from '../middleware/uploadMiddleware';
import { uploadReport, processUserReport } from '../controllers/report.controller';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// POST /api/report/upload
router.post('/upload', uploadMiddleware.single('file'), uploadReport);
// POST /api/report/process - process an uploaded report for an authenticated user by reading the stored file path
router.post('/process', authMiddleware, processUserReport);

export default router;
