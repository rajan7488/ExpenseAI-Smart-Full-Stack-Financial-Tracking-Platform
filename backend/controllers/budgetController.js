const Budget = require("../models/Budget");


exports.getBudget = async (req, res) => {
  try {
    const userId = req.user.id;

    let budget = await Budget.findOne({ user: userId });

    if (!budget) {
      budget = await Budget.create({
        user: userId,
        monthlyBudget: 15000,
      });
    }

    res.status(200).json(budget);
  } catch (err) {
    console.error("GET BUDGET ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};


exports.updateBudget = async (req, res) => {
  try {
    const { monthlyBudget } = req.body;
    const userId = req.user.id;

    let budget = await Budget.findOne({ user: userId });

    if (!budget) {
      budget = await Budget.create({
        user: userId,
        monthlyBudget,
      });
    } else {
      budget.monthlyBudget = monthlyBudget;
      await budget.save();
    }

    res.status(200).json(budget);
  } catch (err) {
    console.error("UPDATE BUDGET ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};