import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { logger } from './lib/logger';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import authRoutes from './routes/auth.routes';
import usersRoutes from './routes/users.routes';
import examBoardsRoutes from './routes/examBoards.routes';
import categoriesRoutes from './routes/categories.routes';
import subjectsRoutes from './routes/subjects.routes';
import gradesRoutes from './routes/grades.routes';
import unitsRoutes from './routes/units.routes';
import lessonsRoutes from './routes/lessons.routes';
import questionsRoutes from './routes/questions.routes';
import pastPapersRoutes from './routes/pastPapers.routes';
import pastPaperQuestionsRoutes from './routes/pastPaperQuestions.routes';
import progressRoutes from './routes/progress.routes';
import subscriptionsRoutes from './routes/subscriptions.routes';
import adminRoutes from './routes/admin.routes';
import parentRoutes from './routes/parent.routes';
import payhereRoutes from './routes/payhere.routes';
import flashcardsRoutes from './routes/flashcards.routes';
import searchRoutes from './routes/search.routes';
import feedbackRoutes from './routes/feedback.routes';
import teacherRoutes from './routes/teacher.routes';

const app = express();
app.set('etag', false);
const PORT = process.env.PORT || 3000;

app.use(
  pinoHttp({
    logger,
    autoLogging: process.env.NODE_ENV === 'production',
  })
);

const allowedOrigins: (string | RegExp)[] = [
  process.env.FRONTEND_URL,
  'https://markly.live',
  'https://www.markly.live',
  'http://markly.live',
  'http://www.markly.live',
  'http://localhost:5173',
  'http://localhost:5174',
  /\.vercel\.app$/,
  /\.onrender\.com$/,
].filter((origin): origin is string | RegExp => Boolean(origin));

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// Stripe webhook needs raw body — mount before json parser
app.use('/api/subscriptions/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

app.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/exam-boards', examBoardsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/subjects', subjectsRoutes);
app.use('/api/grades', gradesRoutes);
app.use('/api/units', unitsRoutes);
app.use('/api/lessons', lessonsRoutes);
app.use('/api/questions', questionsRoutes);
app.use('/api/past-papers', pastPapersRoutes);
app.use('/api/past-paper-questions', pastPaperQuestionsRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/payhere', payhereRoutes);
app.use('/api/flashcards', flashcardsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/teacher', teacherRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`API server running on port ${PORT}`);
});

export default app;
