import request from 'supertest';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { app } from '../src/app';
import { User } from '../src/models/User';

const TEST_MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hiretrack';

describe('Job Clipper Cascade Extractor (Layer 4 AI & Heuristic Fallback)', () => {
  let authToken: string;
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
        name: 'Extractor Tester',
        email: `extractortester_${Date.now()}@example.com`,
        password: 'Password123!',
      });

    authToken = res.body.accessToken;
  }, 30000);

  afterAll(async () => {
    try {
      await User.deleteMany({ email: { $regex: /extractortester_/ } });
      await mongoose.connection.close();
      if (mongoServer) {
        await mongoServer.stop();
      }
    } catch {
      // ignore
    }
  });

  it('1. POST /api/applications/extract-job rejects unauthenticated requests (401)', async () => {
    const res = await request(app).post('/api/applications/extract-job').send({
      rawText: 'Full Stack Engineer at Stripe, San Francisco',
    });
    expect(res.status).toBe(401);
  });

  it('2. POST /api/applications/extract-job rejects short text (400)', async () => {
    const res = await request(app)
      .post('/api/applications/extract-job')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ rawText: 'Too short' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('too short');
  });

  it('3. POST /api/applications/extract-job parses raw job text into structured fields', async () => {
    const rawSample = `
Senior Backend Engineer
Stripe - Bengaluru, Karnataka
Compensation: ₹30,00,000 - ₹45,00,000 / year
About the role:
We are looking for a Senior Backend Engineer to build high-scale financial infrastructure using Node.js, TypeScript, and distributed systems.
Requirements:
- 5+ years building backend microservices
- Experience with PostgreSQL, Kafka, and Redis
`;

    const res = await request(app)
      .post('/api/applications/extract-job')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        rawText: rawSample,
        url: 'https://stripe.com/jobs/senior-backend-engineer',
      });

    expect(res.status).toBe(200);
    expect(res.body.role).toBeDefined();
    expect(res.body.company).toBeDefined();
    expect(res.body.jdText).toBeDefined();
    expect(res.body.jdText.length).toBeGreaterThan(20);
  }, 15000);
});
