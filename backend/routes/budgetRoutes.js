const express = require("express");
const { getBudget, updateBudget } =require("../controllers/budgetController.js");
const authMiddleware =require("../middleware/authMiddleware.js");

const router = express.Router();

router.get("/", authMiddleware, getBudget);
router.put("/", authMiddleware, updateBudget);

module.exports = router;