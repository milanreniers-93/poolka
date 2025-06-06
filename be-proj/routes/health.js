// routes/health.js
const express = require('express');
const router = express.Router();

// Health check endpoint
router.get('/', (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: '1.0.0',
    services: {
      database: 'connected', // You could add actual DB health checks here
      api: 'running'
    }
  };

  res.status(200).json(healthCheck);
});

module.exports = router;