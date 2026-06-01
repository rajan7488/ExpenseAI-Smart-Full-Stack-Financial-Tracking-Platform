const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    profileImage: {
      type: String,
      default: "",
    },
    monthlyIncome: {
      type: Number,
      default: 30000,
    },
    savingsGoal: {
      type: Number,
      default: 10000,
    },
    currency: {
      type: String,
      default: "INR",
    },
    phone: {
      type: String,
      required: true,
      default: "",
    },
    occupation: {
      type: String,
      default: "",
    },
    location: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      default: "",
    },
    twoFactorSecret: {
      type: String,
      default: null,
    },
    isTwoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    bankLinked: {
      type: Boolean,
      default: false,
    },
    consentId: {
      type: String,
      default: null,
    },
    linkedBankName: {
      type: String,
      default: "",
    },
    fiSessionId: {         // ← NEW: stores Setu FI data session ID
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);