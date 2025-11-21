import { Router } from 'express';
import { queryChatbot, getChatbotStatus } from '../controllers/chatbot.controller';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Placeholder route
router.get('/', (req, res) => res.json({ message: 'OK' }));

// POST /chatbot/query (requires authentication)
router.post('/query', authMiddleware, queryChatbot);

// GET /chatbot/status (requires authentication)
router.get('/status', authMiddleware, getChatbotStatus);

export default router;

