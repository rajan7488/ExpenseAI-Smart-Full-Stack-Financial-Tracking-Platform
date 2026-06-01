export const parseExpense = (text) => {
  const lower = text.toLowerCase();

  // 🔥 extract amount (better regex)
  const amountMatch = lower.match(/(\d+(\.\d+)?)/);
  const amount = amountMatch ? Number(amountMatch[0]) : 0;

  // 🔥 category keywords
  const keywords = {
    "Food & Dining": ["pizza", "burger", "food", "restaurant", "cafe", "zomato", "swiggy"],
    "Transportation": ["uber", "ola", "bus", "metro", "auto", "taxi"],
    "Bills & Utilities": ["electricity", "bill", "water", "wifi", "recharge"],
    "Shopping": ["amazon", "shopping", "clothes", "flipkart", "mall"],
    "Entertainment": ["movie", "netflix", "game"],
  };

  let category = "Other";

  for (let key in keywords) {
    if (keywords[key].some((word) => lower.includes(word))) {
      category = key;
      break;
    }
  }

  return {
    amount,
    category,
    description: text,
  };
};