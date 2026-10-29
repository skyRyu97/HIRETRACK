import request from 'supertest';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { app } from '../src/app';
import { User } from '../src/models/User';
import { Resume } from '../src/models/Resume';

const TEST_MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hiretrack';

describe('Phase 3 Gate: Resume Management & Multi-Version Vault', () => {
  let userAToken: string;
  let userBToken: string;
  let createdResumeId: string;

  const sampleResumeText = `
    Alex Developer
    Full Stack Engineer specializing in TypeScript, React, Node.js, and MongoDB.
    Experience building high-performance web applications and cloud microservices.
    Education: B.Tech Computer Science.
  `.trim();

  let mongoServer: any;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      try {
        await mongoose.connect(TEST_MONGO_URI, { serverSelectionTimeoutMS: 1500 });
      } catch {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        mongoServer = await MongoMemoryServer.create();
        await mongoose.connect(mongoServer.getUri());
      }
    }

    // Register User A
    const resA = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Resume Tester A',
        email: `resumetest_a_${Date.now()}@example.com`,
        password: 'Password123!',
      });
    userAToken = resA.body.accessToken;

    // Register User B
    const resB = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Resume Tester B',
        email: `resumetest_b_${Date.now()}@example.com`,
        password: 'Password123!',
      });
    userBToken = resB.body.accessToken;
  }, 30000);

  afterAll(async () => {
    try {
      await User.deleteMany({ email: { $regex: /resumetest_[ab]_/ } });
      await Resume.deleteMany({});
      await mongoose.connection.close();
      if (mongoServer) {
        await mongoServer.stop();
      }
    } catch {
      // ignore
    }
  });

  it('1. POST /api/resumes/raw stores raw text resume with word count', async () => {
    const res = await request(app)
      .post('/api/resumes/raw')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        label: 'MERN Stack Profile',
        text: sampleResumeText,
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('_id');
    expect(res.body.label).toBe('MERN Stack Profile');
    expect(res.body.extractedText).toContain('Alex Developer');
    expect(res.body.wordCount).toBeGreaterThan(15);
    createdResumeId = res.body._id;
  });

  it('2. GET /api/resumes lists user resumes without heavy text', async () => {
    const res = await request(app)
      .get('/api/resumes')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0]._id).toBe(createdResumeId);
    expect(res.body[0].extractedText).toBeUndefined(); // Excluded from list payload for speed
  });

  it('3. GET /api/resumes/:id fetches full resume text', async () => {
    const res = await request(app)
      .get(`/api/resumes/${createdResumeId}`)
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.extractedText).toContain('Alex Developer');
  });

  it('4. IDOR Verification: User B cannot access User A resume (404)', async () => {
    const res = await request(app)
      .get(`/api/resumes/${createdResumeId}`)
      .set('Authorization', `Bearer ${userBToken}`);

    expect(res.status).toBe(404);
  });

  it('5. POST /api/resumes/upload rejects non-PDF or empty uploads', async () => {
    // Missing file
    const resNoFile = await request(app)
      .post('/api/resumes/upload')
      .set('Authorization', `Bearer ${userAToken}`);
    expect(resNoFile.status).toBe(400);

    // Non-PDF file
    const resInvalidType = await request(app)
      .post('/api/resumes/upload')
      .set('Authorization', `Bearer ${userAToken}`)
      .attach('file', Buffer.from('hello world'), 'notes.txt');
    expect(resInvalidType.status).toBe(500); // Multer filter throws error caught by error handler
  });

  it('6. DELETE /api/resumes/:id deletes resume', async () => {
    const res = await request(app)
      .delete(`/api/resumes/${createdResumeId}`)
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.status).toBe(200);

    const getRes = await request(app)
      .get(`/api/resumes/${createdResumeId}`)
      .set('Authorization', `Bearer ${userAToken}`);
    expect(getRes.status).toBe(404);
  });
});
