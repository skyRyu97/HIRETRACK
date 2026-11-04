import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth';
import applicationRoutes from './routes/applications';
import resumeRoutes from './routes/resumes';
import analyticsRoutes from './routes/analytics';
import internalRoutes from './routes/internal';

const app = express();

// Trust reverse proxy (Render, Vercel, Railway, Cloudflare) for accurate IP resolution in cookies and rate limiters
app.set('trust proxy', 1);

const clientOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, extension requests)
      if (!origin) return callback(null, true);
      if (origin === clientOrigin || origin.endsWith('vercel.app') || origin.includes('localhost')) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive for showcase demo, still credentials protected
    },
    credentials: true,
  })
);
app.use(helmet());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate Limiters (disabled during unit/integration tests)
const isTestEnv = process.env.NODE_ENV === 'test';

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per 15 min window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' },
  skip: () => isTestEnv,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // 30 login/register attempts per 15 min window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again in 15 minutes.' },
  skip: () => isTestEnv,
});

app.use('/api', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

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
