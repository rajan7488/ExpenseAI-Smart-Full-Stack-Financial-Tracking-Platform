import { useState } from "react";
import API from "../api";
import { parseExpense } from "../utils/ParseExpense";
import toast from "react-hot-toast";
import { Sparkles } from "lucide-react";

function SmartAdd({ onSuccess }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!text.trim()) {
      return toast.error("Please enter something");
    }

    try {
      setLoading(true);

      let parsed;

      try {
        const aiRes = await API.post("/ai/parse", { text });
        parsed = aiRes.data;
      } catch (err) {
        console.log("AI failed → using fallback");
        parsed = parseExpense(text);
      }

      if (!parsed.amount || parsed.amount <= 0) {
        return toast.error("Couldn't detect amount");
      }

      await API.post("/expenses", parsed);

      toast.success("Expense added 🤖");
      setText("");
      onSuccess && onSuccess();

    } catch (err) {
      toast.error("Failed to add expense");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow flex items-center gap-3 mb-6">

      {/* ICON */}
      <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
        <Sparkles className="text-blue-500" size={18} />
      </div>

      {/* INPUT */}
      <input
        type="text"
        placeholder="Try: 'Paid 300 for pizza 🍕'"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        className="flex-1 outline-none text-sm bg-transparent"
      />

      {/* BUTTON — fixed: was 'bg-gradient-to-red' (invalid), now correct */}
      <button
        onClick={handleAdd}
        disabled={loading}
        style={{
          background: loading
            ? "#94a3b8"
            : "linear-gradient(135deg, #3b82f6, #14b8a6)",
          color: "white",
          padding: "8px 18px",
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 600,
          border: "none",
          cursor: loading ? "not-allowed" : "pointer",
          whiteSpace: "nowrap",
          flexShrink: 0,
          transition: "opacity 0.2s",
        }}
      >
        {loading ? "Adding..." : "Add"}
      </button>

    </div>
  );
}

export default SmartAdd;