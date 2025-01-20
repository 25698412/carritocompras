const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const tokenManager = require('../utils/tokenManager');

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token using tokenManager
      const decoded = await tokenManager.verifyToken(token);

      // Get user from the token
      req.user = await User.findById(decoded.id).select('-password');

      next();
    } catch (error) {
      console.error(error);
      res.status(401);
      throw new Error('Not authorized');
    }
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }
});

const refresh = asyncHandler(async (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(401);
    throw new Error('No refresh token provided');
  }

  try {
    // Verify refresh token
    const decoded = await tokenManager.verifyToken(refreshToken);
    
    // Get user from the token
    const user = await User.findById(decoded.id).select('-password');
    
    // Generate new access token
    const newAccessToken = await tokenManager.generateAccessToken(user._id);
    
    // Send new token in response
    res.status(200).json({
      accessToken: newAccessToken
    });
  } catch (error) {
    console.error(error);
    res.status(401);
    throw new Error('Invalid refresh token');
  }
});

module.exports = { protect, refresh };
