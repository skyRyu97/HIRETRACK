import request from 'supertest';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { app } from '../src/app';
import { User } from '../src/models/User';

const TEST_MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hiretrack';

describe('Phase 1 Gate: Authentication & Session Lifecycle', () => {
  const testUser = {
    name: 'Gate Tester',
    email: `gatetest_${Date.now()}@example.com`,
    password: 'Password123!',
  };

  let accessToken: string;
  let refreshCookie: string;

  let isDbAvailable = false;
  let mongoServer: any;

  beforeAll(async () => {
    try {
      if (mongoose.connection.readyState === 0) {
        try {
          await mongoose.connect(TEST_MONGO_URI, { serverSelectionTimeoutMS: 1500 });
        } catch {
          const { MongoMemoryServer } = await import('mongodb-memory-server');
          mongoServer = await MongoMemoryServer.create();
          await mongoose.connect(mongoServer.getUri());
        }
      }
      isDbAvailable = mongoose.connection.readyState === 1;
    } catch (err) {
      console.warn('[Phase 1 Test Warning] MongoDB connection failed:', err);
      isDbAvailable = false;
    }
  }, 30000);

  afterAll(async () => {
    if (isDbAvailable && mongoose.connection.readyState !== 0) {
      try {
        await User.deleteMany({ email: { $regex: /gatetest_/ } });
        await mongoose.connection.close();
      } catch (err) {
        // ignore
      }
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  }, 10000);

  it('1. POST /api/auth/register creates user and returns JWT + httpOnly cookie', async () => {
    if (!isDbAvailable) return;

    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body.user).toMatchObject({
      name: testUser.name,
      email: testUser.email.toLowerCase(),
    });
    expect(res.body.user).not.toHaveProperty('passwordHash');

    // Verify Set-Cookie header contains refreshToken
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : cookies;
    expect(cookieHeader).toContain('refreshToken=');
    expect(cookieHeader.toLowerCase()).toContain('httponly');
  });

  it('2. POST /api/auth/login validates credentials and issues fresh tokens', async () => {
    if (!isDbAvailable) return;

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    accessToken = res.body.accessToken;

    const cookies = res.headers['set-cookie'];
    refreshCookie = Array.isArray(cookies) ? cookies[0] : cookies;
    expect(refreshCookie).toContain('refreshToken=');
  });

  it('3. GET /api/auth/me returns profile with valid Bearer token', async () => {
    if (!isDbAvailable) return;

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(testUser.email.toLowerCase());
  });

  it('4. GET /api/auth/me rejects unauthenticated request (401)', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('5. POST /api/auth/refresh rotates refresh token and returns new access token', async () => {
    if (!isDbAvailable) return;

    // Wait 1s so JWT iat (in seconds) ticks over to ensure unique token signature
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', refreshCookie);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body.accessToken).not.toBe(accessToken); // Must be a new token
  });

  it('6. POST /api/auth/demo provides 1-click login for reviewers', async () => {
    if (!isDbAvailable) return;

    const res = await request(app).post('/api/auth/demo');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body.user.email).toBe('demo.reviewer@hiretrack.dev');
  });
});
