// backend/models/MonthlyReport.js
const mongoose = require("mongoose");

const monthlyReportSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    monthKey: {
      type: String,
      required: true,
    },
    incomeSnapshot: {
      type: Number,
      default: 0,
    },
    savingsGoalSnapshot: {
      type: Number,
      default: 0,
    },
    totalSpent: {
      type: Number,
      default: 0,
    },
    totalSaved: {
      type: Number,
      default: 0,
    },
    totalTransactions: {
      type: Number,
      default: 0,
    }
  },
  { timestamps: true }
);

monthlyReportSchema.index({ user: 1, monthKey: 1 }, { unique: true });

module.exports = mongoose.model("MonthlyReport", monthlyReportSchema);