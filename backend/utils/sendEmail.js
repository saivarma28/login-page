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

  // Check if SMTP options are valid
  if (!host || !user || pass === 'your_app_password' || user === 'your_email@gmail.com') {
    console.log(`\n========================================`);
    console.log(`[SMTP SIMULATOR] Email to: ${options.email}`);
    console.log(`[SMTP SIMULATOR] Subject: ${options.subject}`);
    console.log(`[SMTP SIMULATOR] Message: ${options.message}`);
    console.log(`========================================\n`);
    return { status: 'simulated', message: 'Email simulated in development mode' };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for other ports
    auth: {
      user,
      pass,
    },
  });

  const mailOptions = {
    from: `"${process.env.FROM_NAME || 'Login Page'}" <${process.env.FROM_EMAIL || user}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html || `<p>${options.message}</p>`,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`Email sent: ${info.messageId}`);
  return info;
};

module.exports = sendEmail;
