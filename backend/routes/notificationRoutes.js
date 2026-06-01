const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const NotificationSetting = require("../models/NotificationSetting");

const {
  getNotifications,
  markAsRead,
  markAllRead,
  deleteAllNotifications,
} = require("../controllers/notificationController");

router.get("/settings", authMiddleware, async (req, res) => {
  try {
    let settings = await NotificationSetting.findOne({ userId: req.user._id });
    if (!settings) {
      settings = await NotificationSetting.create({ userId: req.user._id });
    }
    return res.json(settings);
  } catch (err) {
    console.error("Error reading notification settings:", err);
    return res.status(500).json({ message: "Failed to retrieve preferences." });
  }
});

router.put("/settings", authMiddleware, async (req, res) => {
  try {
    const { email, emailNotifications, spending, spendingAlerts, weekly, weeklySummary } = req.body;

    const targetEmail = email !== undefined ? email : emailNotifications;
    const targetSpending = spending !== undefined ? spending : spendingAlerts;
    const targetWeekly = weekly !== undefined ? weekly : weeklySummary;

    const settings = await NotificationSetting.findOneAndUpdate(
      { userId: req.user._id },
      {
        email: targetEmail,
        spending: targetSpending,
        weekly: targetWeekly,
        emailNotifications: targetEmail,
        spendingAlerts: targetSpending,
        weeklySummary: targetWeekly
      },
      { returnDocument: 'after', upsert: true }
    );

    console.log(`[SYNC] Notification preferences saved to MongoDB.`);
    return res.json(settings);
  } catch (err) {
    console.error("Error saving notification settings:", err);
    return res.status(500).json({ message: "Failed to update configurations payload." });
  }
});



router.get("/", authMiddleware, getNotifications);
router.put("/read-all", authMiddleware, markAllRead);
router.delete("/delete-all", authMiddleware, deleteAllNotifications);

router.put("/:id", authMiddleware, markAsRead);

module.exports = router;