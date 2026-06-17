import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /api/categories?examBoardId=xxx
router.get('/', async (req, res) => {
  try {
    const { examBoardId } = req.query;
    const where = examBoardId
      ? { examBoardId: String(examBoardId), isActive: true }
      : { isActive: true };
    const categories = await prisma.category.findMany({
      where,
      orderBy: { order: 'asc' },
      include: {
        grades: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
      },
    });
    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/categories/:id
router.get('/:id', async (req, res) => {
  try {
    const category = await prisma.category.findUnique({
      where: { id: req.params.id },
      include: {
        grades: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
          include: {
            subjects: {
              where: { isActive: true },
              orderBy: { name: 'asc' },
            },
          },
        },
      },
    });
    if (!category) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: category });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
