const User = require("../models/User");
const MonthlyReport = require("../models/MonthlyReport");
const Expense = require("../models/Expense");
const NotificationSetting = require("../models/NotificationSetting");
const Budget = require("../models/Budget");
const Notification = require("../models/Notification");
const bcrypt = require("bcryptjs");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");

exports.getProfile = async (req, res) => {
  try {

    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");

    const [user, settings] = await Promise.all([
      User.findById(req.user.id).select("-password"),
      NotificationSetting.findOne({ userId: req.user.id }).lean()
    ]);

    if (!user) return res.status(404).json({ message: "User not found" });

    const responseData = user.toObject();
    responseData.notifications = settings ? {
      email: settings.emailNotifications,
      spending: settings.spendingAlerts,
      weekly: settings.weeklySummary
    } : { email: true, spending: true, weekly: false };

    res.json(responseData);
    console.log("PROFILE NOTIFICATION SETTINGS:", responseData.notifications);
  } catch (err) {
    console.error("GET PROFILE ERROR:", err);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
};


exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.name = req.body.name || user.name;
    user.currency = req.body.currency || user.currency;
    user.profileImage = req.body.profileImage || user.profileImage;
    user.location = req.body.location !== undefined ? req.body.location : user.location;
    user.occupation = req.body.occupation !== undefined ? req.body.occupation : user.occupation;
    user.bio = req.body.bio !== undefined ? req.body.bio : user.bio;
    user.phone = req.body.phone !== undefined ? req.body.phone : user.phone;

    const incomingIncome = req.body.monthlyIncome !== undefined ? req.body.monthlyIncome : req.body.income;
    if (incomingIncome !== undefined && incomingIncome !== "") {
      const parsed = Number(incomingIncome);
      if (!isNaN(parsed)) user.monthlyIncome = parsed;
    }
    if (req.body.savingsGoal !== undefined && req.body.savingsGoal !== "") {
      const parsed = Number(req.body.savingsGoal);
      if (!isNaN(parsed)) user.savingsGoal = parsed;
    }

    const updated = await user.save();
    const responseData = updated.toObject();
    delete responseData.password;

    let currentSettings = null;
    if (req.body.notifications) {
      currentSettings = await NotificationSetting.findOneAndUpdate(
        { userId: req.user.id },
        {
          emailNotifications: req.body.notifications.email,
          spendingAlerts: req.body.notifications.spending,
          weeklySummary: req.body.notifications.weekly
        },
        { returnDocument: "after", upsert: true }
      );
    } else {
      currentSettings = await NotificationSetting.findOne({ userId: req.user.id });
    }

    responseData.notifications = currentSettings ? {
      email: currentSettings.emailNotifications,
      spending: currentSettings.spendingAlerts,
      weekly: currentSettings.weeklySummary
    } : { email: true, spending: true, weekly: false };

    res.json(responseData);
  } catch (err) {
    console.error("UPDATE PROFILE ERROR:", err);
    res.status(500).json({ message: "Profile update failed" });
  }
};

exports.deleteAccountPermanently = async (req, res) => {
  try {
    const userId = req.user._id;
    await Promise.all([
      Expense.deleteMany({ userId }),
      Budget.deleteMany({ user: userId }),
      NotificationSetting.deleteMany({ userId }),
      Notification.deleteMany({ userId }),
      User.findByIdAndDelete(userId)
    ]);

    console.log(`✅ Account and all associated financial documents for user ${userId} completely purged from MongoDB.`);

    res.status(200).json({ message: "Account deleted permanently." });
  } catch (error) {
    console.error("CRITICAL ERROR DURING ACCOUNT PURGE:", error);
    res.status(500).json({ message: "Server failed to complete permanent account deletion cascade." });
  }
};

exports.getNotificationSettings = async (req, res) => {
  try {
    const settings = await NotificationSetting.findOne({
      userId: req.user.id
    }).lean();
    if (!settings) {
      return res.json({ emailNotifications: true, spendingAlerts: true, weeklySummary: false });
    }
    res.json(settings);
  } catch (err) {
    console.error("GET NOTIFICATION SETTINGS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch notification settings" });
  }
};

exports.saveNotificationSettings = async (req, res) => {
  try {
    const { emailNotifications, spendingAlerts, weeklySummary } = req.body;

    const settings = await NotificationSetting.findOneAndUpdate(
      { userId: req.user.id },
      {
        emailNotifications: emailNotifications ?? true,
        spendingAlerts: spendingAlerts ?? true,
        weeklySummary: weeklySummary ?? false,
      },
      { returnDocument: "after", upsert: true }
    );
    res.json({ message: "Settings saved ✅", settings });
  } catch (err) {
    console.error("SAVE NOTIFICATION SETTINGS ERROR:", err);
    res.status(500).json({ message: "Failed to save notification settings" });
  }
};

