import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

const UPLOAD_ROOT = path.join(process.cwd(), 'uploads');

function ensureUserDir(userId: string) {
  const dest = path.join(UPLOAD_ROOT, userId);
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  return dest;
}

const storage = multer.diskStorage({
  destination: (req: Request, file, cb) => {
    // Fallback to a safe 'public' user directory when no authenticated user is present
    const userId = (req as any).user?.userId as string | undefined || 'public';
    const dest = ensureUserDir(userId);
    cb(null, dest);
  },
  filename: (req: Request, file, cb) => {
    const timestamp = Date.now();
    const safe = file.originalname.replace(/[^a-z0-9.\-\_]/gi, '_');
    cb(null, `${timestamp}-${safe}`);
  }
});

export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'image/png', 'image/jpg', 'image/jpeg'];
    if (!allowed.includes(file.mimetype)) {
      const err: any = new Error('Unsupported file type');
      err.code = 'UNSUPPORTED_FILE_TYPE';
      return cb(err as any, false);
    }
    cb(null, true);
  }
});

export default uploadMiddleware;
