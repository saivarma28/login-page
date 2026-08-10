const nodemailer = require('nodemailer');

/**
 * Send Email via Nodemailer
 * @param {Object} options - { email, subject, message, html }
 */
const sendEmail = async (options) => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_EMAIL || 'saivarma9333@gmail.com';
  const pass = process.env.SMTP_PASSWORD || 'kpliixmqctgjkalx';

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });

    const mailOptions = {
      from: `"${process.env.FROM_NAME || 'Geonixa'}" <${process.env.FROM_EMAIL || user}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html || `<p>${options.message}</p>`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${options.email}: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error(`[SMTP Error] Failed to send email to ${options.email}: ${err.message}`);
    throw new Error(`Email delivery failed: ${err.message}`);
  }
};

module.exports = sendEmail;
