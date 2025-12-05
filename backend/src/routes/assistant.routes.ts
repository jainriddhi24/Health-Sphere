import { Router } from 'express';
import { checkWarnings } from '../controllers/assistant.controller';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Placeholder route
router.get('/', (req, res) => res.json({ message: 'OK' }));

// GET /assistant/check-warnings (requires authentication)
router.get('/check-warnings', authMiddleware, checkWarnings);

// POST /assistant/check-warnings (requires authentication)
router.post('/check-warnings', authMiddleware, checkWarnings);

export default router;

