const { Op } = require('sequelize');
const User = require('../models/userModel');
const generateToken = require('../utils/generateToken');
const generateOtp = require('../utils/generateOtp');
const sendEmail = require('../utils/sendEmail');
const { OAuth2Client } = require('google-auth-library');
const { admin } = require('../config/firebase');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * @desc    Register a new user with Email & Password
 * @route   POST /api/auth/register
 * @access  Public
 */
const sendRegisterOtp = async (req, res, next) => {
  try {
    const { emailOrPhone } = req.body;
    const inputTarget = (emailOrPhone || '').trim();

    if (!inputTarget) {
      return res.status(400).json({
        success: false,
        message: 'Please enter an Email Address or Phone Number',
      });
    }

    const isEmailInput = inputTarget.includes('@');
    const userEmail = isEmailInput ? inputTarget : null;
    const userPhone = !isEmailInput ? inputTarget : null;

    // Check if user already exists and is verified
    const whereConditions = [];
    if (userEmail) whereConditions.push({ email: userEmail });
    if (userPhone) whereConditions.push({ phoneNumber: userPhone });

    if (whereConditions.length > 0) {
      const userExists = await User.findOne({ where: { [Op.or]: whereConditions } });
      if (userExists && (userExists.isEmailVerified || userExists.isPhoneVerified || userExists.password)) {
        return res.status(400).json({
          success: false,
          message: `An account already exists with this ${isEmailInput ? 'email address' : 'phone number'}. Please log in instead.`,
        });
      }
    }

    // Generate 6-digit OTP
    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    let user = await User.findOne({ where: { [Op.or]: whereConditions } });

    if (!user) {
      user = await User.create({
        fullName: isEmailInput ? userEmail.split('@')[0] : `User_${userPhone.slice(-4)}`,
        email: userEmail,
        phoneNumber: userPhone,
        authProvider: isEmailInput ? 'email' : 'phone',
        emailOTP: isEmailInput ? otp : null,
        phoneOTP: !isEmailInput ? otp : null,
        otpExpiry,
      });
    } else {
      await user.update({
        emailOTP: isEmailInput ? otp : user.emailOTP,
        phoneOTP: !isEmailInput ? otp : user.phoneOTP,
        otpExpiry,
      });
    }

    if (isEmailInput && userEmail) {
      await sendEmail({
        email: userEmail,
        subject: 'PulseAuth - Registration OTP Code',
        message: `Your verification OTP code is: ${otp}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #FF6B35;">PulseAuth Registration</h2>
            <p>Your verification OTP code is:</p>
            <div style="background: #FFF3EC; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <span style="font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #FF6B35;">${otp}</span>
            </div>
            <p>This code expires in 10 minutes.</p>
          </div>
        `,
      });
    } else if (userPhone) {
      console.log(`\n[SMS SIMULATOR] Sent OTP ${otp} to phone: ${userPhone}\n`);
    }

    res.status(200).json({
      success: true,
      message: `OTP code sent successfully to ${inputTarget}`,
      target: inputTarget,
      isEmail: isEmailInput,
      devOtp: process.env.NODE_ENV === 'development' ? otp : undefined,
    });
  } catch (error) {
    next(error);
  }
};

