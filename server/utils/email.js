// utils/email.js
const nodemailer = require("nodemailer");

const {
  GMAIL_USER,
  GMAIL_APP_PASSWORD,
  EMAIL_FROM = undefined,
  EMAIL_TLS_INSECURE = "false",
} = process.env;

let transporter = null;

if (GMAIL_USER && GMAIL_APP_PASSWORD) {
  const insecure = String(EMAIL_TLS_INSECURE).toLowerCase() === "true";
  if (insecure) {
    console.warn("[email] TLS verification disabled (EMAIL_TLS_INSECURE=true). Use ONLY in local/dev.");
  }

  transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,        // STARTTLS
    secure: false,    // upgrade via STARTTLS
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    tls: insecure ? { rejectUnauthorized: false } : undefined,
  });
} else {
  console.warn("[email] Gmail transport not configured. Emails will be logged to console.");
}

async function sendEmail({ to, subject, html, text, from }) {
  if (!transporter) {
    console.log("\n--- EMAIL (dev fallback) ---");
    console.log("To:", to);
    console.log("Subject:", subject);
    if (text) console.log("Text:", text);
    if (html) console.log("HTML:", html);
    console.log("--- END EMAIL ---\n");
    return { ok: true, dev: true };
  }

  const mailOptions = {
    from: from || EMAIL_FROM || GMAIL_USER,
    to,
    subject,
    text,
    html,
  };

  await transporter.sendMail(mailOptions);
  return { ok: true };
}

module.exports = { sendEmail };