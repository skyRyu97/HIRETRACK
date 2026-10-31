import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import authRoutes from './routes/auth';
import applicationRoutes from './routes/applications';
import resumeRoutes from './routes/resumes';
import analyticsRoutes from './routes/analytics';
import internalRoutes from './routes/internal';

const app = express();

const clientOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(
  cors({
    origin: clientOrigin,
    credentials: true,
  })
);
app.use(helmet());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/api/health', async (_req, res) => {
  const dbConnected = mongoose.connection.readyState === 1; // 1 = connected
  res.json({ status: 'ok', dbConnected });
});

// Feature Routes
app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/internal', internalRoutes);

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (process.env.NODE_ENV !== 'test') {
    console.error('Unhandled Server Error:', err);
  }
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

export { app };
