const { body, validationResult } = require('express-validator');

// Helper to validate and return errors
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }
  next();
};

// Validation rules
const registerValidation = [
  body('fullName').optional().trim(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  validate,
];

const loginValidation = [
  body('password').notEmpty().withMessage('Password is required'),
  validate,
];

const verifyEmailOtpValidation = [
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('otp').trim().isLength({ min: 4, max: 6 }).withMessage('Valid OTP is required'),
  validate,
];

const sendPhoneOtpValidation = [
  body('phoneNumber').trim().notEmpty().withMessage('Phone number is required'),
  validate,
];

const verifyPhoneOtpValidation = [
  body('phoneNumber').trim().notEmpty().withMessage('Phone number is required'),
  body('otp').trim().notEmpty().withMessage('OTP or Firebase ID token is required'),
  validate,
];

const forgotPasswordValidation = [
  body('email').trim().isEmail().withMessage('Valid email is required'),
  validate,
];

const verifyForgotOtpValidation = [
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('otp').trim().isLength({ min: 4, max: 6 }).withMessage('Valid OTP is required'),
  validate,
];

const resetPasswordValidation = [
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('otp').trim().notEmpty().withMessage('OTP is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long'),
  validate,
];

module.exports = {
  registerValidation,
  loginValidation,
  verifyEmailOtpValidation,
  sendPhoneOtpValidation,
  verifyPhoneOtpValidation,
  forgotPasswordValidation,
  verifyForgotOtpValidation,
  resetPasswordValidation,
};
