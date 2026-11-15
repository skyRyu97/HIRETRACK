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

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser clients (curl, server-to-server, mobile) with no Origin header
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        (process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))
      ) {
        return callback(null, true);
      }
      const err: any = new Error('Not allowed by CORS');
      err.status = 403;
      return callback(err);
    },
    credentials: true,
  })
);
app.use(helmet());
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

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
  max: 30, // 30 login/refresh/demo attempts per 15 min window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again in 15 minutes.' },
  skip: () => isTestEnv,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10, // Limit account creation per IP to prevent throwaway quota abuse
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many accounts created from this IP. Please try again later.' },
  skip: () => isTestEnv,
});

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30, // Per-IP cap on AI endpoints in addition to per-user daily quota
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests from this IP. Please try again later.' },
  skip: () => isTestEnv,
});

app.use('/api', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', registerLimiter);
app.use('/api/auth/refresh', authLimiter);
app.use('/api/auth/demo', authLimiter);
app.use('/api/applications/:id/match', aiLimiter);
app.use('/api/applications/extract-job', aiLimiter);

// Reject cross-site cookie-authenticated auth posts that omit an Origin header
app.use(['/api/auth/refresh', '/api/auth/logout'], (req, res, next) => {
  if (req.headers['sec-fetch-site'] === 'cross-site' && !req.headers.origin) {
    res.status(403).json({ error: 'Cross-site request blocked' });
    return;
  }
  next();
});

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
