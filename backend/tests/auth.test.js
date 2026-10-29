"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app_1 = require("../src/app");
const User_1 = require("../src/models/User");
const TEST_MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hiretrack';
describe('Phase 1 Gate: Authentication & Session Lifecycle', () => {
    const testUser = {
        name: 'Gate Tester',
        email: `gatetest_${Date.now()}@example.com`,
        password: 'Password123!',
    };
    let accessToken;
    let refreshCookie;
    beforeAll(async () => {
        if (mongoose_1.default.connection.readyState === 0) {
            await mongoose_1.default.connect(TEST_MONGO_URI);
        }
    });
    afterAll(async () => {
        // Clean up test user
        await User_1.User.deleteMany({ email: { $regex: /gatetest_/ } });
        await mongoose_1.default.connection.close();
    });
    it('1. POST /api/auth/register creates user and returns JWT + httpOnly cookie', async () => {
        const res = await (0, supertest_1.default)(app_1.app)
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
        const res = await (0, supertest_1.default)(app_1.app)
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
        const res = await (0, supertest_1.default)(app_1.app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${accessToken}`);
        expect(res.status).toBe(200);
        expect(res.body.user.email).toBe(testUser.email.toLowerCase());
    });
    it('4. GET /api/auth/me rejects unauthenticated request (401)', async () => {
        const res = await (0, supertest_1.default)(app_1.app).get('/api/auth/me');
        expect(res.status).toBe(401);
    });
    it('5. POST /api/auth/refresh rotates refresh token and returns new access token', async () => {
        const res = await (0, supertest_1.default)(app_1.app)
            .post('/api/auth/refresh')
            .set('Cookie', refreshCookie);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('accessToken');
        expect(res.body.accessToken).not.toBe(accessToken); // Must be a new token
    });
    it('6. POST /api/auth/demo provides 1-click login for reviewers', async () => {
        const res = await (0, supertest_1.default)(app_1.app).post('/api/auth/demo');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('accessToken');
        expect(res.body.user.email).toBe('demo.reviewer@hiretrack.dev');
    });
});
