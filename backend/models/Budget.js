const mongoose = require("mongoose");

const budgetSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    monthlyBudget: {
      type: Number,
      default: 15000,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Budget", budgetSchema);