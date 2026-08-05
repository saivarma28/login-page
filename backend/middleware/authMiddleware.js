const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

/**
 * Middleware to protect routes via JWT token authentication
 */
const protect = async (req, res, next) => {
  let token;

  // 1. Check for token in Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  // 2. Check for token in cookies
  else if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route, no token provided',
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');

    // Attach user to request object (excluding password)
    const userInstance = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password', 'emailOTP', 'phoneOTP', 'otpExpiry'] },
    });

    if (!userInstance) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists',
      });
    }

    req.user = userInstance.get();
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, token invalid or expired',
    });
  }
};

/**
 * Middleware for role-based authorization
 * @param  {...string} roles - Allowed roles (e.g. 'Admin', 'User')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user ? req.user.role : 'Guest'}' is not authorized to access this route`,
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
