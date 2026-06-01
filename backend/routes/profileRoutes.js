const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const {
  getProfile,
  updateProfile,
  getNotificationSettings,
  saveNotificationSettings,
  getMonthlyHistory,
  syncCurrentMonthReport,
  deleteAccountPermanently
} = require("../controllers/profileController");

const {
  changePassword,
  setupTwoFactor,
  verifyTwoFactor
} = require("../controllers/profileController");

router.get("/", authMiddleware, getProfile);
router.put("/", authMiddleware, updateProfile);
router.delete("/purge-account", authMiddleware, deleteAccountPermanently);

router.get("/notifications/settings", authMiddleware, getNotificationSettings);
router.post("/notifications/settings", authMiddleware, saveNotificationSettings);

router.get("/history", authMiddleware, getMonthlyHistory);
router.post("/sync-month", authMiddleware, syncCurrentMonthReport);

router.put("/security/change-password", authMiddleware, changePassword);
router.post("/security/2fa/setup", authMiddleware, setupTwoFactor);
router.post("/security/2fa/verify", authMiddleware, verifyTwoFactor);

module.exports = router;