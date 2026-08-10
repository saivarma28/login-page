/**
 * Light Orange & White Authentication Frontend Controller
 */
document.addEventListener('DOMContentLoaded', () => {

  // Base API Endpoint Configuration
  const API_BASE = '/api/auth';

  // Firebase SDK Verification Check
  setTimeout(() => {
    if (window.firebaseApp) {
      console.log('🔥 [Firebase Status]: Connected successfully to Firebase project (login-page-c8c07)');
    }
  }, 500);

  // State
  let currentEmailForOtp = '';
  let currentPhoneForOtp = '';
  let currentForgotEmail = '';
  let currentResetToken = null;

  // Element Selectors
  const toastContainer = document.getElementById('toast-container');
  const authCard = document.getElementById('auth-card');
  const dashboardCard = document.getElementById('dashboard-card');
  
  // Tabs
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  // Modals
  const emailOtpModal = document.getElementById('email-otp-modal');
  const closeEmailOtpModalBtn = document.getElementById('close-email-otp-modal');

  const forgotModal = document.getElementById('forgot-password-modal');
  const closeForgotModalBtn = document.getElementById('close-forgot-modal');
  const forgotPasswordTrigger = document.getElementById('forgot-password-trigger');

  // Forms
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const phoneStep1Form = document.getElementById('phone-step-1-form');
  const phoneStep2Form = document.getElementById('phone-step-2-form');
  const emailOtpForm = document.getElementById('email-otp-form');
  const forgotStep1Form = document.getElementById('forgot-step-1-form');
  const forgotStep2Form = document.getElementById('forgot-step-2-form');

  // Dashboard Elements
  const dashUserName = document.getElementById('dash-user-name');
  const dashUserEmail = document.getElementById('dash-user-email');
  const dashUserPhone = document.getElementById('dash-user-phone');
  const dashUserProvider = document.getElementById('dash-user-provider');
  const dashUserRole = document.getElementById('dash-user-role');
  const dashUserVerified = document.getElementById('dash-user-verified');
  const avatarInitials = document.getElementById('user-avatar-initials');
  const logoutBtn = document.getElementById('logout-btn');
  const refreshProfileBtn = document.getElementById('refresh-profile-btn');

  // --------------------------------------------------------------------------
  // TOAST NOTIFICATION SYSTEM
  // --------------------------------------------------------------------------
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let iconClass = 'fa-solid fa-circle-info';
    if (type === 'success') iconClass = 'fa-solid fa-circle-check';
    if (type === 'error') iconClass = 'fa-solid fa-circle-exclamation';

    toast.innerHTML = `
      <i class="${iconClass}"></i>
      <span>${message}</span>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'fadeOut 0.3s forwards';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // --------------------------------------------------------------------------
  // TAB / VIEW NAVIGATION
  // --------------------------------------------------------------------------
  function switchView(targetTabId) {
    tabPanes.forEach(p => p.classList.remove('active'));
    tabBtns.forEach(b => b.classList.remove('active'));

    const targetPane = document.getElementById(targetTabId);
    if (targetPane) targetPane.classList.add('active');

    const matchingBtn = document.querySelector(`.tab-btn[data-tab="${targetTabId}"]`);
    if (matchingBtn) matchingBtn.classList.add('active');
  }

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      switchView(targetTab);
    });
  });

  const goToRegisterBtn = document.getElementById('go-to-register');
  if (goToRegisterBtn) {
    goToRegisterBtn.addEventListener('click', () => {
      switchView('register-tab');
    });
  }

  const goToLoginBtn = document.getElementById('go-to-login');
  if (goToLoginBtn) {
    goToLoginBtn.addEventListener('click', () => {
      switchView('login-tab');
    });
  }

  // Password Visibility Toggle
  document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      const icon = btn.querySelector('i');

      if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fa-regular fa-eye-slash';
      } else {
        input.type = 'password';
        icon.className = 'fa-regular fa-eye';
      }
    });
  });

  // Auto-Tab for PIN Digits (Supports typing, auto-tabbing, and paste)
  function setupPinAutoTab(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const inputs = container.querySelectorAll('.pin-digit');

    inputs.forEach((input, index) => {
      input.addEventListener('input', (e) => {
        const val = e.target.value;
        if (val.length > 1) {
          prefillPin(containerId, val);
          return;
        }
        if (val.length === 1 && index < inputs.length - 1) {
          inputs[index + 1].focus();
        }
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.value && index > 0) {
          inputs[index - 1].focus();
        }
      });

      input.addEventListener('paste', (e) => {
        e.preventDefault();
        const pasteData = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
        if (pasteData) {
          prefillPin(containerId, pasteData);
        }
      });
    });
  }

  setupPinAutoTab('phone-pin-container');
  setupPinAutoTab('email-pin-container');
  setupPinAutoTab('forgot-pin-container');
  setupPinAutoTab('reg-pin-container');

  function getPinValue(containerId) {
    const inputs = document.querySelectorAll(`#${containerId} .pin-digit`);
    let pin = '';
    inputs.forEach(input => pin += input.value);
    return pin;
  }

  function prefillPin(containerId, value) {
    if (!value) return;
    const inputs = document.querySelectorAll(`#${containerId} .pin-digit`);
    const chars = value.toString().split('');
    inputs.forEach((input, i) => {
      if (chars[i]) input.value = chars[i];
    });
    const lastIndex = Math.min(chars.length, inputs.length) - 1;
    if (inputs[lastIndex]) inputs[lastIndex].focus();
  }

  // --------------------------------------------------------------------------
  // USER PROFILE & DASHBOARD RENDERER
  // --------------------------------------------------------------------------
  function renderUserDashboard(user, isNewRegistration = false) {
    if (!user) return;

    authCard.classList.add('hidden');
    dashboardCard.classList.remove('hidden');

    if (dashUserName) dashUserName.textContent = user.fullName || 'User';

    const subtextEl = document.getElementById('dash-status-subtext');
    if (subtextEl) {
      subtextEl.textContent = isNewRegistration 
        ? 'Your account is created successfully' 
        : 'You are signed in to Geonixa';
    }
    if (dashUserEmail) dashUserEmail.textContent = user.email || 'N/A';
    if (dashUserPhone) dashUserPhone.textContent = user.phoneNumber || 'Not linked';
    if (dashUserProvider) dashUserProvider.textContent = (user.authProvider || 'Email').toUpperCase();
    if (dashUserRole) dashUserRole.textContent = user.role || 'User';

    const isVerified = user.isEmailVerified || user.isPhoneVerified || user.authProvider === 'google';
    if (dashUserVerified) {
      dashUserVerified.textContent = isVerified ? 'Verified' : 'Unverified';
      dashUserVerified.className = `dash-val ${isVerified ? 'status-verified' : ''}`;
    }

    if (avatarInitials) {
      const names = (user.fullName || 'U').split(' ');
      const initials = names.length > 1 
        ? (names[0][0] + names[1][0]).toUpperCase() 
        : names[0][0].toUpperCase();
      avatarInitials.textContent = initials;
    }
  }

  async function checkAuthStatus() {
    // Keep user on Login / Create Account form by default on fresh page load
    if (authCard) authCard.classList.remove('hidden');
    if (dashboardCard) dashboardCard.classList.add('hidden');
  }

  // Set default view on page load
  checkAuthStatus();

  // --------------------------------------------------------------------------
  // AUTHENTICATION API HANDLERS
  // --------------------------------------------------------------------------

  // 1. LOGIN HANDLER
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const target = document.getElementById('login-target').value.trim();
    const password = document.getElementById('login-password').value;

    if (!target || !password) {
      showToast('Please enter your Email/Phone and Password', 'error');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ emailOrPhone: target, password })
      });

      const data = await res.json();

      if (data.success) {
        showToast('Login successful! Welcome back.', 'success');
        renderUserDashboard(data.user);
      } else {
        showToast(data.message || 'Login failed', 'error');
      }
    } catch (err) {
      showToast('Server error during login. Please try again.', 'error');
    }
  });

  // 2. SEND REGISTRATION OTP HANDLER (Supports Real Firebase SMS & Email OTP)
  const sendRegOtpBtn = document.getElementById('send-reg-otp-btn');
  const regOtpSection = document.getElementById('reg-otp-section');
  let firebaseRecaptchaVerifier = null;
  window.confirmationResult = null;

  if (sendRegOtpBtn) {
    sendRegOtpBtn.addEventListener('click', async () => {
      let target = document.getElementById('reg-target').value.trim();
      if (!target) {
        showToast('Please enter your Email Address or Phone Number first', 'error');
        return;
      }

      sendRegOtpBtn.disabled = true;
      sendRegOtpBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';

      const isEmail = target.includes('@');
      let phoneFormatted = target;
      if (!isEmail) {
        const cleanPhone = target.replace(/[^0-9+]/g, '');
        phoneFormatted = cleanPhone.startsWith('+') ? cleanPhone : `+91${cleanPhone}`;
      }

      // Attempt Real Firebase SMS Dispatch for Mobile Phone Numbers
      if (!isEmail && window.firebaseAuth && window.signInWithPhoneNumber) {
        try {
          if (firebaseRecaptchaVerifier) {
            try { firebaseRecaptchaVerifier.clear(); } catch(e) {}
            firebaseRecaptchaVerifier = null;
          }
          firebaseRecaptchaVerifier = new window.RecaptchaVerifier(window.firebaseAuth, 'recaptcha-container', {
            'size': 'invisible',
            'callback': () => {}
          });

          const confirmationResult = await window.signInWithPhoneNumber(window.firebaseAuth, phoneFormatted, firebaseRecaptchaVerifier);
          window.confirmationResult = confirmationResult;

          regOtpSection.classList.remove('hidden');
          sendRegOtpBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Resend OTP';
          document.querySelectorAll('#reg-pin-container .pin-digit').forEach(input => input.value = '');
          const firstPin = document.querySelector('#reg-pin-container .pin-digit');
          if (firstPin) firstPin.focus();
          showToast(`📱 Real SMS OTP sent to ${phoneFormatted}! Please check your mobile messages.`, 'success');
          return;
        } catch (fbErr) {
          console.error('Firebase SMS Dispatch Error:', fbErr);
          showToast(`Firebase SMS Error: ${fbErr.message || fbErr.code}`, 'error');
          sendRegOtpBtn.disabled = false;
          sendRegOtpBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send OTP';
          return;
        }
      }

      // Backend API Dispatch
      try {
        const res = await fetch(`${API_BASE}/send-register-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ emailOrPhone: target })
        });

        let data;
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          data = await res.json();
        } else {
          const rawText = await res.text();
          throw new Error(rawText && rawText.length < 100 ? rawText : `Server returned HTTP ${res.status}`);
        }

        if (data.success) {
          regOtpSection.classList.remove('hidden');
          sendRegOtpBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Resend OTP';

          document.querySelectorAll('#reg-pin-container .pin-digit').forEach(input => input.value = '');
          const firstPin = document.querySelector('#reg-pin-container .pin-digit');
          if (firstPin) firstPin.focus();

          let successMsg = isEmail 
            ? `📧 OTP code sent to ${target}! Please check your email inbox.`
            : `📱 OTP code sent successfully to ${target}!`;

          if (data.devOtp) {
            successMsg += ` (OTP: ${data.devOtp})`;
          }

          showToast(successMsg, 'success');
        } else {
          showToast(data.message || 'Failed to send OTP code', 'error');
          sendRegOtpBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send OTP';
        }
      } catch (err) {
        console.error('Send OTP Error:', err);
        showToast(err.message || 'Error sending OTP code', 'error');
        sendRegOtpBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send OTP';
      } finally {
        sendRegOtpBtn.disabled = false;
      }
    });
  }

  // 3. REGISTER (CREATE ACCOUNT) SUBMIT HANDLER
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('reg-fullname').value.trim();
    const target = document.getElementById('reg-target').value.trim();
    const otp = getPinValue('reg-pin-container');
    const password = document.getElementById('reg-password').value;
    const repeatPassword = document.getElementById('reg-repeat-password').value;
    const submitBtn = registerForm.querySelector('button[type="submit"]');

    if (!target) {
      showToast('Please enter your Email Address or Phone Number', 'error');
      return;
    }

    if (regOtpSection.classList.contains('hidden') || !otp) {
      showToast('Please click "Send OTP" to receive and enter your verification code', 'error');
      return;
    }

    if (otp.length < 4) {
      showToast('Please enter the full 6-digit OTP code', 'error');
      return;
    }

    if (!password) {
      showToast('Please enter a password', 'error');
      return;
    }

    if (password.length < 6) {
      showToast('Password is too weak. Please use a stronger password.', 'error');
      return;
    }

    if (password !== repeatPassword) {
      showToast('Passwords do not match! Please check Repeat Password', 'error');
      return;
    }

    // Disable button & show processing state
    let originalBtnText = '';
    if (submitBtn) {
      submitBtn.disabled = true;
      originalBtnText = submitBtn.innerHTML;
      submitBtn.innerHTML = '<span>Creating account...</span> <i class="fa-solid fa-spinner fa-spin"></i>';
    }

    console.log("Creating account...");

    try {
      let isFirebaseVerified = false;
      const isEmailInput = target.includes('@');

      if (isEmailInput) {
        // Firebase Email/Password Authentication
        const auth = window.firebaseAuth;
        if (!auth || !window.createUserWithEmailAndPassword) {
          throw new Error('Firebase Auth SDK not ready');
        }

        const userCredential = await window.createUserWithEmailAndPassword(auth, target, password);
        console.log("Account created successfully", userCredential.user.uid);
        isFirebaseVerified = true;
      } else {
        // Firebase Phone Authentication
        if (window.confirmationResult) {
          await window.confirmationResult.confirm(otp);
          console.log("Account created successfully");
          isFirebaseVerified = true;
        }
      }

      // Backend Database Registration (ONLY reached if Firebase user creation succeeds)
      const res = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fullName,
          emailOrPhone: target,
          otp,
          password,
          isFirebaseVerified
        })
      });

      const data = await res.json();

      if (data && data.success) {
        showToast('🎉 Account Created Successfully!', 'success');
        renderUserDashboard(data.user, true);
      } else {
        showToast((data && data.message) || 'Registration failed', 'error');
      }

    } catch (fbErr) {
      const errorCode = fbErr.code || fbErr.name || '';
      const errorMessage = fbErr.message || '';

      console.error("Firebase Auth Error:", errorCode, errorMessage);

      if (errorCode === 'auth/email-already-in-use') {
        const modal = document.getElementById('email-exists-modal');
        if (modal) {
          modal.classList.remove('hidden');
        } else {
          showToast('Account already exists. This email is already registered. Please login instead.', 'error');
        }
      } else if (errorCode === 'auth/invalid-email') {
        showToast('Please enter a valid email address.', 'error');
      } else if (errorCode === 'auth/weak-password') {
        showToast('Password is too weak. Please use a stronger password.', 'error');
      } else {
        showToast('Unable to create account. Please try again.', 'error');
      }
    } finally {
      // Re-enable submit button
      if (submitBtn) {
        submitBtn.disabled = false;
        if (originalBtnText) submitBtn.innerHTML = originalBtnText;
      }
    }
  });

  // Close Email Exists Modal Handler
  const closeEmailExistsModalBtn = document.getElementById('close-email-exists-modal');
  const emailExistsOkBtn = document.getElementById('email-exists-ok-btn');
  const emailExistsModal = document.getElementById('email-exists-modal');

  const closeEmailExistsModalHandler = () => {
    if (emailExistsModal) emailExistsModal.classList.add('hidden');
    switchView('login-tab');
  };

  if (closeEmailExistsModalBtn) closeEmailExistsModalBtn.addEventListener('click', closeEmailExistsModalHandler);
  if (emailExistsOkBtn) emailExistsOkBtn.addEventListener('click', closeEmailExistsModalHandler);

  // Account Success Modal Actions
  const continueBtn = document.getElementById('continue-to-dashboard-btn');
  const closeSuccessBtn = document.getElementById('close-account-success-modal');
  const accountSuccessModal = document.getElementById('account-success-modal');

  const handleGoToDashboard = () => {
    if (accountSuccessModal) accountSuccessModal.classList.add('hidden');
    if (window.pendingCreatedUser) {
      renderUserDashboard(window.pendingCreatedUser);
    } else {
      checkAuthStatus();
    }
  };

  if (continueBtn) continueBtn.addEventListener('click', handleGoToDashboard);
  if (closeSuccessBtn) closeSuccessBtn.addEventListener('click', handleGoToDashboard);

  // 3. VERIFY REGISTRATION OTP HANDLER
  if (emailOtpForm) {
    emailOtpForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const otp = getPinValue('email-pin-container');

      if (otp.length < 4) {
        showToast('Please enter the full 6-digit OTP code', 'error');
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/verify-email-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ emailOrPhone: currentEmailForOtp, otp })
        });

        const data = await res.json();

        if (data.success) {
          if (emailOtpModal) emailOtpModal.classList.add('hidden');
          showToast('Account verified successfully!', 'success');
          renderUserDashboard(data.user);
        } else {
          showToast(data.message || 'Invalid or expired OTP code', 'error');
        }
      } catch (err) {
        showToast('Failed to verify OTP code', 'error');
      }
    });
  }

  // 4. GOOGLE AUTHENTICATION WITH FIREBASE
  const handleGoogleLogin = async (e) => {
    if (e) e.preventDefault();

    const targetBtn = e.currentTarget || document.getElementById('google-login-btn');
    let originalText = '';
    if (targetBtn) {
      targetBtn.disabled = true;
      originalText = targetBtn.innerHTML;
      targetBtn.innerHTML = '<i class="fa-brands fa-google"></i> <span>Connecting to Google...</span>';
    }

    try {
      const auth = window.firebaseAuth;
      if (!auth || !window.GoogleAuthProvider || !window.signInWithPopup) {
        showToast('Firebase Google Auth SDK is loading. Please try again.', 'error');
        return;
      }

      const provider = new window.GoogleAuthProvider();
      const result = await window.signInWithPopup(auth, provider);
      const user = result.user;

      const uid = user.uid;
      const displayName = user.displayName || 'Google User';
      const email = user.email;
      const photoURL = user.photoURL || '';

      console.log("Google Sign-In successful", uid, email);

      // Register or Log In user via backend API
      const res = await fetch(`${API_BASE}/google-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email,
          fullName: displayName,
          googleId: uid,
          photoURL
        })
      });

      const data = await res.json();
      if (data && data.success) {
        showToast('🎉 Google Sign-In successful!', 'success');
        renderUserDashboard(data.user);
      } else {
        showToast((data && data.message) || 'Google sign-in failed. Please try again.', 'error');
      }
    } catch (err) {
      const errorCode = err.code || err.name || '';
      const errorMessage = err.message || '';

      console.error("Firebase Google Auth Error:", errorCode, errorMessage);

      if (errorCode === 'auth/popup-closed-by-user') {
        showToast('Google sign-in was cancelled.', 'info');
      } else if (errorCode === 'auth/popup-blocked') {
        showToast('Please allow popups in your browser and try again.', 'error');
      } else if (errorCode === 'auth/account-exists-with-different-credential') {
        showToast('An account already exists with a different sign-in method. Please use that method to sign in.', 'error');
      } else if (errorCode === 'auth/unauthorized-domain') {
        showToast('Authorized domain missing in Firebase Console > Auth Settings.', 'error');
      } else {
        showToast('Google sign-in failed. Please try again.', 'error');
      }
    } finally {
      if (targetBtn) {
        targetBtn.disabled = false;
        if (originalText) targetBtn.innerHTML = originalText;
      }
    }
  };

  const googleLoginBtn = document.getElementById('google-login-btn');
  const googleRegisterBtn = document.getElementById('google-register-btn');
  if (googleLoginBtn) googleLoginBtn.addEventListener('click', handleGoogleLogin);
  if (googleRegisterBtn) googleRegisterBtn.addEventListener('click', handleGoogleLogin);

  // Check for Password Reset Token in URL Query Parameters
  const urlParams = new URLSearchParams(window.location.search);
  const tokenFromUrl = urlParams.get('resetToken');
  const emailFromUrl = urlParams.get('email');

  if (tokenFromUrl) {
    currentResetToken = tokenFromUrl;
    if (emailFromUrl) currentForgotEmail = emailFromUrl;

    if (forgotModal) forgotModal.classList.remove('hidden');
    const targetDisplay = document.getElementById('forgot-modal-target-email');
    if (targetDisplay) targetDisplay.textContent = emailFromUrl || 'your account';

    const step1 = document.getElementById('forgot-step-1');
    const stepEmailSent = document.getElementById('forgot-step-email-sent');
    const step2 = document.getElementById('forgot-step-2');
    const otpContainer = document.getElementById('forgot-otp-container');

    if (step1) step1.classList.add('hidden');
    if (stepEmailSent) stepEmailSent.classList.add('hidden');
    if (otpContainer) otpContainer.classList.add('hidden');
    if (step2) step2.classList.remove('hidden');

    showToast('🔑 Reset link verified! Please enter your new password below.', 'info');
  }

  // 5. FORGOT PASSWORD MODAL HANDLERS
  if (forgotPasswordTrigger) {
    forgotPasswordTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      if (forgotModal) forgotModal.classList.remove('hidden');
    });
  }

  if (closeForgotModalBtn) {
    closeForgotModalBtn.addEventListener('click', () => {
      if (forgotModal) forgotModal.classList.add('hidden');
    });
  }

  const closeEmailSentBtn = document.getElementById('close-email-sent-btn');
  if (closeEmailSentBtn) {
    closeEmailSentBtn.addEventListener('click', () => {
      if (forgotModal) forgotModal.classList.add('hidden');
    });
  }

  if (closeEmailOtpModalBtn) {
    closeEmailOtpModalBtn.addEventListener('click', () => {
      if (emailOtpModal) emailOtpModal.classList.add('hidden');
    });
  }

  // Forgot Password - Step 1 (Send Link / OTP)
  if (forgotStep1Form) {
    forgotStep1Form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const target = document.getElementById('forgot-email-input').value.trim();

      if (!target) {
        showToast('Please enter your Email Address or Phone Number', 'error');
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ emailOrPhone: target, email: target })
        });

        const data = await res.json();

        if (data.success) {
          currentForgotEmail = target;
          const isEmailInput = target.includes('@');

          const step1 = document.getElementById('forgot-step-1');
          const stepEmailSent = document.getElementById('forgot-step-email-sent');
          const step2 = document.getElementById('forgot-step-2');
          const otpContainer = document.getElementById('forgot-otp-container');

          if (isEmailInput) {
            // Show Email Sent Confirmation Popup (NO OTP boxes)
            if (step1) step1.classList.add('hidden');
            if (step2) step2.classList.add('hidden');
            document.getElementById('sent-email-display').textContent = target;
            if (stepEmailSent) stepEmailSent.classList.remove('hidden');
            showToast('📩 Password reset link sent! Check your email.', 'success');
          } else {
            // Show Phone OTP reset view
            if (step1) step1.classList.add('hidden');
            if (stepEmailSent) stepEmailSent.classList.add('hidden');
            if (otpContainer) otpContainer.classList.remove('hidden');
            document.getElementById('forgot-modal-target-email').textContent = target;
            if (step2) step2.classList.remove('hidden');
            showToast(data.message || 'OTP sent to your phone!', 'success');
          }
        } else {
          showToast(data.message || 'Failed to request reset link', 'error');
        }
      } catch (err) {
        showToast('Server error while requesting password reset', 'error');
      }
    });
  }

  // Forgot Password - Step 2 (Reset Password with Token or OTP)
  if (forgotStep2Form) {
    forgotStep2Form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const otp = getPinValue('forgot-pin-container');
      const newPassword = document.getElementById('forgot-new-password').value;
      const confirmPassword = document.getElementById('forgot-confirm-password') 
        ? document.getElementById('forgot-confirm-password').value 
        : newPassword;

      if (!currentResetToken && !otp) {
        showToast('Please enter the OTP code or open the link from your email', 'error');
        return;
      }

      if (!newPassword || newPassword.length < 6) {
        showToast('New password must be at least 6 characters long', 'error');
        return;
      }

      if (newPassword !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            emailOrPhone: currentForgotEmail,
            email: currentForgotEmail,
            resetToken: currentResetToken,
            otp,
            newPassword
          })
        });

        const data = await res.json();

        if (data.success) {
          if (forgotModal) forgotModal.classList.add('hidden');
          showToast('🎉 Password reset successfully! You can now log in.', 'success');
          
          forgotStep1Form.reset();
          forgotStep2Form.reset();
          currentResetToken = null;
          window.history.replaceState({}, document.title, window.location.pathname);

          const step1 = document.getElementById('forgot-step-1');
          const stepEmailSent = document.getElementById('forgot-step-email-sent');
          const step2 = document.getElementById('forgot-step-2');
          
          if (stepEmailSent) stepEmailSent.classList.add('hidden');
          if (step2) step2.classList.add('hidden');
          if (step1) step1.classList.remove('hidden');

          switchView('login-tab');
        } else {
          showToast(data.message || 'Password reset failed', 'error');
        }
      } catch (err) {
        showToast('Error resetting password', 'error');
      }
    });
  }

  // 6. LOGOUT HANDLER (Guaranteed Return to Main Page)
  window.handleGlobalLogout = async function(e) {
    if (e) e.preventDefault();
    try {
      await fetch(`${API_BASE}/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (err) {
      console.warn('Logout API exception:', err);
    }
    document.cookie = "jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    if (dashboardCard) dashboardCard.classList.add('hidden');
    if (authCard) authCard.classList.remove('hidden');
    switchView('login-tab');
    window.location.reload();
  };

  if (logoutBtn) logoutBtn.addEventListener('click', window.handleGlobalLogout);

  if (refreshProfileBtn) {
    refreshProfileBtn.addEventListener('click', () => {
      checkAuthStatus();
      showToast('Profile refreshed!', 'info');
    });
  }

});
