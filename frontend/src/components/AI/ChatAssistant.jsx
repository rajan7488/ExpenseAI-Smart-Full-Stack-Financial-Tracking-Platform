import { useState } from "react";
import API from "../../api";

function ChatAssistant() {
  const [messages, setMessages] = useState([
    { role: "bot", text: "Hi 👋 Ask me about your spending!" },
  ]);
  const [input, setInput] = useState("");


  const getResponse = async (question) => {
    const res = await API.get("/expenses");
    const expenses = res.data;

    const total = expenses.reduce((sum, e) => sum + e.amount, 0);

    const categoryMap = {};
    expenses.forEach((e) => {
      categoryMap[e.category] =
        (categoryMap[e.category] || 0) + e.amount;
    });

    const sorted = Object.entries(categoryMap).sort(
      (a, b) => b[1] - a[1]
    );

    const top = sorted[0];

    if (question.includes("total")) {
      return `You spent ₹${total} in total.`;
    }

    if (question.includes("top") || question.includes("most")) {
      return `You spend most on ${top[0]} (₹${top[1]}).`;
    }

    if (question.includes("save")) {
      return `Try reducing ${top[0]} spending. You can save up to ₹${Math.floor(
        top[1] * 0.2
      )}.`;
    }

    if (question.includes("overspend")) {
      return total > 5000
        ? `⚠️ You are overspending by ₹${total - 5000}`
        : `You're within your budget 👍`;
    }

    return "I didn’t understand that. Try asking about spending, saving, or categories.";
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);

    const response = await getResponse(input.toLowerCase());

    setMessages((prev) => [
      ...prev,
      { role: "bot", text: response },
    ]);

    setInput("");
  };

  return (
    <div className="fixed bottom-6 right-6 w-80 bg-white rounded-2xl shadow-xl flex flex-col">

      {/* HEADER */}
      <div className="bg-blue-500 text-white p-3 rounded-t-2xl">
        AI Assistant 🤖
      </div>

      {/* CHAT */}
      <div className="p-3 h-64 overflow-y-auto space-y-2">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`text-sm p-2 rounded-lg max-w-[80%] ${
              msg.role === "user"
                ? "bg-blue-100 ml-auto"
                : "bg-gray-100"
            }`}
          >
            {msg.text}
          </div>
        ))}
      </div>

      {/* INPUT */}
      <div className="flex border-t">
        <input
          className="flex-1 p-2 outline-none"
          placeholder="Ask something..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          onClick={handleSend}
          className="px-4 bg-blue-500 text-white"
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default ChatAssistant;