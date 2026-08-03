import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env.js';
import { apiLimiter } from './middlewares/rateLimiter.js';
import { errorHandler } from './middlewares/errorMiddleware.js';
import { ApiResponse } from './utils/apiResponse.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

const app = express();

// Security Middlewares
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow Vercel domains, local dev servers, and API clients
      if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('vercel.app')) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  })
);

// Logging and Body Parsers
if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate Limiter
app.use('/api', apiLimiter);

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/admin', adminRoutes);

// Health Check API
app.get('/api/v1/health', (req, res) => {
  return ApiResponse.success(res, 'ScamShield AI API operational', {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    env: config.nodeEnv
  });
});

// 404 Handler
app.use('*', (req, res) => {
  return ApiResponse.error(res, `Route ${req.originalUrl} not found`, 404);
});

// Centralized Error Handler
app.use(errorHandler);

export default app;
