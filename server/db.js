// db.js
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGO_URI;

if (!MONGODB_URI) {
  throw new Error('MONGO_URI environment variable is not set');
}

// Cache connection for serverless environments
let cached = global._mongoose;
if (!cached) {
  cached = global._mongoose = { conn: null, promise: null };
}

export async function connectToDatabase() {
  if (cached.conn) {
    console.log('Using cached MongoDB connection');
    return cached.conn;
  }

  if (!cached.promise) {
    console.log('Establishing new MongoDB connection...');
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 10000,
      })
      .then((mongoose) => {
        console.log('✅ MongoDB connected');
        return mongoose;
      })
      .catch((err) => {
        console.error('❌ MongoDB connection failed:', err);
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export default mongoose;
