const Groq = require("groq-sdk");

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
const cache = new Map();
const failedAt = new Map();

const CACHE_DURATION = 10 * 60 * 1000;
const RETRY_AFTER = 30 * 60 * 1000;

function buildPrompt(ctx) {
  const {
    period,
    current: c,
    previous,
    twoMonthsAgo,
    categoryTrend3Months = [],
    monthTrendPct,
  } = ctx;

  const categoryLines = c.byCategory
    .map((cat) => {
      const vs =
        cat.changePct !== null
          ? ` | vs last month: ${cat.changePct > 0 ? "+" : ""}${cat.changePct}%`
          : " | no prior data";
      return `  • ${cat.name}: ₹${cat.total} (${cat.pct}% of total, ${cat.count} txns${vs})`;
    })
    .join("\n");

  const trendLine =
    monthTrendPct !== null
      ? `Spending vs last month (₹${previous.total}): ${monthTrendPct > 0 ? "+" : ""}${monthTrendPct}%`
      : "No previous month data for comparison.";

  const prev1CategoryLines =
    previous.byCategory?.length > 0
      ? previous.byCategory
        .map((c) => `  • ${c.name}: ₹${c.total} (${c.count} txns)`)
        .join("\n")
      : "  No data.";

  const prev2CategoryLines =
    twoMonthsAgo?.byCategory?.length > 0
      ? twoMonthsAgo.byCategory
        .map((c) => `  • ${c.name}: ₹${c.total} (${c.count} txns)`)
        .join("\n")
      : "  No data.";

  const trendLines =
    categoryTrend3Months.length > 0
      ? categoryTrend3Months
        .map(
          (t) =>
            `  • ${t.category}: ₹${t.twoMonthsAgo} → ₹${t.lastMonth} → ₹${t.currentMonth} (2mo ago → last mo → now)`
        )
        .join("\n")
      : "  No trend data yet.";

  const budgetLine =
    c.monthlyBudget > 0
      ? `Monthly budget: ₹${c.monthlyBudget} | Used: ${c.budgetUsedPct}% | Remaining: ₹${c.remaining}`
      : "No monthly budget set.";

  const incomeLine =
    c.income > 0
      ? `Monthly income: ₹${c.income} | Savings: ₹${c.savings} (${c.savingsPct}% of income)`
      : "Income not configured.";

  const savingsLine =
    c.savingsGoal > 0
      ? `Savings goal: ₹${c.savingsGoal} | Progress: ${c.savingsProgress}%`
      : "No savings goal set.";

  const peakLine = c.peakDay
    ? `Highest spend day: Day ${c.peakDay.day} — ₹${c.peakDay.amount}`
    : "";

  return `You are a friendly personal finance assistant for an everyday Indian user (not a finance expert).
Analyze the data below for ${period.month} ${period.year}.

=== THIS MONTH ===
Total spent: ₹${c.total} across ${c.transactionCount} transactions
${trendLine}
${budgetLine}
${incomeLine}
${savingsLine}
Avg daily spend: ₹${c.avgDailySpend}
${peakLine}

Spending by category (this month):
${categoryLines}

=== LAST MONTH ===
Total: ₹${previous.total} across ${previous.transactionCount} transactions
Avg daily spend: ₹${previous.avgDailySpend || "N/A"}
Budget used: ${previous.budgetUsedPct || "N/A"}%
Savings: ₹${previous.savings || "N/A"}
Categories:
${prev1CategoryLines}

=== TWO MONTHS AGO ===
Total: ₹${twoMonthsAgo?.total || 0} across ${twoMonthsAgo?.transactionCount || 0} transactions
Avg daily spend: ₹${twoMonthsAgo?.avgDailySpend || "N/A"}
Budget used: ${twoMonthsAgo?.budgetUsedPct || "N/A"}%
Categories:
${prev2CategoryLines}

=== 3-MONTH CATEGORY TREND (use this for predictions) ===
${trendLines}

=== RULES ===
- Write like a helpful friend, NOT a robot or banker
- Use simple everyday language, relatable Indian context
- Every insight MUST reference actual ₹ amounts from the data
- Max 35 words per message — short, punchy, actionable
- Always tell the user WHAT to do, not just what happened
- Use Indian context naturally (Zomato, Swiggy, UPI, EMI, SIP, Amazon, Flipkart)
- Use 1 emoji per message naturally
- For predictions: ALWAYS return predictions for every category in categoryTrend3Months,
  even if currentMonth is 0. Use the 3-month trend to extrapolate.
  If currentMonth is 0, use lastMonth as baseline. Never return empty predictions {}.
- confidenceScore: 0-100 based on data available (more months + transactions = higher)
- healthScore: 0-100 based on savings rate, budget adherence, spending trends
- habitSummary: one friendly sentence about spending personality with specific numbers
- alerts: 2-6 specific alerts, each with a clear action the user can take TODAY


Return ONLY a valid JSON object, no markdown:
{
  "recommendations": [
    { "type": "warning|tip|success|prediction", "message": "friendly insight with rupee amounts and clear action" },
    { "type": "warning|tip|success|prediction", "message": "friendly insight with rupee amounts and clear action" },
    { "type": "warning|tip|success|prediction", "message": "friendly insight with rupee amounts and clear action" },
    { "type": "warning|tip|success|prediction", "message": "friendly insight with rupee amounts and clear action" }
  ],
  "predictions": {
    "CategoryName": <number>,
    "CategoryName": <number>
  },
  "habitSummary": "friendly one sentence about spending personality with specific numbers",
  "alerts": [
    { "type": "critical|warning|mild|success", "msg": "specific alert with rupee amounts or %", "sub": "one clear action to take today" }
  ],
  "confidenceScore": <0-100>,
  "healthScore": <0-100>
}`;
}

