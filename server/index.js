// index.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import aiRoutes from './routes/aiRoutes.js';

dotenv.config();
const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
}));
app.use(express.json());

// Routes
app.use('/api', aiRoutes);

// Default route
app.get("/", (req, res) => {
  res.send("Server running on Vercel");
});

// Export the app (Vercel expects this)
export default app;
