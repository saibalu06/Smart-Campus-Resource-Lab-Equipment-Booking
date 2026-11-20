import express from 'express';
import { getDb } from './db.ts';
import analyticsRouter from './routes/analytics.ts';
import authRouter from './routes/auth.ts';
import bookingsRouter from './routes/bookings.ts';
import resourcesRouter from './routes/resources.ts';
import { seedDatabase } from './seed.ts';

export function createBackendApp(): express.Express {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Initialize SQLite schema & pre-seed accounts/resources on first startup
  const db = getDb();
  seedDatabase(db);

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'campus-lab-booking-api' });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/resources', resourcesRouter);
  app.use('/api/bookings', bookingsRouter);
  app.use('/api/analytics', analyticsRouter);

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  return app;
}
