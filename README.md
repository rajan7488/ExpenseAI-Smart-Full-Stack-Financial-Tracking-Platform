# 💸 ExpenseAI – Smart Full-Stack Financial Tracking Platform

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/Node.js-18%2B-green)
![React](https://img.shields.io/badge/React-18-blue)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-brightgreen)
![AI](https://img.shields.io/badge/AI-Groq%20Llama%203.3-purple)

> An intelligent, AI-powered expense tracking platform with real-time budget alerts, natural language SmartAdd input, cryptographic 2FA, financial health scoring, and automated AI email reports — built on a modern full-stack architecture.

---

## 🚀 Live Demo
frontend
> 🔗 Vercel APP :- https://expense-ai-smart-full-stack-financi-iota.vercel.app
backend
>  render APP :-   https://expenseai-smart-full-stack-financial.onrender.com

---

## 📌 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [Core Modules](#-core-modules)
- [Pages & UI](#-pages--ui)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Project Structure](#-project-structure)
- [Deployment](#-deployment)
- [Roadmap](#-roadmap)
- [License](#-license)

---

## ✨ Features

### 🤖 AI & Smart Features
- **SmartAdd NLP Engine** — Type expenses in plain English from the dashboard (e.g. *"Paid 300 for pizza"*) and Groq Llama 3.3 automatically extracts the amount, generates a description, and maps the correct category
- **AI Financial Insights Page** — Dedicated `/ai-insights` page showing Financial Health Score (0–100), AI Confidence %, Risk Level, Monthly Change %, Spending Alerts, Actual vs Predicted spending chart, Next Month Predictions per category, and personalized Recommendations
- **Smart Insights on Reports** — Live Groq Llama 3.3 analysis panel on the Reports page with actionable tips (e.g. *"Cut ₹13000 shopping spend by 50%"*, *"Use UPI for food spends to earn cashback"*)
- **100% Budget Breach AI Interceptor** — When spending hits 100% of budget, Groq AI generates an immediate freeze strategy and recalculated budget recommendation
- **AI Receipt Scanner** — Upload a JPG, PNG, or PDF receipt on the Add Expense page; AI auto-fills amount, description, and category

### 📊 Dashboard & Analytics
- **Live Dashboard** — Personalized greeting (*"Good afternoon, Rajan 👋"*), Monthly Budget card with progress bar, Spent This Month, Total Saved, and Budget Used stat cards, plus an AI Insights preview panel powered by Groq Llama 3.3
- **Financial Reports** — Month-by-month analysis with Overview / Trends / Categories tabs; Budget Progress bar, Category Breakdown donut chart, Monthly Overview bar chart
- **Category Analysis** — Per-category spend bars with percentage share (Shopping, Transportation, Food & Dining, Healthcare, etc.) and month-over-month change
- **Actual vs Predicted Spending** — Side-by-side bar chart comparing real spend against AI predictions per category
- **Next Month Predictions** — AI-forecasted spend per category for the upcoming month

### 🔒 Security & Auth
- **JWT Authentication** — Secure login/signup with token-based sessions; clean login page with SSL Secured, Instant Access, and Privacy First indicators
- **Cryptographic 2FA** — TOTP-based two-factor authentication via `speakeasy`; QR code for Google/Microsoft Authenticator with 30-second clock-drift tolerance; managed from Profile → Settings → Two-Factor Auth

### 📡 Real-Time & Notifications
- **Socket.io Push Alerts** — User-specific WebSocket rooms; backend emits budget threshold events (80%, 95%, 100%) directly to the active browser tab
- **Notification Bell** — Live notification badge on the dashboard header showing unread alert count
- **Toast Alerts** — Styled crimson overlay for budget breach events, pinned for 10 seconds

### 📧 Email Microservice
- **Automated Emails** — Non-blocking Nodemailer service for welcome emails, 80%/95% spending threshold alerts, and 100% breach emails with AI-generated advice embedded in HTML templates
- **Notification Preferences** — Toggleable from Profile → Settings: Monthly Report, Spending Alerts, Weekly Summary

### 👤 Profile & Gamification
- **User Profile** — Full name, email, phone, location, occupation, monthly income, and monthly savings goal; member since date; savings rate displayed
- **Stats, Badges & History tabs** — Gamification layer tracking transactions, XP, badges earned, and spending history
- **Savings Goal Tracker** — Live progress bar on AI Insights page showing Monthly Income, Saved So Far vs Your Goal

### 💳 Expense Management
- **Expense CRUD** — Full create, read, update, delete with date grouping, category filter chips (All / Food & Dining / Transportation / Shopping / Entertainment / Other), search by description or category, sort by Newest First
- **Summary Stats Bar** — Total Spent, Transactions count, Avg Expense, Highest Spent shown above the expense list
- **Category Picker** — Visual icon grid on Add Expense: Food, Transportation, Bills, Shopping, Entertainment, Healthcare, Education, Other

---

### Future Feature 
Bank API Integration

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React.js, Tailwind CSS, Recharts |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB (Atlas) |
| **AI / LLM** | Groq API (Llama 3.3), Google Gemini API |
| **Auth** | JWT, Speakeasy (2FA / TOTP) |
| **Real-Time** | Socket.io |
| **Email** | Nodemailer |
| **Deployment** | Vercel (Frontend), Render (Backend), MongoDB Atlas |

---

## 🏗 System Architecture

```
[React Frontend] ──── REST API / Socket.io ────> [Node.js + Express Backend]
                                                          │
                                    ┌─────────────────────┼──────────────────────┐
                                    ▼                     ▼                      ▼
                             [MongoDB Atlas]       [Groq / Gemini AI]      [Nodemailer SMTP]
                          (expenses, users,       (SmartAdd NLP, insights, (alerts, welcome,
                          reports, budgets)        breach strategy,         AI email reports)
                                                   predictions)
```

---

## 🔍 Core Modules

### 1. SmartAdd NLP Engine
Parses natural language expense strings via regex + Groq Llama 3.3 directly from the dashboard input bar. Strips keywords (`paid`, `spent`, `for`), isolates numerical amounts, and maps key-phrases (`pizza`, `uber`, `swiggy`) to the correct semantic category automatically.

### 2. Dynamic Financial Health Engine
Runs on every dashboard and AI Insights page mount. Calculates a live 0–100 score from three weighted signals: budget adherence (deducts at 70% and 90% velocity), savings velocity (flags critical if net savings drops below 10% of income), and discretionary weighting (penalizes any single category exceeding 25% of total budget). Visualized as an animated SVG ring shifting between green / amber / red.

### 3. AI Financial Insights Page
Dedicated page at `/ai-insights` aggregating: Financial Health Score ring, AI Confidence %, Risk Level badge, Monthly Change %, 6 Spending Alerts, Actual vs Predicted bar chart, Next Month Predictions per category, and a Recommendations panel — all powered by a structured Groq prompt built from compressed monthly financial data.

### 4. Cryptographic 2FA Pipeline
`speakeasy.generateSecret()` generates a 32-character base32 key. QR code rendered as base64 via `qrcode.toDataURL()` for authenticator apps. `speakeasy.totp.verify()` validates tokens with `window: 1` clock-drift tolerance. Managed from Profile → Settings → Two-Factor Auth.

### 5. Real-Time Socket Architecture
Frontend emits user ID on connect → backend assigns socket to a `userId` room. `app.set("io", io)` exposes the socket across all Express controllers. Budget threshold events target specific sessions via `.to(userId).emit("notification", ...)`.

### 6. Automated Monthly Reports
Parallel `Promise.all` DB queries prevent thread blocking. MongoDB upsert operations (`findOneAndUpdate` with `{ upsert: true }`) create or update monthly report documents dynamically as expenses are added throughout the month.

---

## 📄 Pages & UI

| Route | Page | Description |
|---|---|---|
| `/login` | Login | JWT auth with SSL secured badge |
| `/dashboard` | Dashboard | SmartAdd bar, budget card, stat cards, AI insights preview |
| `/expenses` | Expenses | Full expense list with filters, search, category chips |
| `/reports` | Financial Reports | Overview / Trends / Categories tabs, donut chart, bar chart |
| `/ai-insights` | AI Insights | Health score, predictions, alerts, recommendations |
| `/profile` | Profile | Personal info, stats, badges, history, settings |
| `/add-expense` | Add Expense | Category grid picker + AI Receipt Scanner upload |

---

## ⚙️ Getting Started

### Prerequisites
- Node.js v18+
- MongoDB Atlas account
- Groq API key
- Google Gemini API key (optional)
- Gmail account for Nodemailer

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/expenseai.git
cd expenseai
```

### 2. Install Dependencies

**Backend:**
```bash
cd server
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

### 3. Configure Environment Variables
See the section below.

### 4. Run Locally

**Backend (port 5050):**
```bash
cd backend
npm run dev
```

**Frontend (port 5173):**
```bash
cd frontend
npm run dev
```

---

## 🔐 Environment Variables

### Backend — `server/.env`

```env
# Server
PORT=5050
NODE_ENV=development

# MongoDB
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/expenseai

# JWT
JWT_SECRET=your_super_secret_key

# Groq AI
GROQ_API_KEY=your_groq_api_key

# Gemini AI (optional)
GEMINI_API_KEY=your_gemini_api_key

# Nodemailer
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password

# 2FA
TOTP_ISSUER=ExpenseAI
```

### Frontend — `frontend/.env`

```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

> ⚠️ Never commit `.env` files. Add them to `.gitignore`.

---

## 📁 Project Structure

```
expenseai/
│
├── backend/
│   ├── config/                          # DB and app configuration
│   ├── controllers/
│   │   ├── aiController.js              # SmartAdd NLP + Groq/Gemini insights
│   │   ├── AuthController.js            # JWT login, signup, 2FA
│   │   ├── budgetController.js          # Budget logic + email triggers
│   │   ├── expenseControlller.js        # Expense CRUD + socket hooks
│   │   ├── notificationController.js    # Notification management
│   │   ├── ocrController.js             # AI Receipt Scanner (OCR)
│   │   └── profileController.js         # User profile management
│   ├── cron/
│   │   ├── monthEndReportCron.js        # Automated monthly report job
│   │   └── weeklySummaryCron.js         # Weekly summary email job
│   ├── middleware/
│   │   ├── authMiddleware.js            # JWT verification
│   │   └── uploadMiddleware.js          # File upload handling (receipts)
│   ├── models/
│   │   ├── Badgeaward.js               # Gamification badge schema
│   │   ├── Budget.js                   # Budget schema
│   │   ├── Expense.js                  # Expense schema
│   │   ├── MonthlyReport.js            # Monthly report schema
│   │   ├── Notification.js             # Notification schema
│   │   ├── NotificationSetting.js      # User notification preferences
│   │   └── User.js                     # User schema
│   ├── routes/
│   │   ├── aiRoutes.js                 # AI insight endpoints
│   │   ├── AuthRoutes.js               # Auth endpoints
│   │   ├── budgetRoutes.js             # Budget endpoints
│   │   ├── expenseRoutes.js            # Expense endpoints
│   │   ├── notificationRoutes.js       # Notification endpoints
│   │   ├── ocrRoutes.js                # OCR receipt endpoints
│   │   └── profileRoutes.js            # Profile endpoints
│   ├── services/
│   │   ├── emailService.js             # Nodemailer HTML email templates
│   │   └── geminiService.js            # Gemini AI service
│   ├── utils/                          # Helper utilities
│   ├── eng.traineddata                 # Tesseract OCR language data
│   ├── .env                            # Backend environment variables
│   └── server.js                       # Entry point
│
├── frontend/
│   ├── public/
│   │   └── vite.svg
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── AI/
│   │   │   │   ├── AIInsights.jsx      # Health score + predictions UI
│   │   │   │   └── ChatAssistant.jsx   # AI chat interface
│   │   │   ├── Expenses/
│   │   │   │   ├── AddExpense.jsx      # Category picker + receipt upload
│   │   │   │   ├── BudgetModal.jsx     # Set/edit budget modal
│   │   │   │   └── Expenses.jsx        # Expense list + filters
│   │   │   ├── layout/
│   │   │   │   └── Layout.jsx          # App shell layout
│   │   │   └── Security/               # 2FA security components
│   │   ├── pages/
│   │   │   ├── Auth/
│   │   │   │   ├── Profile.jsx         # Login page
│   │   │   │   └── Register.jsx        # Signup page
│   │   │   └── Dashboard/
│   │   │       ├── Dashboard.jsx       # Main dashboard
│   │   │       ├── Report.jsx          # Financial reports page
│   │   │       └── Sidebar.jsx         # Navigation sidebar
│   │   ├── context/
│   │   │   ├── AuthContext.jsx         # JWT auth state
│   │   │   └── ThemeContext.jsx        # Light/dark theme state
│   │   ├── utils/                      # Helper utilities
│   │   ├── api.js                      # Axios API config
│   │   ├── App.jsx                     # Routing + global socket listener
│   │   ├── NotificationBell.jsx        # Live notification badge
│   │   ├── SmartAdd.jsx                # NLP expense input bar
│   │   ├── Socket.js                   # Socket.io client setup
│   │   ├── ThemeToggle.jsx             # Light/dark mode toggle
│   │   ├── ConfirmModal.jsx            # Reusable confirm dialog
│   │   ├── ProtectedRoute.jsx          # Auth-gated route wrapper
│   │   └── PublicRoute.jsx             # Public-only route wrapper
│   ├── index.html
│   └── package.json
│
└── README.md
```

---

## 🚢 Deployment

### Frontend → Vercel
1. Push `client/` to GitHub
2. Import on [vercel.com](https://vercel.com) → set Framework to **Vite**
3. Add environment variables:
   ```
   VITE_API_URL=https://your-backend.onrender.com
   VITE_SOCKET_URL=https://your-backend.onrender.com
   ```

### Backend → Render
1. Push `server/` to GitHub
2. Create **Web Service** on [render.com](https://render.com)
3. Build Command: `npm install` | Start Command: `node server.js`
4. Add all backend environment variables in the Render dashboard

### CORS — Update Before Deploying
```js
const io = new Server(server, {
  cors: {
    origin: "https://your-app.vercel.app",
    methods: ["GET", "POST"]
  }
});
```

> ⚠️ Free Render instances spin down after 15 min of inactivity. First request after idle takes ~30s. Upgrade to $7/mo to avoid this.

---

## 🗺 Roadmap

- [x] JWT Authentication
- [x] Expense CRUD with Category Management
- [x] SmartAdd NLP Engine (Groq Llama 3.3)
- [x] AI Financial Insights Page
- [x] Financial Health Score (0–100)
- [x] Actual vs Predicted Spending Charts
- [x] Next Month AI Predictions
- [x] Smart Insights on Reports
- [x] Socket.io Real-Time Budget Alerts
- [x] Automated Email Microservice (Nodemailer)
- [x] Cryptographic 2FA (TOTP / speakeasy)
- [x] Automated Monthly Reports
- [x] AI Receipt Scanner (OCR)
- [x] Gamification (XP, Badges, Stats)
- [x] Savings Goal Tracker
- [x] Multi-Currency Support
- [ ] Bank API Integration
- [ ] Social Expense Feed

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

## 🙋‍♂️ Author

**Rajan Kumar**
- GitHub: [@rajan7488https://github.com/rajan7488)
- LinkedIn: [your-linkedin](https://linkedin.com/in/your-profile)

---

> ⭐ If you found this project useful, please give it a star on GitHub!
