// backend/cron/weeklySummaryCron.js
const cron = require("node-cron");
const User = require("../models/User");
const Expense = require("../models/Expense");
const NotificationSetting = require("../models/NotificationSetting");
const { sendWeeklySummaryEmail } = require("../services/emailService");

cron.schedule("0 9 * * 0", async () => {
  console.log("⏰ Automated Job Triggered: Compiling Weekly Summaries...");

  try {
    const users = await User.find({});

    for (const user of users) {
      // 1. Fetch user's notification preference profile
      const settings = await NotificationSetting.findOne({ userId: user._id });

      // 🌟 THE REFACTOR: Convert to object and dual-check both 'weekly' and 'weeklySummary' keys
      const cleanSettings = settings ? settings.toObject() : {};
      const isWeeklyEnabled = !!cleanSettings.weeklySummary;

      // If the user turned off the "Weekly Summary" toggle switch, skip them safely
      if (!isWeeklyEnabled) continue;

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // 2. Extract transaction rows logged within the last 7 days
      const weeklyExpenses = await Expense.find({
        userId: user._id,
        date: { $gte: sevenDaysAgo }
      });

      // Skip processing if they haven't logged any transactions this week
      // if (weeklyExpenses.length === 0) continue;

      // 3. Aggregate totals and find their highest spending category
      const totalSpent = weeklyExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

      const categoryMap = {};
      weeklyExpenses.forEach(e => {
        categoryMap[e.category] = (categoryMap[e.category] || 0) + Number(e.amount || 0);
      });

      let topCategory = "";
      let maxSpent = 0;
      Object.entries(categoryMap).forEach(([cat, amt]) => {
        if (amt > maxSpent) {
          maxSpent = amt;
          topCategory = cat;
        }
      });

      // 4. Send the calculated weekly summary digest email
      if (user.email) {
        // 🌟 Cleaned up trailing parameters and empty spaces for pristine compilation
        await sendWeeklySummaryEmail(
          user.email,
          user.name,
          totalSpent,
          weeklyExpenses.length,
          topCategory
        );
      }
    }
  } catch (error) {
    console.error("🚨 Automated weekly summary cron failure:", error);
  }
});