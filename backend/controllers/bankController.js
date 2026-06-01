const User = require("../models/User");
const Expense = require("../models/Expense");
const { createNotification } = require("./notificationController");

const SETU_BASE_URL = process.env.SETU_AA_BASE_URL || "https://fiu-sandbox.setu.co";
const SETU_CLIENT_ID = process.env.SETU_CLIENT_ID;
const SETU_CLIENT_SECRET = process.env.SETU_CLIENT_SECRET;
const SETU_PRODUCT_INSTANCE_ID = process.env.SETU_PRODUCT_INSTANCE_ID;

function setuHeaders() {
    return {
        "Content-Type": "application/json",
        "x-client-id": SETU_CLIENT_ID,
        "x-client-secret": SETU_CLIENT_SECRET,
        "x-product-instance-id": SETU_PRODUCT_INSTANCE_ID,
    };
}

function categorize(description) {
    const t = description.toLowerCase();
    if (["zomato", "swiggy", "food", "cafe", "dinner", "restaurant", "bistro", "eat"].some(k => t.includes(k))) return "Food & Dining";
    if (["uber", "ola", "petrol", "metro", "cab", "rapido", "fuel", "irctc", "railway"].some(k => t.includes(k))) return "Transportation";
    if (["amazon", "flipkart", "myntra", "meesho", "ajio", "shopping", "nykaa"].some(k => t.includes(k))) return "Shopping";
    if (["rent", "electricity", "bill", "utilities", "broadband", "airtel", "jio", "bsnl", "water"].some(k => t.includes(k))) return "Bills & Utilities";
    if (["netflix", "spotify", "prime", "hotstar", "zee5", "subscription"].some(k => t.includes(k))) return "Entertainment";
    if (["hospital", "pharmacy", "doctor", "medical", "health", "apollo", "medplus"].some(k => t.includes(k))) return "Health";
    return "Other";
}

function cleanDescription(raw) {
    const cleaned = raw
        .replace(/\b(POS|UPI|INF|NEFT|IMPS|RTGS|ACH|ECS|ATM|CDM|INDIA|RECEIPT|MOCK|STATEMENT)\b/gi, "")
        .replace(/[-_\/\\]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : raw;
}

exports.initiateConsent = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const { bankName, phone } = req.body;

        if (!bankName) {
            return res.status(400).json({ message: "Bank designation selection is required." });
        }

        const existingUser = await User.findById(userId);
        if (existingUser?.bankLinked) {
            return res.status(400).json({ message: "Bank account is already linked to this profile." });
        }

        const cleanPhone = (phone || existingUser?.phone || "").replace(/\D/g, "").slice(-10);
        if (!cleanPhone || cleanPhone.length !== 10) {
            return res.status(400).json({ message: "A valid 10-digit phone number is required. Please update your profile phone number first." });
        }

        const now = new Date();
        const sixMonthsAgo = new Date(now);
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        // ✅ FIX 1: vua must be in "MOBILENUMBER@onemoney" format
        const vua = `${cleanPhone}@onemoney`;

        // ✅ FIX 2: Use http for localhost (Setu sandbox rejects https://localhost)
        const redirectUrl = process.env.FRONTEND_URL
            ? `${process.env.FRONTEND_URL}/bank-redirect-sandbox`
            : "http://localhost:5173/bank-redirect-sandbox";

        const consentPayload = {
            vua,
            consentDuration: { unit: "MONTH", value: 1 },
            consentMode: "STORE",       // ✅ FIX 3: was "VIEW" — purpose code 102 requires "STORE"
            fetchType: "PERIODIC",      // ✅ FIX 4: was "ONETIME" — use "PERIODIC" for spend analysis
            consentTypes: ["TRANSACTIONS"],
            fiTypes: ["DEPOSIT"],
            purpose: {
                code: "102",
                refUri: "https://api.rebit.org.in/aa/purpose/102.xml",
                text: "Customer spending patterns, budget or other reportings",
                category: { type: "string" },
            },
            dataRange: {
                from: sixMonthsAgo.toISOString(),
                to: now.toISOString(),
            },
            dataLife: { unit: "MONTH", value: 1 },
            frequency: { unit: "HOUR", value: 1 },
            redirectUrl,
            context: [
                { key: "accounttype", value: "SAVINGS" },
            ],
        };

        console.log("📤 Sending consent payload:", JSON.stringify(consentPayload, null, 2));

        const setuResponse = await fetch(`${SETU_BASE_URL}/v2/consents`, {
            method: "POST",
            headers: setuHeaders(),
            body: JSON.stringify(consentPayload),
        });

        if (!setuResponse.ok) {
            const errText = await setuResponse.text();
            console.error("Setu consent creation failed:", errText);
            return res.status(502).json({ message: "Failed to create consent request with bank aggregator.", detail: errText });
        }

        const setuData = await setuResponse.json();
        console.log("✅ Setu consent response:", JSON.stringify(setuData));

        const consentId = setuData.id;
        const authRedirectUrl = setuData.url;

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { consentId, linkedBankName: bankName },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found." });
        }

        console.log(`✅ Setu consent created: ${consentId} for user ${userId}`);

        return res.status(200).json({ consentId, authRedirectUrl });

    } catch (err) {
        console.error("BANK CONSENT INITIATION ERROR:", err);
        return res.status(500).json({ message: "Failed initializing open banking interface connection." });
    }
};

