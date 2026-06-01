import {
  Moon,
  Sun,
} from "lucide-react";

import {
  useTheme,
} from "../context/ThemeContext";

export default function ThemeToggle() {

  const {
    darkMode,
    toggleTheme,
  } = useTheme();

  return (
    <button
      onClick={
        toggleTheme
      }
      className="
        w-12
        h-12
        rounded-2xl
        bg-white
        dark:bg-[#1E293B]
        shadow-lg
        flex
        items-center
        justify-center
        transition-all
        duration-300
        hover:scale-110
      "
    >

      {darkMode ? (

        <Sun
          className="
            text-yellow-400
          "
          size={22}
        />

      ) : (

        <Moon
          className="
            text-gray-700
          "
          size={22}
        />

      )}

    </button>
  );
}