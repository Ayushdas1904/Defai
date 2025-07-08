// server/index.js
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import aiRoutes from './routes/aiRoutes.js';

dotenv.config();
const app = express();

// Enable CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));

// Parse incoming JSON requests
app.use(express.json());

// Routes
app.use('/api', aiRoutes);

// MongoDB connection
const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  console.error("❌ MONGO_URI environment variable is not set.");
  process.exit(1);
}

mongoose.connect(mongoUri)
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(process.env.PORT || 8080, () =>
      console.log(`🚀 Server running on http://localhost:${process.env.PORT || 8080}`)
    );
  })
  .catch(err => {
    console.error("❌ MongoDB connection error:", err);
  });
