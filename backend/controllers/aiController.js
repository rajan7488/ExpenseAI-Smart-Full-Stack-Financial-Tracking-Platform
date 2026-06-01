const Expense = require("../models/Expense");
const Budget = require("../models/Budget");
const User = require("../models/User");
const { getGeminiInsights } = require("../services/geminiService");

function buildFinancialSummary(expenses, income, monthlyBudget, savingsGoal) {
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  const byCategory = {};
  expenses.forEach((e) => {
    const cat = e.category || "Other";
    if (!byCategory[cat]) byCategory[cat] = { total: 0, count: 0 };
    byCategory[cat].total += Number(e.amount);
    byCategory[cat].count += 1;
  });

  const categoryRanked = Object.entries(byCategory)
    .map(([name, data]) => ({
      name,
      total: data.total,
      count: data.count,
      pct: total > 0 ? ((data.total / total) * 100).toFixed(1) : "0",
    }))
    .sort((a, b) => b.total - a.total);

  const byDay = {};
  expenses.forEach((e) => {
    const day = new Date(e.date).getDate();
    byDay[day] = (byDay[day] || 0) + Number(e.amount);
  });
  const avgDailySpend =
    Object.keys(byDay).length > 0
      ? (total / Object.keys(byDay).length).toFixed(0)
      : 0;
  const peakDay = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0];

  const budgetUsedPct =
    monthlyBudget > 0 ? ((total / monthlyBudget) * 100).toFixed(1) : null;
  const remaining = monthlyBudget > 0 ? monthlyBudget - total : null;
  const savings = income > 0 ? income - total : null;
  const savingsPct =
    income > 0 ? ((savings / income) * 100).toFixed(1) : null;
  const savingsProgress =
    savingsGoal > 0 && savings !== null
      ? ((savings / savingsGoal) * 100).toFixed(1)
      : null;

  return {
    total,
    transactionCount: expenses.length,
    byCategory: categoryRanked,
    avgDailySpend,
    peakDay: peakDay ? { day: peakDay[0], amount: peakDay[1] } : null,
    income,
    monthlyBudget,
    budgetUsedPct,
    remaining,
    savings,
    savingsPct,
    savingsGoal,
    savingsProgress,
  };
}

