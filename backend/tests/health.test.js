"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../src/app");
describe('Phase 0 Gate: Health & Infrastructure Check', () => {
    it('GET /api/health returns 200 with status ok and boolean dbConnected', async () => {
        const res = await (0, supertest_1.default)(app_1.app).get('/api/health');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('status', 'ok');
        expect(res.body).toHaveProperty('dbConnected');
        expect(typeof res.body.dbConnected).toBe('boolean');
    });
});
