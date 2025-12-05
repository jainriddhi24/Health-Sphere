import { Router } from 'express';
import multer from 'multer';
import { scanFood, getFoodHistory, feedbackFood, testScanFood } from '../controllers/food.controller';
import { authMiddleware } from '../middleware/authMiddleware';

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG and PNG are allowed.'));
    }
  }
});

const router = Router();

// Placeholder route
router.get('/', (req, res) => res.json({ message: 'OK' }));

// POST /food/scan (requires authentication)
router.post('/scan', authMiddleware, upload.single('image'), scanFood);

// POST /food/feedback (requires authentication)
router.post('/feedback', authMiddleware, feedbackFood);

// GET /food/history (requires authentication)
router.get('/history', authMiddleware, getFoodHistory);

// GET /food/test (no auth) — useful to validate ML service connectivity
router.get('/test', testScanFood);

export default router;

