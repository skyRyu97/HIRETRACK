import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/User';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  REFRESH_COOKIE_NAME,
} from '../utils/jwt';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Validation Schemas
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const { name, email, password } = parseResult.data;
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      res.status(400).json({ error: 'An account with this email already exists' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = new User({
      name,
      email: email.toLowerCase(),
      passwordHash,
    });

    const tokenPayload = { userId: user._id.toString(), email: user.email, name: user.name };
    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    user.refreshTokenHash = hashToken(refreshToken);
    await user.save();

    setRefreshTokenCookie(res, refreshToken);
    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
      accessToken,
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed due to a server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const { email, password } = parseResult.data;
    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const tokenPayload = { userId: user._id.toString(), email: user.email, name: user.name };
    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    user.refreshTokenHash = hashToken(refreshToken);
    await user.save();

    setRefreshTokenCookie(res, refreshToken);
    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
      accessToken,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed due to a server error' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const incomingRefreshToken = req.cookies[REFRESH_COOKIE_NAME];
    if (!incomingRefreshToken) {
      res.status(401).json({ error: 'No refresh token provided' });
      return;
    }

    let payload;
    try {
      payload = verifyRefreshToken(incomingRefreshToken);
    } catch {
      clearRefreshTokenCookie(res);
      res.status(401).json({ error: 'Invalid or expired refresh token' });
      return;
    }

    const user = await User.findById(payload.userId).select('+refreshTokenHash');
    if (!user || !user.refreshTokenHash) {
      clearRefreshTokenCookie(res);
      res.status(401).json({ error: 'User session not found' });
      return;
    }

    // Verify token hash
    const incomingHash = hashToken(incomingRefreshToken);
    if (incomingHash !== user.refreshTokenHash) {
      // Token reuse detected or compromised -> revoke
      user.refreshTokenHash = null;
      await user.save();
      clearRefreshTokenCookie(res);
      res.status(401).json({ error: 'Token compromised. Please log in again.' });
      return;
    }

    // Rotate tokens
    const tokenPayload = { userId: user._id.toString(), email: user.email, name: user.name };
    const newAccessToken = signAccessToken(tokenPayload);
    const newRefreshToken = signRefreshToken(tokenPayload);

    user.refreshTokenHash = hashToken(newRefreshToken);
    await user.save();

    setRefreshTokenCookie(res, newRefreshToken);
    res.status(200).json({ accessToken: newAccessToken });
  } catch (err: any) {
    console.error('Token refresh error:', err);
    clearRefreshTokenCookie(res);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  try {
    const incomingRefreshToken = req.cookies[REFRESH_COOKIE_NAME];
    if (incomingRefreshToken) {
      try {
        const payload = verifyRefreshToken(incomingRefreshToken);
        await User.findByIdAndUpdate(payload.userId, { refreshTokenHash: null });
      } catch {
        // Ignore token verification errors during logout
      }
    }
    clearRefreshTokenCookie(res);
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (err: any) {
    console.error('Logout error:', err);
    clearRefreshTokenCookie(res);
    res.status(200).json({ message: 'Logged out' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user!.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        aiCallsToday: user.aiCallsToday,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve user profile' });
  }
});

// POST /api/auth/demo (1-click guest reviewer login)
router.post('/demo', async (_req: Request, res: Response): Promise<void> => {
  try {
    const demoEmail = 'demo.reviewer@hiretrack.dev';
    let user = await User.findOne({ email: demoEmail });

    if (!user) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('DemoReviewer123!', salt);
      user = await User.create({
        name: 'Demo Reviewer',
        email: demoEmail,
        passwordHash,
      });
    }

    const tokenPayload = { userId: user._id.toString(), email: user.email, name: user.name };
    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    user.refreshTokenHash = hashToken(refreshToken);
    await user.save();

    setRefreshTokenCookie(res, refreshToken);
    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
      accessToken,
    });
  } catch (err: any) {
    console.error('Demo login error:', err);
    res.status(500).json({ error: 'Failed to log in as demo reviewer' });
  }
});

export default router;
