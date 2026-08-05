const dotenv = require('dotenv');
// Load Environment Variables first before importing internal modules
dotenv.config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { connectDB } = require('./config/db');
const { initFirebase } = require('./config/firebase');
const authRoutes = require('./routes/authRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Initialize Firebase Admin SDK for Phone Authentication
initFirebase();

const app = express();

// Middleware to guarantee Database connection & table sync before processing requests
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('Database connection middleware error:', err.message);
    res.status(500).json({ success: false, message: 'Database initialization error' });
  }
});

// Middlewares Configuration
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve Static Frontend Files
app.use(express.static(path.join(__dirname, 'public')));

// Enable CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL || true, // Allow configured client origin or reflect request origin
    credentials: true, // Allow cookies to be sent across origins
  })
);

// Health Check & Server Status Endpoint
app.get('/api/status', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Login Page Authentication API is running smoothly',
    port: process.env.PORT || 5000,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date(),
  });
});

// Mount Auth Routes (supports /api/auth, /auth, and /api serverless rewrites)
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);
app.use('/api', authRoutes);

// Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

// Start Server locally (skip app.listen on Vercel serverless)
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log('\n==================================================');
    console.log('🚀 Server Started Successfully!');
    console.log(`➜ Local:   http://localhost:${PORT}/`);
    console.log(`➜ Network: http://127.0.0.1:${PORT}/`);
    console.log(`➜ Mode:    ${process.env.NODE_ENV || 'development'}`);
    console.log('==================================================\n');
  });
}

module.exports = app;
