const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const User = require('../models/User');

// Use in-memory rate limiter instead of Redis
const authLimiter = new RateLimiterMemory({
  points: 5, // Number of points
  duration: 60, // Per 60 seconds
  keyPrefix: 'auth_limit'
});

const protect = asyncHandler(async (req, res, next) => {
  let token;
  
  try {
    await authLimiter.consume(req.ip);

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      try {
        // Get token from header
        token = req.headers.authorization.split(' ')[1];

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user from token
        req.user = await User.findById(decoded.id).select('-password');

        next();
      } catch (error) {
        console.error(error);
        // Clear invalid token from client
        res.setHeader('Clear-Site-Data', '"cookies", "storage"');
        res.status(401).json({
          message: 'Sesión inválida. Por favor inicie sesión nuevamente.',
          error: error.name
        });
        return;
      }
    }

    if (!token) {
      res.status(401);
      throw new Error('No autorizado, no se proporcionó token');
    }
  } catch (rateLimiterRes) {
    if (rateLimiterRes instanceof Error) throw rateLimiterRes;
    
    res.setHeader('Retry-After', rateLimiterRes.msBeforeNext / 1000);
    res.status(429).json({
      message: 'Demasiadas solicitudes. Por favor intente nuevamente en un minuto.'
    });
    return;
  }
});

const admin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(401);
    throw new Error('No autorizado como administrador');
  }
};

module.exports = { protect, admin };
