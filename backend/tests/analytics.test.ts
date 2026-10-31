import request from 'supertest';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { app } from '../src/app';
import { User } from '../src/models/User';
import { Application } from '../src/models/Application';

const TEST_MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hiretrack';

describe('Phase 5 Gate: Analytics Aggregations, Cron Webhook & Reminder Engine', () => {
  let authToken: string;
  let testUserId: string;
  let mongoServer: any;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      try {
        await mongoose.connect(TEST_MONGO_URI, { serverSelectionTimeoutMS: 2000 });
      } catch {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        mongoServer = await MongoMemoryServer.create();
        await mongoose.connect(mongoServer.getUri());
      }
    }

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Analytics Tester',
        email: `analyticstester_${Date.now()}@example.com`,
        password: 'Password123!',
      });

    authToken = res.body.accessToken;
    testUserId = res.body.user.id;

    // Seed test applications across stages
    await Application.create([
      {
        userId: testUserId,
        company: 'Stripe',
        role: 'Full Stack Engineer',
        status: 'interview',
        position: 1000,
        appliedAt: new Date(Date.now() - 7 * 86400000),
        statusHistory: [
          { status: 'applied', at: new Date(Date.now() - 7 * 86400000) },
          { status: 'interview', at: new Date(Date.now() - 2 * 86400000) },
        ],
      },
      {
        userId: testUserId,
        company: 'Vercel',
        role: 'Frontend Architect',
        status: 'applied',
        position: 1000,
        followUpAt: new Date(Date.now() - 1000), // Due for reminder
        appliedAt: new Date(),
        statusHistory: [{ status: 'applied', at: new Date() }],
      },
    ]);
  }, 30000);

  afterAll(async () => {
    try {
      await User.deleteMany({ email: { $regex: /analyticstester_/ } });
      await Application.deleteMany({ userId: testUserId });
      await mongoose.connection.close();
      if (mongoServer) {
        await mongoServer.stop();
      }
    } catch {
      // ignore
    }
  });

  it('1. GET /api/analytics/summary rejects unauthenticated requests (401)', async () => {
    const res = await request(app).get('/api/analytics/summary');
    expect(res.status).toBe(401);
  });

  it('2. GET /api/analytics/summary returns populated aggregated metrics', async () => {
    const res = await request(app)
      .get('/api/analytics/summary')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.totalApplications).toBeGreaterThanOrEqual(2);
    expect(res.body.activeInterviews).toBeGreaterThanOrEqual(1);
    expect(res.body.statusCounts).toBeDefined();
    expect(res.body.weeklyVelocity).toBeInstanceOf(Array);
    expect(res.body.weeklyVelocity.length).toBe(8);
    expect(res.body.averageDaysPerStage).toBeDefined();
  });

  it('3. POST /api/internal/reminders rejects invalid or missing cron secret (401)', async () => {
    const res = await request(app)
      .post('/api/internal/reminders')
      .set('x-cron-secret', 'wrong_secret');

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Unauthorized');
  });

  it('4. POST /api/internal/reminders processes due follow-ups with valid secret', async () => {
    const secret = process.env.CRON_SECRET || 'dev_cron_secret_12345';
    const res = await request(app)
      .post('/api/internal/reminders')
      .set('x-cron-secret', secret);

    expect(res.status).toBe(200);
    expect(res.body.processedCount).toBeGreaterThanOrEqual(1);
  });
});
