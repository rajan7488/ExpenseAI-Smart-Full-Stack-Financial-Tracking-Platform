const express = require("express");

const router = express.Router();

const upload = require("../middleware/uploadMiddleware");

const {
  scanReceipt,
} = require("../controllers/ocrController");

router.post(
  "/scan",
  upload.single("receipt"),
  scanReceipt
);

module.exports = router;