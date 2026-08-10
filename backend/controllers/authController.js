const { Op } = require('sequelize');
const User = require('../models/userModel');
const generateToken = require('../utils/generateToken');
const generateOtp = require('../utils/generateOtp');
const sendEmail = require('../utils/sendEmail');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { admin } = require('../config/firebase');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * @desc    Register a new user with Email & Password
 * @route   POST /api/auth/register
 * @access  Public
 */
const getPhoneVariants = (phoneStr) => {
  if (!phoneStr) return [];
  const digits = phoneStr.replace(/[^0-9]/g, '');
  const raw10 = digits.length >= 10 ? digits.slice(-10) : digits;
  return [raw10, `+91${raw10}`, `91${raw10}`];
};

const sendRegisterOtp = async (req, res) => {
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
    const userEmail = isEmailInput ? inputTarget.toLowerCase() : null;
    const userPhone = !isEmailInput ? inputTarget : null;

    const whereConditions = [];
    if (userEmail) whereConditions.push({ email: userEmail });
    if (userPhone) {
      getPhoneVariants(userPhone).forEach(p => whereConditions.push({ phoneNumber: p }));
    }

    // Generate 6-digit OTP
    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    let user = await User.findOne({ where: { [Op.or]: whereConditions } });

    if (!user) {
      user = await User.create({
        fullName: isEmailInput ? userEmail.split('@')[0] : `User_${(userPhone || '1234').slice(-4)}`,
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

    let emailResult = null;
    if (isEmailInput && userEmail) {
      emailResult = await sendEmail({
        email: userEmail,
        subject: 'Geonixa - Registration OTP Code',
        message: `Your verification OTP code is: ${otp}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #FF6B35;">Geonixa Registration</h2>
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

    const isSimulated = !emailResult || emailResult.status === 'simulated';
    const devOtp = isSimulated ? otp : undefined;

    res.status(200).json({
      success: true,
      message: isEmailInput 
        ? `OTP code sent successfully to your email: ${inputTarget}. Please check your inbox!` 
        : `OTP code sent successfully to ${inputTarget}. Please check your mobile messages!`,
      target: inputTarget,
      isEmail: isEmailInput,
      devOtp,
    });
  } catch (error) {
    console.error('Send OTP Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error sending OTP code',
    });
  }
};

const registerUser = async (req, res) => {
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
    const userEmail = isEmailInput ? inputTarget.toLowerCase() : (email ? email.toLowerCase() : null);
    const userPhone = !isEmailInput ? inputTarget : (phoneNumber || null);

    const whereConditions = [];
    if (userEmail) whereConditions.push({ email: userEmail });
    if (userPhone) {
      getPhoneVariants(userPhone).forEach(p => whereConditions.push({ phoneNumber: p }));
    }

    let user = await User.findOne({ where: { [Op.or]: whereConditions } });

    const defaultName = fullName || (isEmailInput ? userEmail.split('@')[0] : `User_${(userPhone || '1234').slice(-4)}`);

    if (!user) {
      if (!isFirebaseVerified) {
        return res.status(400).json({
          success: false,
          message: 'OTP verification required. Please click "Send OTP" first.',
        });
      }
      user = await User.create({
        fullName: defaultName,
        email: userEmail,
        phoneNumber: userPhone,
        password: password || 'DefaultPass123!',
        role: role && ['User', 'Admin'].includes(role) ? role : 'User',
        authProvider: isEmailInput ? 'email' : 'phone',
        isEmailVerified: isEmailInput,
        isPhoneVerified: !isEmailInput,
        emailOTP: null,
        phoneOTP: null,
      });
    } else {
      if (!isFirebaseVerified) {
        const activeOtp = isEmailInput ? user.emailOTP : (user.phoneOTP || user.emailOTP);
        if (!activeOtp || activeOtp !== otp) {
          return res.status(400).json({ success: false, message: 'Invalid OTP code' });
        }
        if (user.otpExpiry && new Date() > new Date(user.otpExpiry)) {
          return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
        }
      }

      if (password) {
        user.password = password;
      }
      user.fullName = fullName || user.fullName;
      if (isEmailInput) user.isEmailVerified = true;
      if (!isEmailInput) user.isPhoneVerified = true;
      user.emailOTP = null;
      user.phoneOTP = null;
      user.otpExpiry = null;
      await user.save();
    }

    const token = generateToken(res, user.id);

    return res.status(200).json({
      success: true,
      message: 'Account created and verified successfully!',
      token,
      user: user.toPublicJSON(),
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error during account creation.',
    });
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
 * @desc    Forgot Password - Send Reset Password Link / OTP
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email, emailOrPhone } = req.body;
    const identifier = (emailOrPhone || email || '').trim();

    if (!identifier) {
      return res.status(400).json({ success: false, message: 'Please enter your Email Address or Phone Number' });
    }

    const isEmailInput = identifier.includes('@');
    const whereConditions = [];
    if (isEmailInput) {
      whereConditions.push({ email: identifier.toLowerCase() });
    } else {
      getPhoneVariants(identifier).forEach(p => whereConditions.push({ phoneNumber: p }));
    }

    const user = await User.findOne({ where: { [Op.or]: whereConditions } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this Email Address or Phone Number' });
    }

    const otp = generateOtp();
    const resetToken = jwt.sign(
      { id: user.id, email: user.email || identifier },
      process.env.JWT_SECRET || 'login_page_jwt_secret_key_2026_dev_mode',
      { expiresIn: '15m' }
    );

    await user.update({
      emailOTP: isEmailInput ? otp : user.emailOTP,
      phoneOTP: !isEmailInput ? otp : user.phoneOTP,
      otpExpiry: new Date(Date.now() + 15 * 60 * 1000),
    });

    if (user.email) {
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
      const host = req.get('host') || 'localhost:5000';
      const resetUrl = `${protocol}://${host}/?resetToken=${resetToken}&email=${encodeURIComponent(user.email)}`;

      await sendEmail({
        email: user.email,
        subject: 'Geonixa - Password Reset Link',
        message: `Hello ${user.fullName},\n\nClick the link below to reset your password:\n${resetUrl}\n\nAlternatively, your 6-digit OTP code is: ${otp}\n\nThis link expires in 15 minutes.`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 25px; color: #2D3748; max-width: 520px; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 12px; background: #ffffff;">
            <div style="text-align: center; margin-bottom: 25px;">
              <h2 style="color: #FF6B35; margin-bottom: 8px;">Reset Your Password</h2>
              <p style="color: #718096; font-size: 14px;">We received a password reset request for your Geonixa account.</p>
            </div>
            
            <p style="font-size: 15px;">Hello <strong>${user.fullName}</strong>,</p>
            <p style="font-size: 14px; color: #4A5568;">Click the button below to change your password directly:</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" target="_blank" style="background: linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 8px 20px -4px rgba(255, 107, 53, 0.4);">Reset Password Now</a>
            </div>

            <p style="font-size: 13px; color: #A0AEC0;">Or copy and paste this link into your browser:</p>
            <p style="font-size: 12px; color: #FF6B35; word-break: break-all;"><a href="${resetUrl}" style="color: #FF6B35;">${resetUrl}</a></p>

            <hr style="border: none; border-top: 1px solid #EDF2F7; margin: 25px 0;" />

            <p style="font-size: 13px; color: #718096;">Alternatively, you can manually enter this OTP code: <strong style="color: #1A202C; letter-spacing: 2px; font-size: 16px;">${otp}</strong></p>
            <p style="font-size: 12px; color: #A0AEC0; margin-top: 15px;">This link and OTP will expire in 15 minutes.</p>
          </div>
        `,
      });
    } else {
      console.log(`\n[SMS SIMULATOR] Password reset OTP ${otp} for phone: ${user.phoneNumber}\n`);
    }

    res.status(200).json({
      success: true,
      message: user.email 
        ? `Password reset link sent successfully to ${user.email}! Please check your email inbox.` 
        : `Password reset OTP sent to ${user.phoneNumber}`,
      target: identifier,
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
    const { email, emailOrPhone, otp } = req.body;
    const identifier = (emailOrPhone || email || '').trim();

    const isEmailInput = identifier.includes('@');
    const whereConditions = [];
    if (isEmailInput) {
      whereConditions.push({ email: identifier.toLowerCase() });
    } else {
      getPhoneVariants(identifier).forEach(p => whereConditions.push({ phoneNumber: p }));
    }

    const user = await User.findOne({ where: { [Op.or]: whereConditions } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const activeOtp = user.emailOTP || user.phoneOTP;
    if (!activeOtp || activeOtp !== otp) {
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
 * @desc    Reset Password with Link / Token or OTP
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
const resetPassword = async (req, res, next) => {
  try {
    const { email, emailOrPhone, otp, resetToken, newPassword } = req.body;
    const identifier = (emailOrPhone || email || '').trim();

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    let user = null;

    if (resetToken) {
      try {
        const decoded = jwt.verify(
          resetToken,
          process.env.JWT_SECRET || 'login_page_jwt_secret_key_2026_dev_mode'
        );
        user = await User.findByPk(decoded.id);
      } catch (err) {
        return res.status(400).json({ success: false, message: 'Invalid or expired password reset link. Please request a new link.' });
      }
    }

    if (!user && identifier) {
      const isEmailInput = identifier.includes('@');
      const whereConditions = [];
      if (isEmailInput) {
        whereConditions.push({ email: identifier.toLowerCase() });
      } else {
        getPhoneVariants(identifier).forEach(p => whereConditions.push({ phoneNumber: p }));
      }
      user = await User.findOne({ where: { [Op.or]: whereConditions } });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found' });
    }

    if (!resetToken) {
      const activeOtp = user.emailOTP || user.phoneOTP;
      if (!activeOtp || activeOtp !== otp) {
        return res.status(400).json({ success: false, message: 'Invalid OTP code' });
      }

      if (new Date() > new Date(user.otpExpiry)) {
        return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new link.' });
      }
    }

    // Set new password (beforeUpdate hook will hash it)
    user.password = newPassword;
    user.emailOTP = null;
    user.phoneOTP = null;
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
