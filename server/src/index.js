import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { connectDB } from './db.js';
import authRoutes from './routes/authRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import './models/Booking.js'; // Register Booking model so mongoose.models.Booking is available for availability checks

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '');

// Enable trust proxy in production for HTTPS termination on hosting providers (Render, Vercel, AWS)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Essential Security Headers (Clickjacking, MIME Sniffing, HSTS)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// CORS configuration supporting credentials for cookies
app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key']
  })
);

// Body parser with explicit 100kb limit (DoS protection) and raw body capture
app.use(
  express.json({
    limit: '100kb',
    verify: (req, res, buf) => {
      req.rawBody = buf;
    }
  })
);
app.use(cookieParser());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'HotelPro API is active and healthy',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Connect to MongoDB and start server if executed directly
connectDB();

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[HotelPro Server] running on http://localhost:${PORT}`);
  });
}

export default app;
