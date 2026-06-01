const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const speakeasy = require("speakeasy");
const NotificationSetting = require("../models/NotificationSetting");
const { sendWelcomeEmail } = require("../services/emailService");

// ── Generate JWT Token ──
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

// 📝 REGISTER USER
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
    });

    // Create default notification settings
    await NotificationSetting.create({
      userId: user._id,
      email: true,
      emailNotifications: true,
      spending: true,
      weekly: false,
    });
    console.log(`⚙️ Default notification settings initialized for user: ${user._id}`);

    // Send welcome email
    if (user.email) {
      sendWelcomeEmail(user.email, user.name);
    }

    const token = generateToken(user._id);

    return res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      profileImage: user.profileImage || "👤",
      createdAt: user.createdAt,
      token,
    });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    return res.status(500).json({ message: "Registration failed on server" });
  }
};

// 🔑 LOGIN USER
exports.loginUser = async (req, res) => {
  try {
    const { email, password, twoFactorToken } = req.body;

    // 1. Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // 2. Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // 3. Check 2FA if enabled
    if (user.isTwoFactorEnabled) {
      if (!twoFactorToken) {
        return res.status(200).json({
          twoFactorRequired: true,
          userId: user._id,
          message: "Two-factor authentication code required. 🛡️",
        });
      }

      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: "base32",
        token: twoFactorToken,
        window: 1,
      });

      if (!verified) {
        return res.status(400).json({ message: "Invalid 2FA verification code." });
      }
    }

    // 4. Generate token and respond
    const token = generateToken(user._id);

    return res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      profileImage: user.profileImage || "👤",
      token,
    });

  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({ message: "Server error during login." });
  }
};