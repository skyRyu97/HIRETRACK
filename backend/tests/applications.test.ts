import request from 'supertest';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { app } from '../src/app';
import { User } from '../src/models/User';
import { Application } from '../src/models/Application';

const TEST_MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hiretrack';

describe('Phase 2 Gate: Core Kanban Job Board & IDOR Protection', () => {
  let userAToken: string;
  let userBToken: string;
  let createdJobId: string;

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
        name: 'User A',
        email: `usera_${Date.now()}@example.com`,
        password: 'Password123!',
      });
    userAToken = resA.body.accessToken;

    // Register User B (for IDOR check)
    const resB = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'User B',
        email: `userb_${Date.now()}@example.com`,
        password: 'Password123!',
      });
    userBToken = resB.body.accessToken;
  }, 30000);

  afterAll(async () => {
    try {
      await User.deleteMany({ email: { $regex: /user[ab]_/ } });
      await Application.deleteMany({});
      await mongoose.connection.close();
      if (mongoServer) {
        await mongoServer.stop();
      }
    } catch {
      // ignore
    }
  });

  it('1. POST /api/applications creates a job for User A', async () => {
    const res = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        company: 'Stripe',
        role: 'Full Stack Engineer',
        jobUrl: 'https://stripe.com/jobs/123',
        location: 'Remote',
        salary: '₹25 LPA',
        status: 'wishlist',
        notes: 'Targeting referral through LinkedIn',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('_id');
    expect(res.body.company).toBe('Stripe');
    expect(res.body.status).toBe('wishlist');
    expect(res.body.statusHistory.length).toBe(1);
    createdJobId = res.body._id;
  });

  it('2. GET /api/applications returns User A jobs', async () => {
    const res = await request(app)
      .get('/api/applications')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0]._id).toBe(createdJobId);
  });

  it('3. PATCH /api/applications/:id/move updates status and logs transition history', async () => {
    const res = await request(app)
      .patch(`/api/applications/${createdJobId}/move`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        status: 'applied',
        position: 500,
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('applied');
    expect(res.body.position).toBe(500);
    expect(res.body.statusHistory.length).toBe(2);
    expect(res.body.statusHistory[1].status).toBe('applied');
    expect(res.body.appliedAt).toBeDefined();
  });

  it('4. IDOR Verification: User B CANNOT read or move User A job (404)', async () => {
    // User B tries to GET User A's job
    const getRes = await request(app)
      .get(`/api/applications/${createdJobId}`)
      .set('Authorization', `Bearer ${userBToken}`);
    expect(getRes.status).toBe(404);

    // User B tries to MOVE User A's job
    const moveRes = await request(app)
      .patch(`/api/applications/${createdJobId}/move`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ status: 'rejected', position: 0 });
    expect(moveRes.status).toBe(404);

    // User B board must be empty
    const listRes = await request(app)
      .get('/api/applications')
      .set('Authorization', `Bearer ${userBToken}`);
    expect(listRes.body.length).toBe(0);
  });

  it('5. PUT /api/applications/:id updates job metadata', async () => {
    const res = await request(app)
      .put(`/api/applications/${createdJobId}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        company: 'Stripe Inc.',
        role: 'Senior Full Stack Engineer',
        status: 'interview',
        notes: 'Interview scheduled for next Monday',
      });

    expect(res.status).toBe(200);
    expect(res.body.company).toBe('Stripe Inc.');
    expect(res.body.role).toBe('Senior Full Stack Engineer');
    expect(res.body.status).toBe('interview');
  });

  it('6. DELETE /api/applications/:id removes job', async () => {
    const res = await request(app)
      .delete(`/api/applications/${createdJobId}`)
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.status).toBe(200);

    // Verify it is gone
    const getRes = await request(app)
      .get(`/api/applications/${createdJobId}`)
      .set('Authorization', `Bearer ${userAToken}`);
    expect(getRes.status).toBe(404);
  });
});