exports.getInsights = async (req, res) => {
  try {
    const userId = req.user.id;

    const now = new Date();
    const month = parseInt(req.query.month ?? now.getMonth(), 10);
    const year = parseInt(req.query.year ?? now.getFullYear(), 10);

    // ── Current month ──────────────────────────────────────────
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59);

    // ── 1 month ago ────────────────────────────────────────────
    const prev1Month = month === 0 ? 11 : month - 1;
    const prev1Year = month === 0 ? year - 1 : year;
    const prev1Start = new Date(prev1Year, prev1Month, 1);
    const prev1End = new Date(prev1Year, prev1Month + 1, 0, 23, 59, 59);

    // ── 2 months ago ───────────────────────────────────────────
    const prev2Month = prev1Month === 0 ? 11 : prev1Month - 1;
    const prev2Year = prev1Month === 0 ? prev1Year - 1 : prev1Year;
    const prev2Start = new Date(prev2Year, prev2Month, 1);
    const prev2End = new Date(prev2Year, prev2Month + 1, 0, 23, 59, 59);

    // ── Fetch all 3 months + user + budget in parallel ─────────
    const [user, budgetDoc, currentExpenses, prev1Expenses, prev2Expenses] =
      await Promise.all([
        User.findById(userId),
        Budget.findOne({ user: userId }),
        Expense.find({ userId, date: { $gte: startDate, $lte: endDate } }),
        Expense.find({ userId, date: { $gte: prev1Start, $lte: prev1End } }),
        Expense.find({ userId, date: { $gte: prev2Start, $lte: prev2End } }),
      ]);

    if (!user) return res.status(404).json({ message: "User not found" });

    const income = Number(user.monthlyIncome) || 0;
    const savingsGoal = Number(user.savingsGoal) || 0;
    const budget = budgetDoc ? Number(budgetDoc.monthlyBudget) : 0;

    // ── Build summaries ────────────────────────────────────────
    const current = buildFinancialSummary(currentExpenses, income, budget, savingsGoal);
    const prev1 = buildFinancialSummary(prev1Expenses, income, budget, savingsGoal);
    const prev2 = buildFinancialSummary(prev2Expenses, income, budget, savingsGoal);

    // ── Month-over-month trend ─────────────────────────────────
    const monthTrendPct =
      prev1.total > 0
        ? (((current.total - prev1.total) / prev1.total) * 100).toFixed(1)
        : null;

    // ── Category comparison: current vs prev1 ─────────────────
    const prev1CatMap = {};
    prev1.byCategory.forEach((c) => { prev1CatMap[c.name] = c.total; });

    const categoryComparison = current.byCategory.map((c) => {
      const prevAmt = prev1CatMap[c.name] || 0;
      const changePct =
        prevAmt > 0
          ? (((c.total - prevAmt) / prevAmt) * 100).toFixed(1)
          : null;
      return { ...c, prevTotal: prevAmt, changePct };
    });

    // ── 3-month trend per category (for better predictions) ────
    const prev2CatMap = {};
    prev2.byCategory.forEach((c) => { prev2CatMap[c.name] = c.total; });

    const allCategoryNames = [
      ...new Set([
        ...current.byCategory.map(c => c.name),
        ...prev1.byCategory.map(c => c.name),
        ...prev2.byCategory.map(c => c.name),
      ])
    ];

    const categoryTrend3Months = allCategoryNames.map((name) => ({
      category: name,
      twoMonthsAgo: prev2CatMap[name] || 0,
      lastMonth: prev1CatMap[name] || 0,
      currentMonth: current.byCategory.find(c => c.name === name)?.total || 0,
    }));

    // ── Build context package for Groq ─────────────────────────
    const contextPackage = {
      userId,
      period: {
        month: startDate.toLocaleString("default", { month: "long" }),
        year,
      },
      current: {
        ...current,
        byCategory: categoryComparison,
      },
      // ✅ Full previous month data (not just totals)
      previous: {
        total: prev1.total,
        transactionCount: prev1.transactionCount,
        byCategory: prev1.byCategory,       // full category breakdown
        avgDailySpend: prev1.avgDailySpend,
        savings: prev1.savings,
        budgetUsedPct: prev1.budgetUsedPct,
      },
      // ✅ NEW: 2 months ago full data
      twoMonthsAgo: {
        total: prev2.total,
        transactionCount: prev2.transactionCount,
        byCategory: prev2.byCategory,       // full category breakdown
        avgDailySpend: prev2.avgDailySpend,
        savings: prev2.savings,
        budgetUsedPct: prev2.budgetUsedPct,
      },
      // ✅ NEW: 3-month trend per category — key for accurate predictions
      categoryTrend3Months,
      monthTrendPct,
    };

    const insights = await getGeminiInsights(contextPackage);

    res.json({
      recommendations: insights.recommendations,
      predictions: insights.predictions,
      habitSummary: insights.habitSummary,
      alerts: insights.alerts,
      confidenceScore: insights.confidenceScore,
      healthScore: insights.healthScore,
      metrics: {
        total: current.total,
        income,
        budget,
        remaining: current.remaining,
        savings: current.savings,
        savingsGoal,
        savingsProgress: current.savingsProgress,
        budgetUsedPct: current.budgetUsedPct,
        monthTrendPct,
      },
    });
  } catch (err) {
    console.error("AI INSIGHTS ERROR:", err);
    res.status(500).json({ message: "Failed to generate AI insights" });
  }
};

exports.parseExpenseText = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.trim() === "") {
      return res.status(400).json({ message: "No text provided." });
    }

    let amount = 0;
    let category = "Other";
    let description = text;

    const amountMatch = text.match(/\d+/);
    if (amountMatch) amount = Number(amountMatch[0]);

    let cleanDesc = text
      .replace(/paid|spent|added|for/gi, "")
      .replace(/\d+/g, "")
      .trim();
    if (cleanDesc) {
      description = cleanDesc.charAt(0).toUpperCase() + cleanDesc.slice(1);
    }

    const t = text.toLowerCase();
    if (["pizza", "food", "burger", "zomato", "swiggy", "dinner", "cafe", "lunch", "breakfast", "restaurant"].some(k => t.includes(k))) {
      category = "Food & Dining";
    } else if (["movie", "netflix", "game", "ticket", "pub", "concert", "spotify"].some(k => t.includes(k))) {
      category = "Entertainment";
    } else if (["rent", "electricity", "bill", "recharge", "water", "wifi", "internet", "gas"].some(k => t.includes(k))) {
      category = "Bills & Utilities";
    } else if (["uber", "ola", "petrol", "metro", "cab", "bus", "auto", "train", "flight"].some(k => t.includes(k))) {
      category = "Transportation";
    } else if (["shirt", "clothes", "amazon", "myntra", "shoes", "shopping", "flipkart"].some(k => t.includes(k))) {
      category = "Shopping";
    } else if (["doctor", "medicine", "pharmacy", "hospital", "health", "gym"].some(k => t.includes(k))) {
      category = "Healthcare";
    } else if (["course", "book", "school", "college", "tuition", "udemy"].some(k => t.includes(k))) {
      category = "Education";
    }

    return res.status(200).json({ amount, category, description });
  } catch (error) {
    console.error("SMARTADD PARSE ERROR:", error);
    return res.status(500).json({ message: "Failed to parse text." });
  }
};