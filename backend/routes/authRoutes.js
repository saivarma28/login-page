const express = require('express');
const router = express.Router();

const {
  sendRegisterOtp,
  registerUser,
  verifyEmailOtp,
  loginUser,
  googleLogin,
  sendPhoneOtp,
  verifyPhoneOtp,
  forgotPassword,
  verifyForgotOtp,
  resetPassword,
  logoutUser,
  getUserProfile,
} = require('../controllers/authController');

const { protect } = require('../middleware/authMiddleware');

const {
  registerValidation,
  loginValidation,
  verifyEmailOtpValidation,
  sendPhoneOtpValidation,
  verifyPhoneOtpValidation,
  forgotPasswordValidation,
  verifyForgotOtpValidation,
  resetPasswordValidation,
} = require('../middleware/validationMiddleware');

// Public Authentication Routes
router.post('/send-register-otp', sendRegisterOtp);
router.post('/register', registerValidation, registerUser);
router.post('/verify-email-otp', verifyEmailOtpValidation, verifyEmailOtp);
router.post('/login', loginValidation, loginUser);
router.post('/google-login', googleLogin);
router.post('/send-phone-otp', sendPhoneOtpValidation, sendPhoneOtp);
router.post('/verify-phone-otp', verifyPhoneOtpValidation, verifyPhoneOtp);
router.post('/forgot-password', forgotPasswordValidation, forgotPassword);
router.post('/verify-forgot-otp', verifyForgotOtpValidation, verifyForgotOtp);
router.post('/reset-password', resetPasswordValidation, resetPassword);
router.post('/logout', logoutUser);

// Protected Routes
router.get('/profile', protect, getUserProfile);

module.exports = router;
