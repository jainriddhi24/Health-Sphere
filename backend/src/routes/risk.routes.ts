import { Router } from 'express';
import { getForecast, recalculateRisk } from '../controllers/risk.controller';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Placeholder route
router.get('/', (req, res) => res.json({ message: 'OK' }));

// GET /risk/forecast (requires authentication)
router.get('/forecast', authMiddleware, getForecast);

// POST /risk/recalculate (requires authentication)
router.post('/recalculate', authMiddleware, recalculateRisk);

export default router;

