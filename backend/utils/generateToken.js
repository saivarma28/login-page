const jwt = require('jsonwebtoken');

/**
 * Generate JWT Token and set HTTP-Only Cookie
 * @param {Object} res - Express response object
 * @param {string} userId - User ID to sign in payload
 * @returns {string} token
 */
const generateToken = (res, userId) => {
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });

  // Set HTTP-Only cookie
  if (res && res.cookie) {
    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Use HTTPS in production
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });
  }

  return token;
};

module.exports = generateToken;
