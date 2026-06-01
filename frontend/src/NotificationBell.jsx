import {
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import API from "./api";
import socket from "./Socket";
import {
  Bell,
  CheckCheck,
  Sparkles,
  Trash2,
} from "lucide-react";

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });

  const buttonRef = useRef();
  const dropdownRef = useRef();

  // ── Compute dropdown position from button bounding rect ──────────────────
  const updatePosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 12,
        right: window.innerWidth - rect.right,
      });
    }
  }, []);

  // ── Fetch all notifications from DB ──────────────────────────────────────
  const fetchNotifications = async () => {
    try {
      const res = await API.get("/notifications");
      setNotifications(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  // ── Smooth close ──────────────────────────────────────────────────────────
  const closeDropdown = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 250);
  }, []);

  // ── Toggle ────────────────────────────────────────────────────────────────
  const toggleDropdown = () => {
    if (open) {
      closeDropdown();
    } else {
      updatePosition();
      setOpen(true);
    }
  };

  // ── Mark single notification as read ─────────────────────────────────────
  const markAsRead = async (id) => {
    try {
      await API.put(`/notifications/${id}`);
      setNotifications(prev =>
        prev.map(n => (n._id === id ? { ...n, read: true } : n))
      );
      closeDropdown();
    } catch (err) {
      console.log(err);
    }
  };

  // ── Mark all as read ──────────────────────────────────────────────────────
  const markAllAsRead = async () => {
    try {
      await API.put("/notifications/read-all");
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      closeDropdown();
    } catch (err) {
      console.log(err);
    }
  };

  // ── Delete all ────────────────────────────────────────────────────────────
  const deleteAll = async () => {
    try {
      await API.delete("/notifications/delete-all");
      setNotifications([]);
      // NOTE: We intentionally do NOT clear the badge cache here.
      // Clearing it would immediately cause Profile.jsx to re-emit all
      // earned badges and re-create the same notifications we just deleted.
      // The badge cache should only be cleared on full account reset / logout.
      closeDropdown();
    } catch (err) {
      console.log(err);
    }
  };

  // ── Realtime socket integration ───────────────────────────────────────────
  useEffect(() => {
    fetchNotifications();

    const handleIncomingNotification = async (data) => {
      try {
        // Check user's notification settings before appending
        const settingsRes = await API.get("/notifications/settings");
        const alertsEnabled = settingsRes.data ? settingsRes.data.spendingAlerts : true;

        // Drop budget warnings if user disabled spending alerts
        if (data.notification?.message?.includes("Budget Warning") && !alertsEnabled) {
          console.log("ℹ️ Budget warning blocked by user preference.");
          return;
        }

        // Always allow badge notifications through regardless of settings
        setNotifications(prev => [data.notification, ...prev]);
      } catch (err) {
        // Fallback: append safely if settings fetch fails
        setNotifications(prev => [data.notification, ...prev]);
      }
    };

    socket.on("notification", handleIncomingNotification);
    return () => socket.off("notification", handleIncomingNotification);
  }, []);

  // ── Close on outside click ────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      const clickedButton = buttonRef.current?.contains(e.target);
      const clickedDropdown = dropdownRef.current?.contains(e.target);
      if (!clickedButton && !clickedDropdown) closeDropdown();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, closeDropdown]);

  // ── Reposition on scroll / resize ────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  const unreadCount = notifications.filter(n => !n.read).length;
  const hasBadgeUnread = notifications.some(n => n.type === "badge" && !n.read);

  // ── Helper: pick icon for a notification ─────────────────────────────────
  const getNotifIcon = (n) => {
    if (n.type === "badge") {
      return (
        <div className={`
          w-10 h-10 rounded-full flex items-center justify-center
          flex-shrink-0 text-lg
          ${n.read ? "bg-gray-100" : "bg-yellow-100"}
        `}>
          🏅
        </div>
      );
    }
    return (
      <div className={`
        w-10 h-10 rounded-full flex items-center
        justify-center flex-shrink-0
        ${n.read ? "bg-gray-100" : "bg-blue-100"}
      `}>
        {n.read
          ? <CheckCheck size={18} className="text-gray-500" />
          : <Bell size={18} className="text-blue-600" />
        }
      </div>
    );
  };

  // ── Dropdown portal ───────────────────────────────────────────────────────
  const dropdown = open
    ? createPortal(
      <div
        ref={dropdownRef}
        style={{ position: "fixed", top: dropdownPos.top, right: dropdownPos.right, width: 380, zIndex: 99999 }}
        className={`
            bg-white rounded-3xl
            shadow-[0_20px_60px_rgba(0,0,0,0.22)]
            border border-gray-100 overflow-hidden
            transition-all duration-300 origin-top-right
            ${closing
            ? "opacity-0 -translate-y-2 scale-95 pointer-events-none"
            : "opacity-100 translate-y-0 scale-100"
          }
          `}
      >
        {/* ── Header — gold when there are unread badge notifs ── */}
        <div className={`px-5 py-4 bg-gradient-to-r ${hasBadgeUnread
          ? "from-yellow-400 to-orange-400"
          : "from-blue-500 to-purple-500"
          }`}>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-white">
              <Sparkles size={18} />
              <h3 className="font-semibold text-lg">
                {hasBadgeUnread ? "Badge Earned! 🎉" : "Notifications"}
              </h3>
            </div>

            {notifications.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={markAllAsRead}
                  className="
                      text-xs text-white bg-white/20
                      px-3 py-1 rounded-full
                      hover:bg-white/30 transition-all duration-300
                    "
                >
                  Mark all read
                </button>
                <button
                  onClick={deleteAll}
                  title="Delete all notifications"
                  className="
                      flex items-center justify-center
                      w-7 h-7 rounded-full
                      bg-white/20 hover:bg-red-400/60
                      transition-all duration-300
                    "
                >
                  <Trash2 size={13} className="text-white" />
                </button>
              </div>
            )}
          </div>
          <p className="text-sm text-white/80 mt-1">
            {unreadCount} unread message{unreadCount !== 1 ? "s" : ""}
          </p>
        </div>

        {/* ── Notification list ── */}
        <div className="max-h-[450px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-400">No notifications</p>
            </div>
          ) : (
            notifications.map(n => {
              const isBadge = n.type === "badge";
              return (
                <div
                  key={n._id}
                  onClick={() => markAsRead(n._id)}
                  className={`
                      relative px-5 py-4 border-b last:border-b-0
                      hover:bg-gray-50 transition-all duration-200 cursor-pointer
                      ${!n.read
                      ? isBadge ? "bg-yellow-50" : "bg-blue-50"
                      : "bg-white"
                    }
                    `}
                >
                  {/* Unread dot */}
                  {!n.read && (
                    <div className={`
                        absolute top-5 left-2 w-2 h-2 rounded-full animate-pulse
                        ${isBadge ? "bg-yellow-400" : "bg-blue-500"}
                      `} />
                  )}

                  <div className="flex items-start gap-3">
                    {getNotifIcon(n)}

                    <div className="flex-1 min-w-0">
                      <p className={`
                          text-sm leading-relaxed break-words
                          ${n.read ? "text-gray-500" : "text-gray-800 font-medium"}
                        `}>
                        {n.message}
                      </p>

                      {/* Badge chip — only shows on unread badge notifs */}
                      {isBadge && !n.read && (
                        <span className="
                            inline-block mt-1.5 text-[10px] font-bold
                            bg-yellow-100 text-yellow-700
                            border border-yellow-200
                            px-2 py-0.5 rounded-full
                          ">
                          ✨ New Badge Earned!
                        </span>
                      )}

                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>,
      document.body
    )
    : null;

  return (
    <>
      <button
        ref={buttonRef}
        onClick={toggleDropdown}
        className="
          relative w-12 h-12 rounded-2xl
          bg-white shadow-lg border border-gray-100
          flex items-center justify-center
          hover:scale-105 transition-all duration-300
        "
      >
        <Bell size={22} className="text-gray-700" />
        {unreadCount > 0 && (
          <div className={`
            absolute -top-1 -right-1
            text-white text-[10px] font-bold
            rounded-full w-5 h-5 flex items-center justify-center
            animate-pulse shadow-md
            ${hasBadgeUnread ? "bg-yellow-500" : "bg-red-500"}
          `}>
            {unreadCount}
          </div>
        )}
      </button>
      {dropdown}
    </>
  );
}

export default NotificationBell;