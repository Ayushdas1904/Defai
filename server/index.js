// index.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import aiRoutes from './routes/aiRoutes.js';
import { connectToDatabase } from './db.js';

const app = express();

// Restrict to FRONTEND_URL (comma-separated) when set; otherwise allow any origin
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean)
  : '*';
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// Connect lazily so a missing/slow DB doesn't crash the serverless function
app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
  } catch (err) {
    console.error('MongoDB unavailable, continuing without it:', err.message);
  }
  next();
});

app.use('/api', aiRoutes);

app.get('/', (req, res) => res.send('Server running'));

// Vercel imports the app as a handler; only listen when run directly
if (!process.env.VERCEL) {
  const port = process.env.PORT || 8080;
  const host = process.env.HOST || '127.0.0.1';
  app.listen(port, host, () => console.log(`Server running at http://${host}:${port}`));
}

export default app;
