import { Router } from 'express';
import { 
  recommendWorkouts,
  logWorkout,
  getHistory,
  getByIntensity,
  getByTypeSubstring,
  getStats
} from '../controllers/workout.controller';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Health check route
router.get('/', (req, res) => res.json({ message: 'OK' }));

// GET /workouts/recommend (public)
router.get('/recommend', recommendWorkouts);

// POST /workouts/log (requires authentication)
router.post('/log', authMiddleware, logWorkout);

// GET /workouts/history (requires authentication)
router.get('/history', authMiddleware, getHistory);

// ⭐ NEW ENDPOINTS ⭐

// GET /workouts/by-intensity?level=low|medium|high
router.get('/by-intensity', authMiddleware, getByIntensity);

// GET /workouts/search?query=walk
router.get('/search', authMiddleware, getByTypeSubstring);

// GET /workouts/stats
router.get('/stats', authMiddleware, getStats);

export default router;
