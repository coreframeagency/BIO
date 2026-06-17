import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /api/grades?categoryId=xxx
router.get('/', async (req, res) => {
  try {
    const { categoryId } = req.query;
    const where = categoryId
      ? { categoryId: String(categoryId), isActive: true }
      : { isActive: true };
    const grades = await prisma.grade.findMany({
      where,
      orderBy: { order: 'asc' },
      include: {
        subjects: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
      },
    });
    res.json({ success: true, data: grades });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/grades/:id
router.get('/:id', async (req, res) => {
  try {
    const grade = await prisma.grade.findUnique({
      where: { id: req.params.id },
      include: {
        subjects: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
          include: {
            units: {
              where: { isActive: true },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });
    if (!grade) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: grade });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
