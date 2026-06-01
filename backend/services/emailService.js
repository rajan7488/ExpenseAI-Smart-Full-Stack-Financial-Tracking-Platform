const transporter = require("../config/mail");

/**
 *  1. SEND SPENDING ALERT EMAIL INSTANTLY
 * Triggers when monthly budget consumption passes the 80% threshold line
 */
exports.sendSpendingAlertEmail = async (email, name, consumptionRatio, totalSpent, budget) => {
  try {
    const remainingBudget = Math.max(0, budget - totalSpent);
    const safeName = name ? name.split(" ")[0] : "there";

    const mailOptions = {
      from: `"ExpenseAI" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "🚨 Budget Alert: 80% Threshold Reached!",
      html: `
        <div style="font-family: 'DM Sans', sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #f1f5f9; border-radius: 20px; background-color: #ffffff;">
          <h2 style="color: #6366f1; font-size: 20px;">Heads up, ${safeName}!</h2>
          <p style="color: #374151; font-size: 14px; line-height: 1.6;">
            You have consumed <strong>${consumptionRatio.toFixed(1)}%</strong> of your monthly budget.
          </p>
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 12px; margin: 15px 0;">
            <p style="margin: 0; font-size: 13px; color: #6b7280;">Monthly Budget: <strong>₹${budget.toLocaleString()}</strong></p>
            <p style="margin: 6px 0 0; font-size: 13px; color: #ef4444;">Total Spent: <strong>₹${totalSpent.toLocaleString()}</strong></p>
            <p style="margin: 6px 0 0; font-size: 13px; color: #10b981;">Remaining Budget: <strong>₹${remainingBudget.toLocaleString()}</strong></p>
          </div>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 20px; border-top: 1px solid #f1f5f9; padding-top: 10px;">
            Let's keep an eye on things in the coming days to stay on track! 💸
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✉️ Spending alert email sent successfully to ${email}`);
  } catch (err) {
    console.error("Failed to send spending alert email:", err.message);
  }
};

exports.sendWeeklySummaryEmail = async (email, name, totalSpent, transactionsCount, topCategory) => {
  try {
    const safeName = name ? name.split(" ")[0] : "there";

    const mailOptions = {
      from: `"ExpenseAI Weekly" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "📊 Your Weekly Financial Digest",
      html: `
        <div style="font-family: 'DM Sans', sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #f1f5f9; border-radius: 20px; background-color: #ffffff;">
          <h2 style="color: #8b5cf6; font-size: 20px;">Your Weekly Summary, ${safeName} 🎯</h2>
          <p style="color: #374151; font-size: 14px;">Here is your financial breakdown for the past 7 days:</p>
          
          <div style="display: grid; gap: 10px; margin: 15px 0;">
            <div style="background-color: #f8fafc; padding: 12px; border-radius: 12px; border: 1px solid #f1f5f9;">
              <span style="font-size: 12px; color: #6b7280;">Total Spent This Week</span>
              <p style="margin: 4px 0 0; font-size: 18px; font-weight: bold; color: #111827;">₹${totalSpent.toLocaleString()}</p>
            </div>
            <div style="background-color: #f8fafc; padding: 12px; border-radius: 12px; border: 1px solid #f1f5f9;">
              <span style="font-size: 12px; color: #6b7280;">Logged Transactions</span>
              <p style="margin: 4px 0 0; font-size: 18px; font-weight: bold; color: #111827;">${transactionsCount} rows</p>
            </div>
            <div style="background-color: #f8fafc; padding: 12px; border-radius: 12px; border: 1px solid #f1f5f9;">
              <span style="font-size: 12px; color: #6b7280;">Highest Spending Area</span>
              <p style="margin: 4px 0 0; font-size: 16px; font-weight: bold; color: #8b5cf6;">${topCategory || "None"}</p>
            </div>
          </div>
          <p style="color: #9ca3af; font-size: 11px; text-align: center; margin-top: 20px;">
            Sent automatically because Weekly Summaries are active in your settings.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✉️ Weekly summary report email dispatched to ${email}`);
  } catch (err) {
    console.error("Weekly digest compilation mailing fault:", err.message);
  }
};

/** 3. SEND MONTHLY CLOSING STATEMENT REPORT EMAIL
 *Dispatches automatically on the closing night of every single month via monthEndReportCron.js
 */
