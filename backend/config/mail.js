// backend/config/mail.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail", 
  auth: {
    user: process.env.EMAIL_USER, // Your Gmail address (e.g., rkumar...@gmail.com)
    pass: process.env.EMAIL_PASS, // Your Gmail App Password (not your main login password)
  },
});

module.exports = transporter;