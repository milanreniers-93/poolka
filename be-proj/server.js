// server.js - Updated with all new routes
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

// Import routes
const bookingRoutes = require('./routes/bookings');
const carRoutes = require('./routes/cars');
const profileRoutes = require('./routes/profiles');
const organizationRoutes = require('./routes/organizations');
const inviteRoutes = require('./routes/invite');
const healthRoutes = require('./routes/health');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// CORS configurationf
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use(limiter);

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/cars', carRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api', inviteRoutes); // Keep invite routes at root level for compatibility

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Fleet Management API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      bookings: '/api/bookings',
      cars: '/api/cars',
      profiles: '/api/profiles',
      organizations: '/api/organizations',
      invite: '/api/invite-users'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      '/api/health',
      '/api/auth',
      '/api/bookings', 
      '/api/cars',
      '/api/profiles',
      '/api/organizations',
      '/api/invite-users'
    ]
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Fleet Management API running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🌐 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:8080'}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log(`🛣️  Available routes:`);
  console.log(`   • Health: http://localhost:${PORT}/api/health`);
  console.log(`   • Auth: http://localhost:${PORT}/api/auth`);
  console.log(`   • Bookings: http://localhost:${PORT}/api/bookings`);
  console.log(`   • Cars: http://localhost:${PORT}/api/cars`);
  console.log(`   • Profiles: http://localhost:${PORT}/api/profiles`);
  console.log(`   • Organizations: http://localhost:${PORT}/api/organizations`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('👋 SIGINT received, shutting down gracefully');
  process.exit(0);
});