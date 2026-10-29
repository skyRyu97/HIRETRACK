import request from 'supertest';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { app } from '../src/app';
import { User } from '../src/models/User';
import { Application } from '../src/models/Application';
import { Resume } from '../src/models/Resume';
import { MatchResult } from '../src/models/MatchResult';

const TEST_MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hiretrack';

describe('Phase 4 Gate: Gemini AI Resume-to-JD Matcher & Caching', () => {
  let userToken: string;
  let userId: string;
  let testJobId: string;
  let emptyJdJobId: string;
  let testResumeId: string;

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

    // 1. Register User
    const authRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'AI Match Tester',
        email: `matchtester_${Date.now()}@example.com`,
        password: 'Password123!',
      });
    userToken = authRes.body.accessToken;
    userId = authRes.body.user.id;

    // 2. Create Job with valid JD
    const jobRes = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        company: 'Uber',
        role: 'Full Stack Engineer',
        status: 'applied',
        jdText:
          'Seeking a Full Stack Engineer experienced in React, TypeScript, Node.js, Express, and Docker. Experience building microservices and REST APIs with MongoDB or PostgreSQL is required. Knowledge of automated testing with Jest is preferred.',
      });
    testJobId = jobRes.body._id;

    // 3. Create Job WITHOUT JD (to test validation)
    const emptyJobRes = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        company: 'StartupX',
        role: 'Backend Dev',
        status: 'wishlist',
      });
    emptyJdJobId = emptyJobRes.body._id;

    // 4. Create Resume in vault
    const resumeRes = await request(app)
      .post('/api/resumes/raw')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        label: 'MERN Specialist',
        text: `
          John Doe — Senior Developer
          Specializing in React.js, Node.js, Express.js, TypeScript, and MongoDB.
          Built scalable REST APIs and client interfaces. Experienced in Git and Agile development.
        `.trim(),
      });
    testResumeId = resumeRes.body._id;
  });

  afterAll(async () => {
    try {
      await User.deleteMany({ email: { $regex: /matchtester_/ } });
      await Application.deleteMany({});
      await Resume.deleteMany({});
      await MatchResult.deleteMany({});
      await mongoose.connection.close();
      if (mongoServer) {
        await mongoServer.stop();
      }
    } catch {
      // ignore
    }
  });

  it('1. POST /api/applications/:id/match rejects jobs with missing JD (400)', async () => {
    const res = await request(app)
      .post(`/api/applications/${emptyJdJobId}/match`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ resumeId: testResumeId });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('no job description text');
  });

  it('2. POST /api/applications/:id/match runs match and returns structured results', async () => {
    const res = await request(app)
      .post(`/api/applications/${testJobId}/match`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ resumeId: testResumeId });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('score');
    expect(typeof res.body.score).toBe('number');
    expect(res.body.score).toBeGreaterThanOrEqual(0);
    expect(res.body.score).toBeLessThanOrEqual(100);
    expect(res.body).toHaveProperty('summary');
    expect(Array.isArray(res.body.matchedSkills)).toBe(true);
    expect(Array.isArray(res.body.missingSkills)).toBe(true);
    expect(Array.isArray(res.body.suggestions)).toBe(true);
    expect(res.body.cached).toBe(false);
  });

  it('3. Repeated match request returns CACHED result (cached: true)', async () => {
    const res = await request(app)
      .post(`/api/applications/${testJobId}/match`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ resumeId: testResumeId });

    expect(res.status).toBe(200);
    expect(res.body.cached).toBe(true);
  });

  it('4. GET /api/applications/:id/matches returns match history', async () => {
    const res = await request(app)
      .get(`/api/applications/${testJobId}/matches`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].applicationId).toBe(testJobId);
  });

  it('5. Quota Enforcement: Exceeding 10 daily matches returns 429 Too Many Requests', async () => {
    // Manually set user's aiCallsToday to 10
    const todayString = new Date().toISOString().split('T')[0];
    await User.findByIdAndUpdate(userId, {
      aiCallsToday: 10,
      lastAiCallDate: todayString,
    });

    // Create a new distinct job so hash is different (bypassing cache)
    const newJob = await Application.create({
      userId,
      company: 'Amazon',
      role: 'SDE II',
      jdText: 'Looking for Java, Spring Boot, DynamoDB, Microservices, and Distributed Systems engineers.',
      status: 'applied',
    });

    const res = await request(app)
      .post(`/api/applications/${newJob._id}/match`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ resumeId: testResumeId });

    expect(res.status).toBe(429);
    expect(res.body.error).toContain('Daily AI quota reached');
  });
});
