import dotenv from 'dotenv';
dotenv.config();

import { createServer } from 'http';
import mongoose from 'mongoose';
import { app } from './app';

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hiretrack';

async function start() {
  try {
    console.log(`[Database] Connecting to MongoDB at ${MONGO_URI.replace(/\/\/.*@/, '//<credentials>@')}...`);
    await mongoose.connect(MONGO_URI);
    console.log('[Database] MongoDB connected successfully.');
  } catch (err) {
    console.warn('[Database] Warning: Initial MongoDB connection failed. Server will continue to serve /api/health.', err);
  }

  const server = createServer(app);
  server.listen(PORT, () => {
    console.log(`[Server] HireTrack API running on http://localhost:${PORT}`);
  });
}

start();
// Reload triggered for Phase 3 routes update