exports.getMonthlyHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const userData = await User.findById(userId);
    const userIncome = userData?.monthlyIncome || 150000;
    const userGoal = userData?.savingsGoal || 20000;

    const allExpenses = await Expense.find({ userId }).lean();

    const monthsWithData = new Set();
    allExpenses.forEach(exp => {
      if (exp.date) {
        const d = new Date(exp.date);
        if (!isNaN(d.getTime())) {
          monthsWithData.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
        }
      }
    });

    if (userData?.createdAt) {
      const j = new Date(userData.createdAt);
      monthsWithData.add(`${j.getFullYear()}-${String(j.getMonth() + 1).padStart(2, "0")}`);
    }
    monthsWithData.add(`${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`);

    for (const mKey of monthsWithData) {
      const [year, monthStr] = mKey.split("-");
      const targetYear = parseInt(year);
      const targetMonth = parseInt(monthStr) - 1;

      const monthExpenses = allExpenses.filter(exp => {
        if (!exp.date) return false;
        const d = new Date(exp.date);
        return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
      });

      const totalSpent = monthExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
      const totalTransactions = monthExpenses.length;
      const totalSaved = Math.max(0, userIncome - totalSpent);

      await MonthlyReport.findOneAndUpdate(
        { user: userId, monthKey: mKey },
        { incomeSnapshot: userIncome, savingsGoalSnapshot: userGoal, totalSpent, totalSaved, totalTransactions },
        { upsert: true }
      );
    }

    const ledgerList = await MonthlyReport.find({ user: userId }).sort({ monthKey: -1 });
    res.json(ledgerList);
  } catch (err) {
    console.error("Error compiling ledger:", err);
    res.status(500).json({ message: "Could not fetch monthly history." });
  }
};

exports.syncCurrentMonthReport = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const monthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;

    const userData = await User.findById(userId);
    if (!userData) return res.status(404).json({ message: "User not found" });

    const allExpenses = await Expense.find({ userId }).lean();
    const currentMonthExpenses = allExpenses.filter(item => {
      if (!item.date) return false;
      const d = new Date(item.date);
      if (isNaN(d.getTime())) return false;
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });

    const totalSpent = currentMonthExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const incomeSnapshot = userData.monthlyIncome || 0;
    const savingsGoalSnapshot = userData.savingsGoal || 0;
    const totalSaved = Math.max(0, incomeSnapshot - totalSpent);
    const totalTransactions = currentMonthExpenses.length;

    console.log(`[SYNC] ${userData.name} | ${monthKey} | txns: ${totalTransactions} | spent: ₹${totalSpent}`);

    const report = await MonthlyReport.findOneAndUpdate(
      { user: userId, monthKey },
      { incomeSnapshot, savingsGoalSnapshot, totalSpent, totalSaved, totalTransactions },
      { upsert: true, returnDocument: "after" }
    );

    res.json({ message: "Sync complete ✅", report });
  } catch (err) {
    console.error("Sync error:", err);
    res.status(500).json({ message: "Failed to sync current month." });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Both current and new passwords are required." });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: "Incorrect current password." });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    console.log(`[SECURITY] Password changed successfully for user: ${userId}`);
    return res.status(200).json({ message: "Password updated successfully ✅" });
  } catch (err) {
    console.error("CHANGE PASSWORD FAULT:", err);
    return res.status(500).json({ message: "Server failure modifying credential matrix." });
  }
};

exports.setupTwoFactor = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    const secret = speakeasy.generateSecret({
      name: `ExpenseAI:${user.email}`,
    });

    user.twoFactorSecret = secret.base32;
    await user.save();

    const dataUrl = await QRCode.toDataURL(secret.otpauth_url);

    return res.status(200).json({
      qrCodeDataUrl: dataUrl,
      secretCode: secret.base32,
      isEnabled: user.isTwoFactorEnabled
    });
  } catch (err) {
    console.error("2FA SETUP FAULT:", err);
    return res.status(500).json({ message: "Server failed to compile crypto verification secrets." });
  }
};

exports.verifyTwoFactor = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { token, action } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    // Verify time-synced verification token block window frames
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token,
      window: 1,
    });

    if (!verified) {
      return res.status(400).json({ message: "Invalid verification code. Check your authenticator app." });
    }

    if (action === "disable") {
      user.isTwoFactorEnabled = false;
      user.twoFactorSecret = null;
      await user.save();
      return res.status(200).json({ isTwoFactorEnabled: false, message: "Two-factor authentication deactivated 🔓" });
    } else {
      user.isTwoFactorEnabled = true;
      await user.save();
      return res.status(200).json({ isTwoFactorEnabled: true, message: "Two-factor authentication fully active! 🛡️" });
    }
  } catch (err) {
    console.error("2FA CODES VERIFICATION FAULT:", err);
    return res.status(500).json({ message: "Server broken processing confirmation code hashes." });
  }
};