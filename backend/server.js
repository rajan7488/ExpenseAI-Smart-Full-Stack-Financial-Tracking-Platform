require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// ================== 1. GLOBAL CORS & CONFIGURATION MIDDLEWARE ==================
const corsOptions = {
  origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOptions));

// ✅ Prevent API response caching (fixes 304 blank screen on refresh)
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// ================== 2. SOCKET.IO SERVER INITIALIZATION ==================
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.set("io", io);

let Notification;
let BadgeAward;

const getNotificationModel = () => {
  if (!Notification) Notification = require("./models/Notification");
  return Notification;
};

const getBadgeAwardModel = () => {
  if (!BadgeAward) BadgeAward = require("./models/BadgeAward");
  return BadgeAward;
};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join", (userId) => {
    socket.join(userId);
    console.log("User joined room:", userId);
  });

  socket.on("badgeEarned", async ({ userId, badgeKey, badgeIcon, badgeName, badgeDesc }) => {
    if (!userId || !badgeKey) return;

    try {
      const NotifModel = getNotificationModel();
      const BadgeAwardModel = getBadgeAwardModel();

      const alreadyAwarded = await BadgeAwardModel.findOne({ userId, badgeKey });
      if (alreadyAwarded) return;

      try {
        await BadgeAwardModel.create({ userId, badgeKey });
      } catch (dupErr) {
        if (dupErr.code === 11000) return;
        throw dupErr;
      }

      const message = `${badgeIcon} Badge Unlocked: "${badgeName}" — ${badgeDesc}`;

      const notif = await NotifModel.create({
        userId,
        message,
        badgeKey,
        type: "badge",
        read: false,
      });

      io.to(userId).emit("notification", { notification: notif });
      console.log(`🏅 Badge "${badgeName}" awarded to user ${userId}`);
    } catch (err) {
      console.error("badgeEarned handler error:", err.message);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// ================== 3. ROUTES ==================
app.get("/", (req, res) => {
  res.send("Server Running 🚀");
});

const authRoutes = require("./routes/AuthRoutes");
const profileRoutes = require("./routes/profileRoutes");
const aiRoutes = require("./routes/aiRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const budgetRoutes = require("./routes/budgetRoutes");
const ocrRoutes = require("./routes/ocrRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const bankRoutes = require("./routes/bankRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/budget", budgetRoutes);
app.use("/api/bank", bankRoutes);
app.use("/api/ocr", ocrRoutes);
app.use("/api/notifications", notificationRoutes);

// ================== 4. DATABASE & BOOTSTRAP ==================
connectDB();

require("./cron/weeklySummaryCron");
require("./cron/monthEndReportCron");

server.listen(5050, () => {
  console.log("Server running on http://localhost:5050");
});