exports.handleBankWebhookCallback = async (req, res) => {
    try {
        const io = req.app.get("io");
        const { type, consentId, dataSessionId } = req.body;

        console.log(`📥 [SETU WEBHOOK] Event type: ${type} | consentId: ${consentId}`);

        if (type === "CONSENT_STATUS_UPDATE") {
            const { status } = req.body;

            if (status !== "ACTIVE") {
                console.log(`⚠️ Consent ${consentId} status: ${status} — skipping.`);
                return res.status(200).json({ message: "Non-active consent status acknowledged." });
            }

            const user = await User.findOne({ consentId });
            if (!user) return res.status(404).json({ message: "No user found for this consentId." });

            const now = new Date();
            const sixMonthsAgo = new Date(now);
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

            const fiSessionResponse = await fetch(`${SETU_BASE_URL}/v2/fip/dataflow/sessions`, {
                method: "POST",
                headers: setuHeaders(),
                body: JSON.stringify({
                    consentId,
                    dataRange: {
                        from: sixMonthsAgo.toISOString(),
                        to: now.toISOString(),
                    },
                    format: { type: "json", version: "1.1.2" },
                }),
            });

            if (!fiSessionResponse.ok) {
                const errText = await fiSessionResponse.text();
                console.error("FI session creation failed:", errText);
                return res.status(502).json({ message: "Failed to create FI data session." });
            }

            const fiSessionData = await fiSessionResponse.json();
            console.log(`📡 FI data session created: ${fiSessionData.id}`);
            await User.findByIdAndUpdate(user._id, { fiSessionId: fiSessionData.id });

            return res.status(200).json({ message: "Consent active, FI data session initiated." });
        }

        if (type === "FI_NOTIFICATION") {
            const { status: fiStatus } = req.body;

            if (fiStatus !== "READY") {
                console.log(`⚠️ FI data not ready yet: ${fiStatus}`);
                return res.status(200).json({ message: "FI data not ready, acknowledged." });
            }

            const user = await User.findOne({ consentId });
            if (!user) return res.status(404).json({ message: "No user found for this consentId." });

            const userId = user._id;

            const fiDataResponse = await fetch(
                `${SETU_BASE_URL}/v2/fip/dataflow/sessions/${dataSessionId}`,
                { method: "GET", headers: setuHeaders() }
            );

            if (!fiDataResponse.ok) {
                const errText = await fiDataResponse.text();
                console.error("FI data fetch failed:", errText);
                return res.status(502).json({ message: "Failed to fetch FI data from aggregator." });
            }

            const fiData = await fiDataResponse.json();
            const processedExpenses = [];
            const fiObjects = fiData?.fiObjects || [];

            for (const fiObject of fiObjects) {
                const transactions = fiObject?.decryptedFI?.Account?.Transactions?.Transaction || [];

                for (const txn of transactions) {
                    if (txn.type !== "DEBIT") continue;

                    const amount = parseFloat(txn.amount);
                    if (!amount || amount <= 0) continue;

                    const rawDesc = txn.narration || txn.reference || "Bank Transaction";
                    const description = cleanDescription(rawDesc);
                    const category = categorize(rawDesc);
                    const txnDate = new Date(txn.transactionTimestamp || txn.valueDate || Date.now());

                    const startOfDay = new Date(txnDate); startOfDay.setHours(0, 0, 0, 0);
                    const endOfDay = new Date(txnDate); endOfDay.setHours(23, 59, 59, 999);

                    const existing = await Expense.findOne({
                        userId, amount, description,
                        date: { $gte: startOfDay, $lte: endOfDay },
                    });

                    if (existing) { console.log(`⚠️ Duplicate skipped: ${description} ₹${amount}`); continue; }

                    const savedExpense = await Expense.create({ userId, category, amount, description, date: txnDate });
                    processedExpenses.push(savedExpense);
                }
            }

            user.bankLinked = true;
            await user.save();

            const alertMsg = `🎉 Bank Sync Complete: Imported and categorized ${processedExpenses.length} transactions from your ${user.linkedBankName} account!`;
            const syncNotification = await createNotification(userId, alertMsg);

            if (io) {
                io.to(userId.toString()).emit("notification", { notification: syncNotification });
                io.to(userId.toString()).emit("bank_sync_complete", { success: true });
            }

            return res.status(200).json({ message: `Webhook processed. ${processedExpenses.length} transactions imported.` });
        }

        console.log(`ℹ️ Unhandled Setu webhook event type: ${type}`);
        return res.status(200).json({ message: "Event acknowledged." });

    } catch (err) {
        console.error("WEBHOOK PROCESSING ERROR:", err);
        return res.status(500).json({ message: "Internal error processing webhook." });
    }
};