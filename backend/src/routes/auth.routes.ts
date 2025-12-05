import { Router } from 'express';
// multer import removed; using uploadMiddleware instead
import uploadMiddleware from '../middleware/uploadMiddleware';
import { register, login, getProfile, updateProfile, deleteMedicalReport } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// POST /auth/register
router.post('/register', register);

// POST /auth/login
router.post('/login', login);

// GET /auth/profile (requires authentication)
router.get('/profile', authMiddleware, getProfile);

// Use the per-user upload middleware (configured with diskStorage in uploadMiddleware.ts)
const upload = uploadMiddleware;

// PUT /auth/profile (update profile with optional file upload)
router.put('/profile', authMiddleware, upload.single('medical_report'), updateProfile);

// DELETE /auth/profile/report (delete user's uploaded medical report)
router.delete('/profile/report', authMiddleware, deleteMedicalReport);

export default router;

