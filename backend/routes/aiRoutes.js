const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  getInsights,parseExpenseText
} = require("../controllers/aiController");


router.get(
  "/insights",
  authMiddleware,
  getInsights
);
router.post("/parse", authMiddleware, parseExpenseText);
module.exports = router;