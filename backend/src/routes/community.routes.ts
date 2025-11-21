import { Router } from 'express';
import { getChallenges, joinChallenge, updateProgress } from '../controllers/community.controller';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Placeholder route
router.get('/', (req, res) => res.json({ message: 'OK' }));

// GET /community/challenges (requires authentication)
router.get('/challenges', authMiddleware, getChallenges);

// POST /community/join (requires authentication)
router.post('/join', authMiddleware, joinChallenge);

// POST /community/progress (requires authentication)
router.post('/progress', authMiddleware, updateProgress);

export default router;

