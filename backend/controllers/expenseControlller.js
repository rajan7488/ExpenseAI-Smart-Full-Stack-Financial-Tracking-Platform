// backend/controllers/expenseController.js
const Expense = require("../models/Expense");
const Budget = require("../models/Budget");
const User = require("../models/User");
const {
  createNotification,
} = require("./notificationController");
const NotificationSetting = require("../models/NotificationSetting");
const { sendSpendingAlertEmail, sendBudgetBreachAIEmail } = require("../services/emailService");
const { getGroqBudgetBreachAdvice } = require('../services/geminiService')

exports.addExpense = async (req, res) => {
  try {
    const { category, amount, description, date } = req.body;
    const userId = req.user._id;

    const expense = await Expense.create({
      userId,
      category,
      amount: Number(amount),
      description,
      date: date || new Date()
    });

    const io = req.app.get("io");

    const standardMessage = `Added ₹${Number(amount).toLocaleString()} for ${category}`;
    const baseNotification = await createNotification(userId, standardMessage);
    if (io) {
      io.to(userId.toString()).emit("notification", { notification: baseNotification });
    }

    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const monthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

      let [budgetDoc, settings, currentMonthExpenses, userProfile] = await Promise.all([
        Budget.findOne({ user: userId }),
        NotificationSetting.findOne({ userId }),
        Expense.find({
          userId,
          date: {
            $gte: new Date(currentYear, currentMonth, 1),
            $lte: new Date(currentYear, currentMonth + 1, 0, 23, 59, 59)
          }
        }),
        User.findById(userId) // 🌟 Fetch current user profile block directly
      ]);

      if (!settings) {
        settings = await NotificationSetting.create({
          userId,
          currentMonthKey: monthKey,
          sentMilestones: [],
          spendingAlerts: true,
          email: true
        });
      }

      if (settings.currentMonthKey !== monthKey) {
        settings.currentMonthKey = monthKey;
        settings.sentMilestones = [];
        await settings.save();
      }

      if (budgetDoc) {
        const monthlyBudget = budgetDoc.monthlyBudget || budgetDoc.amount || 0;
        const totalSpent = currentMonthExpenses.reduce((sum, item) => sum + Number(item.amount), 0);

        if (monthlyBudget > 0) {
          const consumptionRatio = (totalSpent / monthlyBudget) * 100;
          let structuralModifications = false;

          // Milestone filter adjustments down-line clears
          if (consumptionRatio < 80 && settings.sentMilestones.includes("80")) {
            settings.sentMilestones = settings.sentMilestones.filter(m => m !== "80");
            structuralModifications = true;
          }
          if (consumptionRatio < 95 && settings.sentMilestones.includes("95")) {
            settings.sentMilestones = settings.sentMilestones.filter(m => m !== "95");
            structuralModifications = true;
          }
          if (consumptionRatio < 100 && settings.sentMilestones.includes("100")) {
            settings.sentMilestones = settings.sentMilestones.filter(m => m !== "100");
            structuralModifications = true;
            console.log("🔓 [RESET] User dropped below 100%. Unlocked 100% milestone alert.");
          }

          if (structuralModifications) {
            await settings.save();
          }

          let targetMilestone = null;
          let milestoneMessageLabel = "";

          // Establish evaluation rules ranking targets ascending
          if (consumptionRatio >= 100) {
            targetMilestone = "100";
            milestoneMessageLabel = "🚨 BUDGET EXCEEDED CRITICAL BREACH";
          } else if (consumptionRatio >= 95) {
            targetMilestone = "95";
            milestoneMessageLabel = "🚨 CRITICAL LIMIT BREACH";
          } else if (consumptionRatio >= 80) {
            targetMilestone = "80";
            milestoneMessageLabel = "⚠️ BUDGET WARNING";
          }

          if (targetMilestone && !settings.sentMilestones.includes(targetMilestone)) {
            const isSpendingAlertEnabled = settings.spendingAlerts ?? settings.spending ?? true;
            const isEmailAlertEnabled = settings.email ?? settings.emailNotifications ?? true;

            const alertMessage = `${milestoneMessageLabel}: Heads up, ${req.user.name}! You've used ${consumptionRatio.toFixed(1)}% of your monthly budget (₹${totalSpent.toLocaleString()} spent of ₹${monthlyBudget.toLocaleString()}).`;

            if (isSpendingAlertEnabled) {
              const alertNotification = await createNotification(userId, alertMessage);
              if (io) {
                setTimeout(() => {
                  console.log(`📡 Broadcasting Socket Milestone Alert Event [${targetMilestone}%] to room: ${userId}`);
                  io.to(userId.toString()).emit("notification", { notification: alertNotification });
                }, 300);
              }
            }

            // ── 🌟 DYNAMIC ASYNCHRONOUS 100% BREACH MAIL MICROSERVICE DISPATCH TRIGGER ──
            if (targetMilestone === "100" && isEmailAlertEnabled) {
              // We dispatch this inside a background worker shell sandbox wrapper so it doesn't block client response timeouts!
              (async () => {
                try {
                  console.log("🤖 100% Breach threshold hit! Executing Groq AI analytical data mapping pipelines...");

                  // Compute localized categorical aggregate mapping matrices
                  const categoricalMap = {};
                  currentMonthExpenses.forEach(e => {
                    const cat = e.category || "Other";
                    categoricalMap[cat] = (categoricalMap[cat] || 0) + Number(e.amount || 0);
                  });

                  // Format a raw string representation map block specifically to instruct Groq LLM pipelines
                  const formattedCategoriesString = Object.entries(categoricalMap)
                    .map(([catName, sumAmt]) => ` - ${catName}: ₹${sumAmt}`)
                    .join("\n");

                  // Compile structural styled table row items matching email markup grids
                  const categoryBreakdownHTML = Object.entries(categoricalMap)
                    .map(([catName, sumAmt]) => `
                      <tr style="border-bottom: 1px solid #f8fafc;">
                        <td style="padding: 8px 0; color: #4b5563; font-weight: 500;">${catName}</td>
                        <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #111827;">₹${sumAmt.toLocaleString()}</td>
                      </tr>
                    `).join("");

                  // Fetch current user details fallback indicators securely
                  const userIncome = userProfile?.monthlyIncome || 30000;

                  // Request advice insights directly off the Llama processing modules
                  const aiAdvice = await getGroqBudgetBreachAdvice(userIncome, monthlyBudget, totalSpent, formattedCategoriesString);

                  // Dispatch finished itemized structural email template blocks downstream
                  await sendBudgetBreachAIEmail(req.user.email, req.user.name, totalSpent, monthlyBudget, categoryBreakdownHTML, aiAdvice);
                } catch (bgMailErr) {
                  console.error("Background AI breach billing notification loop failure:", bgMailErr.message);
                }
              })();
            } else if (isEmailAlertEnabled) {
              // Handle classic 80% / 95% baseline email routes cleanly
              try {
                const destinationEmail = req.user.email;
                if (destinationEmail) {
                  sendSpendingAlertEmail(destinationEmail, req.user.name, consumptionRatio, totalSpent, monthlyBudget);
                }
              } catch (innerMailingErr) {
                console.error("Mailing loop error:", innerMailingErr.message);
              }
            }

            settings.sentMilestones.push(targetMilestone);
            await settings.save();
          }
        }
      }
    } catch (apiErr) {
      console.error("Automated budget calculation tracking failure:", apiErr.message);
    }

    return res.status(201).json(expense);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
};

exports.getExpenses = async (req, res) => {
  try {
    const { month, year } = req.query;

    const filter = { userId: req.user._id };

    if (month !== undefined && year !== undefined) {
      const m = parseInt(month);
      const y = parseInt(year);
      filter.date = {
        $gte: new Date(y, m, 1),
        $lte: new Date(y, m + 1, 0, 23, 59, 59)
      };
    }

    const expenses = await Expense.find(filter).sort({ createdAt: -1 });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({
        message: "Expense not found",
      });
    }

    if (expense.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({
        message: "Not authorized",
      });
    }

    const updatedExpense = await Expense.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(updatedExpense);
  } catch (error) {
    res.status(500).json({
      message: "Server error",
    });
  }
};

exports.deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({
        message: "Expense not found",
      });
    }

    if (expense.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({
        message: "Not authorized",
      });
    }

    await expense.deleteOne();

    res.json({
      message: "Expense deleted",
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
    });
  }
};