const express = require("express");
const { addExpense, getExpenses,updateExpense,deleteExpense } = require("../controllers/expenseControlller");
const protect = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/", protect, addExpense);
router.get("/", protect, getExpenses);
router.put("/:id", protect, updateExpense);
router.delete("/:id", protect, deleteExpense);

module.exports = router;