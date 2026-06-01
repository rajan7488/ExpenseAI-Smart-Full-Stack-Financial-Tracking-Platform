const express = require("express");
const router = express.Router();
const bankController = require("../controllers/bankController");
const protect = require("../middleware/authMiddleware"); // Adjust this file path path to match your auth guard name

// Secure path trigger to fetch consent tokens
router.post("/request-consent", protect, bankController.initiateConsent);

// PUBLIC SERVER WEBHOOK CHANNEL: Open to gateway pings without client token requirements
router.post("/webhook", bankController.handleBankWebhookCallback);

module.exports = router;