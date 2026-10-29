import request from 'supertest';
import { app } from '../src/app';

describe('Phase 0 Gate: Health & Infrastructure Check', () => {
  it('GET /api/health returns 200 with status ok and boolean dbConnected', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('dbConnected');
    expect(typeof res.body.dbConnected).toBe('boolean');
  });
});
