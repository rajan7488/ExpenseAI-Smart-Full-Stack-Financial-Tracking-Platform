const mongoose = require("mongoose");

// ── Permanent record of every badge a user has ever earned.
// This collection is NEVER wiped when notifications are deleted.
// It is the single source of truth for "has this user already
// been notified about badge X?"
const BadgeAwardSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        badgeKey: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
);

// Compound unique index — one record per user per badge, enforced at DB level
BadgeAwardSchema.index({ userId: 1, badgeKey: 1 }, { unique: true });

module.exports = mongoose.model("BadgeAward", BadgeAwardSchema);