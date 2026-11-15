import request from 'supertest';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { app } from '../src/app';
import { User } from '../src/models/User';

const TEST_MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hiretrack';

describe('Security Controls Verification', () => {
  let userToken: string;
  let userId: string;
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

    const authRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Security Tester',
        email: `sectester_${Date.now()}@example.com`,
        password: 'Password123!',
      });
    userToken = authRes.body.accessToken;
    userId = authRes.body.user.id;
  });

  afterAll(async () => {
    try {
      await User.deleteMany({ email: /sectester_/ });
      await mongoose.disconnect();
      if (mongoServer) await mongoServer.stop();
    } catch {
      // ignore
    }
  });

  it('rejects disallowed CORS origins with 403 and no Access-Control-Allow-Origin', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'https://evil.example');

    expect(res.status).toBe(403);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('allows browser extension origin in non-production environments', async () => {
    const extOrigin = 'chrome-extension://abcdefghijklmnopqrstuvwxyzabcdef';
    const res = await request(app)
      .get('/api/health')
      .set('Origin', extOrigin);

    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe(extOrigin);
  });

  it('rejects javascript: URI in jobUrl (400)', async () => {
    const res = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        company: 'Acme',
        role: 'Engineer',
        jobUrl: 'javascript:alert(1)',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('http:// or https://');
  });

  it('enforces daily AI quota on POST /api/applications/extract-job (429)', async () => {
    const todayString = new Date().toISOString().split('T')[0];
    await User.findByIdAndUpdate(userId, {
      aiCallsToday: 10,
      lastAiCallDate: todayString,
    });

    const res = await request(app)
      .post('/api/applications/extract-job')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        rawText: 'Senior Software Engineer at Acme Corp building Node.js services.',
      });

    expect(res.status).toBe(429);
    expect(res.body.error).toContain('Daily AI quota reached');
  });

  it('rejects spoofed .pdf upload without %PDF- magic bytes (400)', async () => {
    const res = await request(app)
      .post('/api/resumes/upload')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('file', Buffer.from('not a pdf payload'), {
        filename: 'fake.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('valid PDF');
  });

  it('blocks cross-site cookie auth POST when Sec-Fetch-Site is cross-site without Origin (403)', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Sec-Fetch-Site', 'cross-site');

    expect(res.status).toBe(403);
  });

  it('does not seed demo data into unrelated user emails containing "demo"', async () => {
    const email = `sectester_demo_${Date.now()}@example.com`;
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Real Demo Word User', email, password: 'Password123!' });
    const token = regRes.body.accessToken;

    const appsRes = await request(app)
      .get('/api/applications')
      .set('Authorization', `Bearer ${token}`);
    const resumesRes = await request(app)
      .get('/api/resumes')
      .set('Authorization', `Bearer ${token}`);

    expect(appsRes.status).toBe(200);
    expect(appsRes.body).toEqual([]);
    expect(resumesRes.status).toBe(200);
    expect(resumesRes.body).toEqual([]);
  });

  it('prevents parallel burst requests from exceeding the daily AI quota (atomic check)', async () => {
    const email = `sectester_race_${Date.now()}@example.com`;
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Race Tester', email, password: 'Password123!' });
    const token = regRes.body.accessToken;
    const raceUserId = regRes.body.user.id;
    const todayString = new Date().toISOString().split('T')[0];

    // Set remaining quota to 2
    await User.findByIdAndUpdate(raceUserId, {
      aiCallsToday: 8,
      lastAiCallDate: todayString,
    });

    const responses = await Promise.all(
      Array.from({ length: 6 }, () =>
        request(app)
          .post('/api/applications/extract-job')
          .set('Authorization', `Bearer ${token}`)
          .send({
            rawText: 'Backend Engineer at TestCorp working on TypeScript APIs and MongoDB.',
          })
      )
    );

    const okCount = responses.filter((r) => r.status === 200).length;
    const throttledCount = responses.filter((r) => r.status === 429).length;
    expect(okCount).toBe(2);
    expect(throttledCount).toBe(4);
  });

  it('returns 400 for malformed ObjectIds on applications and resumes', async () => {
    const appRes = await request(app)
      .get('/api/applications/not-a-valid-id')
      .set('Authorization', `Bearer ${userToken}`);
    const resumeRes = await request(app)
      .get('/api/resumes/not-a-valid-id')
      .set('Authorization', `Bearer ${userToken}`);

    expect(appRes.status).toBe(400);
    expect(resumeRes.status).toBe(400);
  });

  it('rejects invalid URL or oversized rawText on POST /api/applications/extract-job (400)', async () => {
    const badUrlRes = await request(app)
      .post('/api/applications/extract-job')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        rawText: 'Software Engineer role at Acme Corp with Node.js and React.',
        url: 'javascript:alert(1)',
      });
    const bigTextRes = await request(app)
      .post('/api/applications/extract-job')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        rawText: 'a'.repeat(20001),
      });

    expect(badUrlRes.status).toBe(400);
    expect(bigTextRes.status).toBe(400);
  });
});

