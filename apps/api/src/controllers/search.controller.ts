import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { errorResponse, successResponse } from '../types';

export async function search(req: Request, res: Response) {
  const q = (req.query.q as string | undefined)?.trim() ?? '';

  if (q.length < 2) {
    res.json(successResponse({ lessons: [], units: [], subjects: [] }));
    return;
  }

  const [lessons, units, subjects] = await Promise.all([
    prisma.lesson.findMany({
      where: {
        status: 'PUBLISHED',
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { notesRawText: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 5,
      select: {
        id: true,
        title: true,
        slug: true,
        unitLinks: {
          take: 1,
          select: {
            unit: {
              select: {
                name: true,
                slug: true,
                subject: {
                  select: {
                    name: true,
                    slug: true,
                    grade: {
                      select: {
                        slug: true,
                        category: {
                          select: {
                            slug: true,
                            examBoard: { select: { name: true, slug: true } },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.unit.findMany({
      where: {
        isActive: true,
        name: { contains: q, mode: 'insensitive' },
      },
      take: 5,
      select: {
        id: true,
        name: true,
        slug: true,
        subject: {
          select: {
            name: true,
            slug: true,
            grade: {
              select: {
                slug: true,
                category: {
                  select: {
                    slug: true,
                    examBoard: { select: { name: true, slug: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.subject.findMany({
      where: {
        isActive: true,
        name: { contains: q, mode: 'insensitive' },
      },
      take: 5,
      select: {
        id: true,
        name: true,
        slug: true,
        grade: {
          select: {
            name: true,
            slug: true,
            category: {
              select: {
                name: true,
                slug: true,
                examBoard: { select: { name: true, slug: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  res.json(
    successResponse({
      lessons: lessons.map((lesson) => {
        const unit = lesson.unitLinks[0]?.unit;
        return {
          id: lesson.id,
          title: lesson.title,
          slug: lesson.slug,
          unitName: unit?.name ?? '',
          subjectName: unit?.subject?.name ?? '',
          boardName: unit?.subject?.grade?.category?.examBoard?.name ?? '',
          boardSlug: unit?.subject?.grade?.category?.examBoard?.slug ?? '',
          categorySlug: unit?.subject?.grade?.category?.slug ?? '',
          gradeSlug: unit?.subject?.grade?.slug ?? '',
          subjectSlug: unit?.subject?.slug ?? '',
          unitSlug: unit?.slug ?? '',
        };
      }),
      units: units.map((unit) => ({
        id: unit.id,
        name: unit.name,
        slug: unit.slug,
        subjectName: unit.subject.name,
        boardName: unit.subject.grade?.category?.examBoard?.name ?? '',
        boardSlug: unit.subject.grade?.category?.examBoard?.slug ?? '',
        categorySlug: unit.subject.grade?.category?.slug ?? '',
        gradeSlug: unit.subject.grade?.slug ?? '',
        subjectSlug: unit.subject.slug,
      })),
      subjects: subjects.map((subject) => ({
        id: subject.id,
        name: subject.name,
        slug: subject.slug,
        gradeName: subject.grade?.name ?? '',
        categoryName: subject.grade?.category?.name ?? '',
        boardName: subject.grade?.category?.examBoard?.name ?? '',
        boardSlug: subject.grade?.category?.examBoard?.slug ?? '',
        categorySlug: subject.grade?.category?.slug ?? '',
        gradeSlug: subject.grade?.slug ?? '',
      })),
    })
  );
}
