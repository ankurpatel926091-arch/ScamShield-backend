import mongoose from 'mongoose';
import dns from 'dns';
import { config } from './env.js';

// Ensure DNS resolution works smoothly for MongoDB Atlas SRV records on Windows/local ISP DNS
try {
  dns.setDefaultResultOrder?.('ipv4first');
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (err) {
  // Ignore if environment does not allow setting custom DNS servers
}

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.warn(`[Database Warning] MongoDB connection failed (${error.message}). Operating with fallback/in-memory handling if applicable.`);
    return null;
  }
};
