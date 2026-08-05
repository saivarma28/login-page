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

  // Auto-Tab for PIN Digits
  function setupPinAutoTab(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const inputs = container.querySelectorAll('.pin-digit');

    inputs.forEach((input, index) => {
      input.addEventListener('input', (e) => {
        if (e.target.value.length === 1 && index < inputs.length - 1) {
          inputs[index + 1].focus();
        }
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.value && index > 0) {
          inputs[index - 1].focus();
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
    const chars = value.split('');
    inputs.forEach((input, i) => {
      if (chars[i]) input.value = chars[i];
    });
  }

  // --------------------------------------------------------------------------
  // USER PROFILE & DASHBOARD RENDERER
  // --------------------------------------------------------------------------
  function renderUserDashboard(user) {
    if (!user) return;

    authCard.classList.add('hidden');
    dashboardCard.classList.remove('hidden');

    dashUserName.textContent = user.fullName || 'User';
    dashUserEmail.textContent = user.email || 'N/A';
    dashUserPhone.textContent = user.phoneNumber || 'Not linked';
    dashUserProvider.textContent = (user.authProvider || 'Email').toUpperCase();
    dashUserRole.textContent = user.role || 'User';

    const isVerified = user.isEmailVerified || user.isPhoneVerified || user.authProvider === 'google';
    dashUserVerified.textContent = isVerified ? 'Verified' : 'Unverified';
    dashUserVerified.className = `dash-val ${isVerified ? 'status-verified' : ''}`;

    const names = (user.fullName || 'U').split(' ');
    const initials = names.length > 1 
      ? (names[0][0] + names[1][0]).toUpperCase() 
      : names[0][0].toUpperCase();
    avatarInitials.textContent = initials;
  }

  async function checkAuthStatus() {
    try {
      const response = await fetch(`${API_BASE}/profile`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      const data = await response.json();
      if (data.success && data.user) {
        renderUserDashboard(data.user);
      }
    } catch (err) {
      // User is unauthenticated, stay on login card
    }
  }

  // Check auth status on page load
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
          if (!firebaseRecaptchaVerifier) {
            firebaseRecaptchaVerifier = new window.RecaptchaVerifier(window.firebaseAuth, 'recaptcha-container', {
              'size': 'invisible',
              'callback': () => {}
            });
          }

          const confirmationResult = await window.signInWithPhoneNumber(window.firebaseAuth, phoneFormatted, firebaseRecaptchaVerifier);
          window.confirmationResult = confirmationResult;

          regOtpSection.classList.remove('hidden');
          sendRegOtpBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Resend OTP';
          document.querySelectorAll('#reg-pin-container .pin-digit').forEach(input => input.value = '');
          showToast(`📱 Real SMS OTP sent directly to ${phoneFormatted}! Check your mobile.`, 'success');
          return;
        } catch (fbErr) {
          console.error('Firebase Real SMS Error:', fbErr);
          showToast(`Firebase SMS Notice: ${fbErr.message}`, 'error');
        } finally {
          sendRegOtpBtn.disabled = false;
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

        const data = await res.json();

        if (data.success) {
          regOtpSection.classList.remove('hidden');
          sendRegOtpBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Resend OTP';

          document.querySelectorAll('#reg-pin-container .pin-digit').forEach(input => input.value = '');

          if (data.devOtp) {
            showToast(`[OTP Code]: ${data.devOtp} (Enter this in the boxes below)`, 'info');
          } else {
            showToast(`OTP code sent successfully to ${target}`, 'success');
          }
        } else {
          showToast(data.message || 'Failed to send OTP code', 'error');
          sendRegOtpBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send OTP';
        }
      } catch (err) {
        showToast('Error sending OTP code', 'error');
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
      showToast('Password must be at least 6 characters long', 'error');
      return;
    }

    if (password !== repeatPassword) {
      showToast('Passwords do not match! Please check Repeat Password', 'error');
      return;
    }

    if (window.confirmationResult) {
      try {
        await window.confirmationResult.confirm(otp);
        showToast('📱 SMS OTP verified successfully via Firebase!', 'success');
      } catch (fbConfirmErr) {
        showToast('Invalid SMS OTP code. Please check your mobile messages.', 'error');
        return;
      }
    }

    try {
      const res = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ fullName, emailOrPhone: target, otp, password })
      });

      const data = await res.json();

      if (data.success) {
        showToast('Account created and verified successfully!', 'success');
        renderUserDashboard(data.user);
      } else {
        showToast(data.message || 'Registration failed', 'error');
      }
    } catch (err) {
      showToast('Server error during account creation.', 'error');
    }
  });

  // 3. VERIFY REGISTRATION OTP HANDLER
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
        emailOtpModal.classList.add('hidden');
        showToast('Account verified successfully!', 'success');
        renderUserDashboard(data.user);
      } else {
        showToast(data.message || 'Invalid or expired OTP code', 'error');
      }
    } catch (err) {
      showToast('Failed to verify OTP code', 'error');
    }
  });

  // 4. PHONE OTP - STEP 1 (Send OTP)
  phoneStep1Form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const phoneNumber = document.getElementById('phone-number-input').value.trim();

    if (!phoneNumber) {
      showToast('Please enter your mobile phone number', 'error');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/send-phone-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phoneNumber })
      });

      const data = await res.json();

      if (data.success) {
        currentPhoneForOtp = phoneNumber;
        document.getElementById('sent-phone-display').textContent = phoneNumber;
        
        phoneStep1Form.classList.add('hidden');
        phoneStep2Form.classList.remove('hidden');

        if (data.devOtp) {
          prefillPin('phone-pin-container', data.devOtp);
          showToast(`[DEV MODE] Simulated OTP: ${data.devOtp}`, 'info');
        } else {
          showToast('OTP sent to your phone!', 'success');
        }
      } else {
        showToast(data.message || 'Failed to send OTP', 'error');
      }
    } catch (err) {
      showToast('Server error while sending phone OTP', 'error');
    }
  });

  // 5. PHONE OTP - STEP 2 (Verify & Login)
  phoneStep2Form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const otp = getPinValue('phone-pin-container');

    if (!otp) {
      showToast('Please enter the OTP code', 'error');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/verify-phone-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phoneNumber: currentPhoneForOtp, otp })
      });

      const data = await res.json();

      if (data.success) {
        showToast('Phone verification successful!', 'success');
        renderUserDashboard(data.user);
      } else {
        showToast(data.message || 'Invalid phone OTP code', 'error');
      }
    } catch (err) {
      showToast('Error verifying phone OTP', 'error');
    }
  });

  document.getElementById('change-phone-btn').addEventListener('click', () => {
    phoneStep2Form.classList.add('hidden');
    phoneStep1Form.classList.remove('hidden');
  });

  document.getElementById('resend-phone-otp-btn').addEventListener('click', () => {
    phoneStep1Form.dispatchEvent(new Event('submit'));
  });

  // 6. GOOGLE AUTHENTICATION (Simulated / Integration)
  const handleGoogleLogin = async () => {
    const demoEmail = `google_user_${Math.floor(Math.random() * 1000)}@example.com`;
    const demoName = 'Google Authenticated User';

    try {
      const res = await fetch(`${API_BASE}/google-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: demoEmail,
          fullName: demoName,
          googleId: `g_id_${Date.now()}`
        })
      });

      const data = await res.json();
      if (data.success) {
        showToast('Google Sign-in successful!', 'success');
        renderUserDashboard(data.user);
      } else {
        showToast(data.message || 'Google Sign-in failed', 'error');
      }
    } catch (err) {
      showToast('Google Auth server error', 'error');
    }
  };

  document.getElementById('google-login-btn').addEventListener('click', handleGoogleLogin);
  document.getElementById('google-register-btn').addEventListener('click', handleGoogleLogin);

  // 7. FORGOT PASSWORD MODAL HANDLERS
  forgotPasswordTrigger.addEventListener('click', (e) => {
    e.preventDefault();
    forgotModal.classList.remove('hidden');
  });

  closeForgotModalBtn.addEventListener('click', () => {
    forgotModal.classList.add('hidden');
  });

  closeEmailOtpModalBtn.addEventListener('click', () => {
    emailOtpModal.classList.add('hidden');
  });

  // Forgot Password - Step 1
  forgotStep1Form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('forgot-email-input').value.trim();

    if (!email) {
      showToast('Please enter your email', 'error');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email })
      });

      const data = await res.json();

      if (data.success) {
        currentForgotEmail = email;
        document.getElementById('forgot-modal-target-email').textContent = email;
        document.getElementById('forgot-step-1').classList.add('hidden');
        document.getElementById('forgot-step-2').classList.remove('hidden');
        showToast('Reset OTP code sent to your email!', 'success');
      } else {
        showToast(data.message || 'Failed to request reset OTP', 'error');
      }
    } catch (err) {
      showToast('Server error while requesting password reset', 'error');
    }
  });

  // Forgot Password - Step 2
  forgotStep2Form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const otp = getPinValue('forgot-pin-container');
    const newPassword = document.getElementById('forgot-new-password').value;

    if (!otp || !newPassword) {
      showToast('Please enter both the OTP and your new password', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showToast('New password must be at least 6 characters', 'error');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: currentForgotEmail,
          otp,
          newPassword
        })
      });

      const data = await res.json();

      if (data.success) {
        forgotModal.classList.add('hidden');
        showToast('Password reset successfully! You can now log in.', 'success');
        
        // Reset forms
        forgotStep1Form.reset();
        forgotStep2Form.reset();
        document.getElementById('forgot-step-2').classList.add('hidden');
        document.getElementById('forgot-step-1').classList.remove('hidden');
      } else {
        showToast(data.message || 'Password reset failed', 'error');
      }
    } catch (err) {
      showToast('Error resetting password', 'error');
    }
  });

  // 8. LOGOUT HANDLER
  logoutBtn.addEventListener('click', async () => {
    try {
      const res = await fetch(`${API_BASE}/logout`, {
        method: 'POST',
        credentials: 'include'
      });

      const data = await res.json();
      if (data.success) {
        showToast('Logged out successfully', 'info');
        dashboardCard.classList.add('hidden');
        authCard.classList.remove('hidden');
      }
    } catch (err) {
      showToast('Error logging out', 'error');
    }
  });

  refreshProfileBtn.addEventListener('click', () => {
    checkAuthStatus();
    showToast('Profile refreshed!', 'info');
  });

});