exports.sendMonthlySummaryEmail = async (email, name, totalSpent, budget, savings, monthName) => {
  try {
    const safeName = name ? name.split(" ")[0] : "User";

    const mailOptions = {
      from: `"ExpenseAI Reports" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `📋 Final Financial Statement: ${monthName}`,
      html: `
        <div style="font-family: 'DM Sans', sans-serif; max-width: 500px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 24px; background-color: #ffffff;">
          <h2 style="color: #1d4ed8; font-size: 22px; margin-bottom: 5px;">Your Monthly Ledger is Ready!</h2>
          <p style="color: #6b7280; font-size: 13px; margin: 0 0 20px;">Closing statement compiled for <strong>${monthName}</strong></p>
          
          <div style="border-top: 1px dashed #e2e8f0; border-bottom: 1px dashed #e2e8f0; padding: 15px 0; margin-bottom: 20px;">
            <table style="width: 100%; font-size: 14px; color: #374151; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #ef4444;">Total Money Spent:</td>
                <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #ef4444;">- ₹${totalSpent.toLocaleString()}</td>
              </tr>
              <tr style="border-top: 1px solid #f1f5f9;">
                <td style="padding: 10px 0 0; font-weight: bold; color: #10b981;">Net Savings Retained:</td>
                <td style="padding: 10px 0 0; text-align: right; font-weight: 800; color: #6366f1; font-size: 16px;">₹${savings.toLocaleString()}</td>
              </tr>
            </table>
          </div>

          <p style="color: #9ca3af; font-size: 11px; text-align: center; margin-top: 25px; line-height: 1.4;">
            This is an automated system audit statement. You can edit your reporting schedules anytime in your Profile Account Dashboard panel.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✉️ Monthly closing statement report email dispatched to ${email}`);
  } catch (err) {
    console.error("Monthly digest compilation mailing fault:", err.message);
  }
};

/**
 4. SEND WELCOME EMAIL ON REGISTRATION
 * Greets the user immediately after account creation with a personalized touch
 */
exports.sendWelcomeEmail = async (email, name) => {
  try {
    const firstName = name ? name.split(" ")[0] : "Friend";

    const mailOptions = {
      from: `"Rajan from ExpenseAI" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Hey ${firstName}, welcome to ExpenseAI! 🚀`,
      html: `
        <div style="font-family: 'DM Sans', sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #f1f5f9; border-radius: 24px; background-color: #ffffff; color: #374151;">
          <h2 style="color: #6366f1; font-size: 22px; margin-top: 0;">Welcome to the family, ${firstName}! 👋</h2>
          
          <p style="font-size: 14px; line-height: 1.6; color: #4b5563;">
            I'm absolutely thrilled to have you here. Building <strong>ExpenseAI</strong> started with a simple goal: to make tracking money feel less like a chore and more like a superpower.
          </p>

          <p style="font-size: 14px; line-height: 1.6; color: #4b5563;">
            Whether you're trying to crush a savings goal, keep an eye on your monthly budget, or let our AI break down your spending habits, you're in the right place. 
          </p>

          <div style="background-color: #f8fafc; padding: 16px; border-radius: 16px; margin: 20px 0; border-left: 4px solid #6366f1;">
            <p style="margin: 0; font-size: 13px; font-weight: 600; color: #111827;">💡 Here are 2 quick ways to get started today:</p>
            <ul style="margin: 8px 0 0; padding-left: 20px; font-size: 13px; color: #4b5563; line-height: 1.5;">
              <li style="margin-bottom: 4px;"><strong>Set a Budget:</strong> Head over to your dashboard and lock in a monthly limit so we can watch your back.</li>
              <li><strong>Try SmartAdd:</strong> Simply type normal phrases like <em>"Paid 300 for pizza"</em> into the top bar and watch the AI do the heavy lifting!</li>
            </ul>
          </div>

          <p style="font-size: 14px; line-height: 1.6; color: #4b5563;">
            If you ever run into a bug, have a feature suggestion, or just want to tell us how much you love the clean dark mode, just hit reply to this email. I read every single one.
          </p>

          <p style="font-size: 14px; margin-top: 24px; margin-bottom: 0; font-weight: 600; color: #111827;">
            Cheers to smart tracking,<br>
            <span style="color: #6366f1; font-weight: 700;">Rajan Kumar</span><br>
            <span style="font-size: 12px; color: #9ca3af; font-weight: 400;">Creator of ExpenseAI</span>
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✉️ Warm welcome email dispatched successfully to new user: ${email}`);
  } catch (err) {
    console.error("Failed to send welcome email during registration:", err.message);
  }
};

exports.sendBudgetBreachAIEmail = async (email, name, totalSpent, budget, categoryBreakdownHTML, aiAdvice) => {
  try {
    const safeName = name ? name.split(" ")[0] : "there";
    const overBy = Math.abs(budget - totalSpent);

    const mailOptions = {
      from: `"ExpenseAI Warnings" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "🚨 Critical Alert: Monthly Budget 100% Consumed!",
      html: `
        <div style="font-family: 'DM Sans', sans-serif; max-width: 550px; margin: 0 auto; padding: 25px; border: 1px solid #fee2e2; border-radius: 24px; background-color: #ffffff; color: #1f2937;">
          
          <!-- Warning Banner Header -->
          <div style="background: linear-gradient(135deg, #ef4444, #b91c1c); padding: 20px; border-radius: 18px; text-align: center; margin-bottom: 22px; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);">
            <span style="font-size: 32px; display: block; margin-bottom: 6px;">⚠️</span>
            <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; tracking: -0.02em;">Budget Overrun Detected</h2>
            <p style="color: #fee2e2; margin: 4px 0 0; font-size: 13px;">You have officially consumed 100% of your allowance limit.</p>
          </div>

          <p style="font-size: 14px; line-height: 1.6; color: #4b5563;">
            Hey <strong>${safeName}</strong>, your wallet just hit the ceiling. You've spent a total of <strong>₹${totalSpent.toLocaleString()}</strong> against your set monthly budget of <strong>₹${budget.toLocaleString()}</strong>, pushing your accounts over the line by <span style="color: #dc2626; font-weight: 700;">₹${overBy.toLocaleString()}</span>.
          </p>

          <!-- Category Spend Breakdown Card Section -->
          <h3 style="font-size: 13px; font-weight: 700; text-transform: uppercase; color: #6b7280; margin: 24px 0 10px; letter-spacing: 0.05em;">Current Category Breakdown</h3>
          <div style="background-color: #fcfdfe; border: 1px solid #f1f5f9; padding: 16px; border-radius: 16px;">
            <table style="width: 100%; font-size: 13px; color: #374151; border-collapse: collapse;">
              <thead>
                <tr style="border-b: 1px solid #f1f5f9; text-align: left; color: #9ca3af; font-size: 11px;">
                  <th style="padding-bottom: 8px;">CATEGORY AREA</th>
                  <th style="padding-bottom: 8px; text-align: right;">TOTAL SPENT</th>
                </tr>
              </thead>
              <tbody>
                ${categoryBreakdownHTML}
              </tbody>
            </table>
          </div>

          <!-- Groq AI Smart Advice Container Section -->
          <h3 style="font-size: 13px; font-weight: 700; text-transform: uppercase; color: #6366f1; margin: 26px 0 10px; letter-spacing: 0.05em;">🧠 Groq AI Recovery Recommendations</h3>
          <div style="background: linear-gradient(180deg, #f5f3ff 0%, #f3f0ff 100%); border: 1px solid #e0e7ff; padding: 18px; border-radius: 18px; position: relative;">
            <span style="position: absolute; right: 16px; top: 14px; background: #e0e7ff; color: #6366f1; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 99px; letter-spacing: 0.04em;">GROQ · LLAMA 3.3</span>
            <div style="font-size: 13px; line-height: 1.6; color: #4338ca; white-space: pre-wrap; font-weight: 500;">
${aiAdvice}
            </div>
          </div>

          <p style="color: #9ca3af; font-size: 11px; text-align: center; margin-top: 28px; border-top: 1px solid #f1f5f9; padding-top: 12px; line-height: 1.4;">
            This security warning macro targets your core spending milestones. Adjust email toggles inside your Profile Settings panel anytime.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✉️ Critical 100% Budget Breach AI Report Email sent cleanly to ${email}`);
  } catch (err) {
    console.error("Failed executing budget breach email macro loop:", err.message);
  }
};