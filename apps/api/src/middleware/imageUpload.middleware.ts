import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../types';

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('ONLY_IMAGE'));
    }
  },
});

export function uploadQuestionImage(req: Request, res: Response, next: NextFunction): void {
  imageUpload.single('image')(req, res, (err: unknown) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        res.status(400).json(errorResponse(err.message));
        return;
      }
      if (err instanceof Error && err.message === 'ONLY_IMAGE') {
        res.status(400).json(errorResponse('Only image files are allowed'));
        return;
      }
      const message = err instanceof Error ? err.message : 'Upload failed';
      res.status(400).json(errorResponse(message));
      return;
    }
    next();
  });
}