const registerUser = async (req, res, next) => {
  try {
    const { fullName, email, phoneNumber, emailOrPhone, otp, password, role, isFirebaseVerified } = req.body;
    const inputTarget = (emailOrPhone || email || phoneNumber || '').trim();

    if (!inputTarget) {
      return res.status(400).json({
        success: false,
        message: 'Please provide Email Address or Phone Number',
      });
    }

    const isEmailInput = inputTarget.includes('@');
    const userEmail = isEmailInput ? inputTarget : (email || null);
    const userPhone = !isEmailInput ? inputTarget : (phoneNumber || null);

    const whereConditions = [];
    if (userEmail) whereConditions.push({ email: userEmail });
    if (userPhone) whereConditions.push({ phoneNumber: userPhone });

    let user = await User.findOne({ where: { [Op.or]: whereConditions } });

    // Complete registration & verification if user exists or is verified via Firebase / OTP / Password
    if (user) {
      if (!isFirebaseVerified && otp) {
        const activeOtp = user.emailOTP || user.phoneOTP;
        if (activeOtp && activeOtp !== otp && new Date() <= new Date(user.otpExpiry)) {
          return res.status(400).json({ success: false, message: 'Invalid or expired OTP code' });
        }
      }

      user.password = password || user.password;
      user.fullName = fullName || user.fullName;
      user.isEmailVerified = true;
      user.isPhoneVerified = true;
      user.emailOTP = null;
      user.phoneOTP = null;
      user.otpExpiry = null;
      await user.save();

      const token = generateToken(res, user.id);

      return res.status(200).json({
        success: true,
        message: 'Account created and verified successfully!',
        token,
        user: user.toPublicJSON(),
      });
    }

    // Create new verified user in Database
    const defaultName = fullName || (isEmailInput ? userEmail.split('@')[0] : `User_${userPhone.slice(-4)}`);
    user = await User.create({
      fullName: defaultName,
      email: userEmail,
      phoneNumber: userPhone,
      password,
      role: role && ['User', 'Admin'].includes(role) ? role : 'User',
      authProvider: isEmailInput ? 'email' : 'phone',
      isEmailVerified: true,
      isPhoneVerified: true,
      emailOTP: null,
      phoneOTP: null,
    });

    const token = generateToken(res, user.id);

    res.status(201).json({
      success: true,
      message: 'Account created and verified successfully!',
      token,
      user: user.toPublicJSON(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify OTP for Email or Phone
 * @route   POST /api/auth/verify-email-otp
 * @access  Public
 */
const verifyEmailOtp = async (req, res, next) => {
  try {
    const { email, phoneNumber, emailOrPhone, otp } = req.body;
    const target = (emailOrPhone || email || phoneNumber || '').trim();

    const user = await User.findOne({
      where: {
        [Op.or]: [
          { email: target },
          { phoneNumber: target }
        ]
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const activeOtp = user.emailOTP || user.phoneOTP;
    if (!activeOtp || activeOtp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP code' });
    }

    if (new Date() > new Date(user.otpExpiry)) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    // Update user record
    await user.update({
      isEmailVerified: true,
      isPhoneVerified: true,
      emailOTP: null,
      phoneOTP: null,
      otpExpiry: null,
    });

    // Generate JWT Token & Set Cookie
    const token = generateToken(res, user.id);

    res.status(200).json({
      success: true,
      message: 'Account verified successfully!',
      token,
      user: user.toPublicJSON(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Authenticate User & Login (Email or Phone Number)
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = async (req, res, next) => {
  try {
    const { email, password, emailOrPhone } = req.body;
    const identifier = (emailOrPhone || email || '').trim();

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide Email Address / Phone Number and Password',
      });
    }

    const user = await User.findOne({
      where: {
        [Op.or]: [
          { email: identifier },
          { phoneNumber: identifier }
        ]
      }
    });

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email/phone or password credentials',
      });
    }

    // Generate JWT Token & Set Cookie
    const token = generateToken(res, user.id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: user.toPublicJSON(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Google OAuth Login / Authentication
 * @route   POST /api/auth/google-login
 * @access  Public
 */
const googleLogin = async (req, res, next) => {
  try {
    const { idToken, googleId, email, fullName } = req.body;
    let userEmail = email;
    let userName = fullName;
    let gId = googleId;

    if (idToken) {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        userEmail = payload.email;
        userName = payload.name || userName;
        gId = payload.sub;
      } catch (err) {
        if (!userEmail) {
          return res.status(400).json({
            success: false,
            message: 'Invalid Google ID token and no fallback email provided',
          });
        }
      }
    }

    if (!userEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email is required for Google login',
      });
    }

    const whereConditions = [];
    if (gId) whereConditions.push({ googleId: gId });
    if (userEmail) whereConditions.push({ email: userEmail });

    let user = await User.findOne({
      where: { [Op.or]: whereConditions },
    });

    if (user) {
      await user.update({
        googleId: gId || user.googleId,
        isEmailVerified: true,
      });
    } else {
      user = await User.create({
        fullName: userName || 'Google User',
        email: userEmail,
        googleId: gId,
        authProvider: 'google',
        isEmailVerified: true,
      });
    }

    const token = generateToken(res, user.id);

    res.status(200).json({
      success: true,
      message: 'Google login successful',
      token,
      user: user.toPublicJSON(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Send Phone OTP (For Mobile Login / Verification)
 * @route   POST /api/auth/send-phone-otp
 * @access  Public
 */
const sendPhoneOtp = async (req, res, next) => {
  try {
    const { phoneNumber } = req.body;

    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    let user = await User.findOne({ where: { phoneNumber } });

    if (!user) {
      user = await User.create({
        fullName: `User_${phoneNumber.slice(-4)}`,
        phoneNumber,
        authProvider: 'phone',
        phoneOTP: otp,
        otpExpiry,
        isPhoneVerified: false,
      });
    } else {
      await user.update({
        phoneOTP: otp,
        otpExpiry,
      });
    }

    console.log(`\n[SMS SIMULATOR] Sent OTP ${otp} to phone: ${phoneNumber}\n`);

    res.status(200).json({
      success: true,
      message: 'Phone OTP sent successfully (simulated/prepared)',
      phoneNumber,
      devOtp: process.env.NODE_ENV === 'development' ? otp : undefined,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify Phone OTP (Supports numeric OTP or Firebase Phone Auth ID Token)
 * @route   POST /api/auth/verify-phone-otp
 * @access  Public
 */
const verifyPhoneOtp = async (req, res, next) => {
  try {
    const { phoneNumber, otp, firebaseIdToken } = req.body;

    let user = await User.findOne({ where: { phoneNumber } });

    if (firebaseIdToken && admin.apps.length) {
      try {
        const decodedToken = await admin.auth().verifyIdToken(firebaseIdToken);
        const verifiedPhone = decodedToken.phone_number;

        if (verifiedPhone && user) {
          await user.update({
            isPhoneVerified: true,
            phoneOTP: null,
            otpExpiry: null,
          });

          const token = generateToken(res, user.id);
          return res.status(200).json({
            success: true,
            message: 'Firebase Phone authentication successful',
            token,
            user: user.toPublicJSON(),
          });
        }
      } catch (fbErr) {
        console.warn('Firebase token verification error:', fbErr.message);
      }
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found with this phone number' });
    }

    if (!user.phoneOTP || user.phoneOTP !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP code' });
    }

    if (new Date() > new Date(user.otpExpiry)) {
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }

    await user.update({
      isPhoneVerified: true,
      phoneOTP: null,
      otpExpiry: null,
    });

    const token = generateToken(res, user.id);

    res.status(200).json({
      success: true,
      message: 'Phone number verified successfully',
      token,
      user: user.toPublicJSON(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Forgot Password - Send OTP to Email
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User with this email does not exist' });
    }

    const otp = generateOtp();
    await user.update({
      emailOTP: otp,
      otpExpiry: new Date(Date.now() + 10 * 60 * 1000),
    });

    await sendEmail({
      email: user.email,
      subject: 'Login Page - Reset Password OTP',
      message: `Hello ${user.fullName},\n\nYour OTP for resetting your password is: ${otp}\n\nThis OTP is valid for 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #EF4444;">Password Reset Request</h2>
          <p>Hello <strong>${user.fullName}</strong>,</p>
          <p>We received a request to reset your password. Use the OTP below to proceed:</p>
          <div style="background: #F3F4F6; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #EF4444;">${otp}</span>
          </div>
          <p>If you did not request this, please ignore this email.</p>
        </div>
      `,
    });

    res.status(200).json({
      success: true,
      message: 'Password reset OTP has been sent to your email address',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify Forgot Password OTP
 * @route   POST /api/auth/verify-forgot-otp
 * @access  Public
 */
const verifyForgotOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.emailOTP || user.emailOTP !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP code' });
    }

    if (new Date() > new Date(user.otpExpiry)) {
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully. You may now reset your password.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset Password with OTP
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.emailOTP || user.emailOTP !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP code' });
    }

    if (new Date() > new Date(user.otpExpiry)) {
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }

    // Set new password (beforeUpdate hook will hash it)
    user.password = newPassword;
    user.emailOTP = null;
    user.otpExpiry = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successfully! You can now log in with your new password.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout User & Clear HTTP-Only Cookie
 * @route   POST /api/auth/logout
 * @access  Public
 */
const logoutUser = (req, res) => {
  res.cookie('jwt', '', {
    httpOnly: true,
    expires: new Date(0),
  });
  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};

/**
 * @desc    Get Current Authenticated User Profile
 * @route   GET /api/auth/profile
 * @access  Private
 */
const getUserProfile = async (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user,
  });
};

module.exports = {
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
};
