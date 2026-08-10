const nodemailer = require('nodemailer');

/**
 * Send Email via Nodemailer
 * @param {Object} options - { email, subject, message, html }
 */
const sendEmail = async (options) => {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_EMAIL;
  const pass = process.env.SMTP_PASSWORD;

  // Check if SMTP options are valid or placeholder
  const isPlaceholder = !host || !user || !pass || 
    pass.includes('your_') || pass.includes('dev_') || 
    user.includes('your_') || user.includes('dev@') || user.includes('example.com');

  if (isPlaceholder) {
    console.log(`\n========================================`);
    console.log(`[SMTP SIMULATOR] Email to: ${options.email}`);
    console.log(`[SMTP SIMULATOR] Subject: ${options.subject}`);
    console.log(`[SMTP SIMULATOR] Message: ${options.message}`);
    console.log(`========================================\n`);
    return { status: 'simulated', message: 'Email simulated in development mode' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: {
        user,
        pass,
      },
      connectionTimeout: 5000, // 5 seconds connection timeout for serverless resilience
      greetingTimeout: 5000,
      socketTimeout: 5000,
    });

    const mailOptions = {
      from: `"${process.env.FROM_NAME || 'Login Page'}" <${process.env.FROM_EMAIL || user}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html || `<p>${options.message}</p>`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully: ${info.messageId}`);
    return info;
  } catch (err) {
    console.warn(`[SMTP Warning] Could not send email via SMTP (${err.message}). Falling back to simulator mode.`);
    console.log(`[SMTP SIMULATOR FALLBACK] Email to: ${options.email}`);
    console.log(`[SMTP SIMULATOR FALLBACK] Message: ${options.message}`);
    return { status: 'simulated', message: 'Email simulated due to SMTP delivery fallback' };
  }
};

module.exports = sendEmail;