const getGeminiInsights = async (contextPackage) => {
  const { period } = contextPackage;
  const userId = contextPackage.userId || "default";
  const cacheKey = `${userId}_${period.year}_${period.month}`;

  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
  }

  if (failedAt.has(cacheKey)) {
    const timeSinceFail = Date.now() - failedAt.get(cacheKey);
    if (timeSinceFail < RETRY_AFTER) {
      const minsLeft = Math.ceil((RETRY_AFTER - timeSinceFail) / 60000);
      return {
        recommendations: [
          {
            type: "tip",
            message: `⏳ AI insights cooling down. Retry in ${minsLeft} minutes.`,
          },
        ],
        predictions: {},
        habitSummary: null,
        alerts: [],
        confidenceScore: null,
        healthScore: null,
      };
    }
  }

  try {
    const prompt = buildPrompt(contextPackage);

    const response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "You are a friendly financial assistant for everyday Indian users. Return ONLY a valid JSON object with keys: recommendations, predictions, habitSummary, alerts, confidenceScore, healthScore. No markdown, no prose, no extra text.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 1200,
      temperature: 0.4,
    });

    const raw = response.choices[0].message.content.trim();

    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    const validTypes = ["warning", "tip", "success", "prediction"];
    const validAlertTypes = ["critical", "warning", "mild", "success"];

    const rawRecs = Array.isArray(parsed)
      ? parsed
      : parsed.recommendations || [];
    const rawPreds = parsed.predictions || {};
    const rawAlerts = parsed.alerts || [];

    const recommendations = rawRecs
      .filter((i) => i.type && i.message)
      .map((i) => ({
        type: validTypes.includes(i.type) ? i.type : "tip",
        message: String(i.message),
      }));

    const predictions = {};
    Object.entries(rawPreds).forEach(([cat, amt]) => {
      const n = Number(amt);
      if (cat && n > 0) predictions[cat] = n;
    });

    const alerts = rawAlerts
      .filter((a) => a.type && a.msg)
      .map((a) => ({
        type: validAlertTypes.includes(a.type) ? a.type : "warning",
        msg: String(a.msg),
        sub: a.sub ? String(a.sub) : null,
      }));

    const confidenceScore =
      typeof parsed.confidenceScore === "number"
        ? Math.min(100, Math.max(0, Math.round(parsed.confidenceScore)))
        : null;

    const healthScore =
      typeof parsed.healthScore === "number"
        ? Math.min(100, Math.max(0, Math.round(parsed.healthScore)))
        : null;

    const habitSummary =
      typeof parsed.habitSummary === "string" ? parsed.habitSummary : null;

    const result = {
      recommendations,
      predictions,
      habitSummary,
      alerts,
      confidenceScore,
      healthScore,
    };

    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    failedAt.delete(cacheKey);
    return result;

  } catch (err) {
    failedAt.set(cacheKey, Date.now());
    console.error("❌ Groq error:", err.message);
    return {
      recommendations: [
        {
          type: "tip",
          message:
            "💡 Add more expenses this month to unlock AI-powered insights.",
        },
      ],
      predictions: {},
      habitSummary: null,
      alerts: [],
      confidenceScore: null,
      healthScore: null,
    };
  }
};

const getGroqBudgetBreachAdvice = async (income, budget, totalSpent, formattedCategoriesString) => {
  try {
    const response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "You are a friendly but firm personal finance coach for an everyday Indian user who just crossed 100% of their monthly budget. Write in simple, plain English. No markdown, no bold stars (**), no JSON. Keep it under 100 words. Be warm but direct.",
        },
        {
          role: "user",
          content: `
Monthly Income: ₹${income}
Budget Limit: ₹${budget}
Total Spent: ₹${totalSpent}
Category Breakdown:
${formattedCategoriesString}

Give advice on:
1. WHERE they overspent and what to stop immediately (mention specific Indian apps/services like Zomato, Swiggy, OTT, UPI spends)
2. What budget they should realistically set based on their income to avoid this next month
Keep it friendly, specific, and actionable.
          `,
        },
      ],
      max_tokens: 400,
      temperature: 0.5,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("Groq Budget Breach Advice error:", error.message);
    return "⚠️ You've crossed your monthly budget! Try pausing Zomato, Swiggy orders and any OTT subscriptions you rarely use. Consider increasing your budget limit to match your actual spending pattern.";
  }
};

module.exports = { getGeminiInsights, getGroqBudgetBreachAdvice };