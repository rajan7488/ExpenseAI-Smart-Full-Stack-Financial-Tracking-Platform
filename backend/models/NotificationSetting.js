const mongoose = require("mongoose");

const notificationSettingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    emailNotifications: {
      type: Boolean,
      default: true,
    },

    spendingAlerts: {
      type: Boolean,
      default: true,
    },

    weeklySummary: {
      type: Boolean,
      default: false,
    },
    sentMilestones: { type: [String], default: [] },
    currentMonthKey: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "NotificationSetting",
  notificationSettingSchema
);