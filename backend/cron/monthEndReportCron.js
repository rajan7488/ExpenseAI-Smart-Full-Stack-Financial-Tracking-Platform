const cron = require("node-cron");
const User = require("../models/User");
const Expense = require("../models/Expense");
const Budget = require("../models/Budget");
const NotificationSetting = require("../models/NotificationSetting");
const { sendMonthlySummaryEmail } = require("../services/emailService");

cron.schedule("30 23 28-31 * *", async () => {
  const now = new Date();

  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (tomorrow.getMonth() === now.getMonth()) {
    return;
  }

  console.log("📊 Automated Job Triggered: Compiling Finalized Monthly Closing Statements...");
  try {
    const users = await User.find({});
    for (const user of users) {
      const settings = await NotificationSetting.findOne({ userId: user._id });
      const cleanSettings = settings ? settings.toObject() : {};
      const isEmailEnabled = cleanSettings.email === true || cleanSettings.emailNotifications === true;
      if (!isEmailEnabled) continue;
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      const [budgetDoc, monthlyExpenses] = await Promise.all([
        Budget.findOne({ user: user._id }),
        Expense.find({
          userId: user._id,
          date: {
            $gte: new Date(currentYear, currentMonth, 1),
            $lte: new Date(currentYear, currentMonth + 1, 0, 23, 59, 59)
          }
        })
      ]);

      const totalSpent = monthlyExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
      const income = Number(user.monthlyIncome) || 0;
      const savings = Math.max(0, income - totalSpent);
      const budgetLimit = budgetDoc ? (budgetDoc.monthlyBudget || budgetDoc.amount || 0) : 0;

      const monthName = now.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

      if (user.email) {
        await sendMonthlySummaryEmail(
          user.email,
          user.name,
          totalSpent,
          budgetLimit,
          savings,
          monthName
        );
      }
    }
  } catch (error) {
    console.error("🚨 Automated month-end ledger execution report fault:", error);
  }
});