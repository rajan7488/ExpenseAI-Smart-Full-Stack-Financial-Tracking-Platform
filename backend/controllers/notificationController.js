// backend/controllers/notificationController.js
const Notification = require("../models/Notification");

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      userId: req.user._id,
    }).sort({ createdAt: -1 });

    res.json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.createNotification = async (userIdOrReq, messageOrRes) => {
  try {
    let finalUserId;
    let finalMessage;
    let isExpressCall = false;

    if (userIdOrReq && userIdOrReq.user && userIdOrReq.body) {
      finalUserId = userIdOrReq.user._id;
      finalMessage = userIdOrReq.body.message;
      isExpressCall = true;
    } else {
      finalUserId = userIdOrReq;
      finalMessage = messageOrRes;
    }

    if (!finalUserId || !finalMessage) {
      if (isExpressCall) {
        return messageOrRes.status(400).json({ message: "Missing required notification content fields." });
      }
      throw new Error("Missing parameters for notification compilation.");
    }

    const notification = await Notification.create({
      userId: finalUserId,
      message: finalMessage,
      read: false,
    });

    if (isExpressCall) {
      return messageOrRes.status(201).json(notification);
    }
    return notification;

  } catch (err) {
    console.error("Notification Creation Engine Error:", err);
    if (userIdOrReq && userIdOrReq.user && messageOrRes && typeof messageOrRes.status === "function") {
      return messageOrRes.status(500).json({ message: "Server failed to record notification object data frameworks." });
    }
    throw err;
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    notification.read = true;
    await notification.save();

    res.json(notification);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, read: false },
      { $set: { read: true } }
    );

    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.deleteAllNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.user._id });

    res.json({ message: "All notifications deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};