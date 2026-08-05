/**
 * Middleware for 404 Not Found handling
 */
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * Global Error Handler Middleware
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || 'Internal Server Error';

  // Handle Sequelize Unique Constraint Errors (e.g. duplicate email/phone)
  if (err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 400;
    const field = err.errors && err.errors.length > 0 ? err.errors[0].path : 'field';
    message = `Duplicate entry for ${field}. Please use another value.`;
  }

  // Handle Sequelize Validation Errors
  if (err.name === 'SequelizeValidationError') {
    statusCode = 400;
    message = err.errors.map((e) => e.message).join(', ');
  }

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

module.exports = { notFound, errorHandler };
