// src/components/Navbar.jsx
import { Link, useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { FaMoon, FaSun, FaBars, FaTimes, FaSearch } from "react-icons/fa";
import { useState, useEffect, useRef, useContext } from "react";
import API from "../api/axios";
import { ChatContext } from "../context/ChatContext";
import { AppContext } from "../context/AppContext";
import {
  IoNotificationsOutline,
  IoClose,
  IoCheckmarkDoneSharp,
  IoPersonCircleOutline,
  IoVolumeMedium,
  IoVolumeMute,
} from "react-icons/io5";
import { buildFileUrl } from "../utils/url";

// Accounts utils
import {
  getAccounts,
  switchAccount,
  removeAccount,
  updateAccountUserSnapshot,
} from "../utils/accounts";

// NEW: notification settings API
import {
  getNotificationSettings,
  updateNotificationSettings,
} from "../api/notifications";

export default function Navbar() {
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode } = useTheme();

  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  // Reactive user
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });
  useEffect(() => {
    const update = () => {
      try {
        setUser(JSON.parse(localStorage.getItem("user") || "null"));
      } catch {
        setUser(null);
      }
    };
    window.addEventListener("auth:changed", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("auth:changed", update);
      window.removeEventListener("storage", update);
    };
  }, []);

  // Chat unread for Messages link
  const { unreadTotal } = useContext(ChatContext);

  // Notifications context
  const {
    notifications,
    notifUnread,
    loadNotifications,
    markNotifRead,
    markAllNotifsRead,
    deleteNotif,
    clearAllNotifs,
    notifSoundEnabled,
    notifSoundVolume,
    toggleNotifSound,
    setNotifSoundVolume,
  } = useContext(AppContext);

  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // Dropdown open/close
  const [notifOpen, setNotifOpen] = useState(false);

  // Accounts dropdown
  const [acctOpen, setAcctOpen] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const fetchedAvatars = useRef(new Set()); // avoid refetch loops

  // NEW: Reel publish alerts toggle (null = not loaded yet)
  const [reelAlertsOn, setReelAlertsOn] = useState(null);
  // NEW: Story publish alerts toggle (null = not loaded yet)
  const [storyAlertsOn, setStoryAlertsOn] = useState(null);

  // Refs for outside click - SEPARATE REFS FOR DESKTOP AND MOBILE
  const searchRef = useRef(null);
  const notifRef = useRef(null); // Desktop notification
  const mobileNotifRef = useRef(null); // Mobile notification
  const acctRef = useRef(null);

  // Load accounts, keep in sync
  const refreshAccounts = () => {
    const list = getAccounts();
    list.sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0));
    setAccounts(list);
  };

  useEffect(() => {
    refreshAccounts();
    const update = () => refreshAccounts();
    window.addEventListener("auth:changed", update);
    window.addEventListener("accounts:changed", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("auth:changed", update);
      window.removeEventListener("accounts:changed", update);
      window.removeEventListener("storage", update);
    };
  }, []);

  // Lazy fetch missing avatars for accounts
  useEffect(() => {
    const fetchAvatars = async () => {
      for (const a of accounts) {
        const accId = String(a.id);
        const hasAvatar = a?.user?.profileImage;
        if (hasAvatar || fetchedAvatars.current.has(accId)) continue;
        fetchedAvatars.current.add(accId);
        try {
          const res = await API.get(`/users/${accId}`);
          const u = res.data || {};
          if (u?.profileImage) {
            updateAccountUserSnapshot(accId, {
              profileImage: u.profileImage,
              updatedAt: u.updatedAt || Date.now(),
            });
          }
        } catch {
          // ignore
        }
      }
    };
    if (accounts.length) fetchAvatars();
  }, [accounts]);

  const logout = () => {
    if (user?.id) removeAccount(user.id);
    navigate("/home");
  };

  // Safer regex escape
  const escapeRegex = (s) => String(s).replace(/[-[```{}()*+?.,\\^$|]/g, "\\$&");
  
  const highlightText = (text, query) => {
    if (!query) return text;
    const regex = new RegExp(`(${escapeRegex(query)})`, "ig");
    const parts = String(text).split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <span key={i} className="bg-yellow-300 dark:bg-yellow-600 font-semibold rounded px-0.5">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  // Live search with debounce
  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults([]);
      return;
    }
    const handler = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await API.get(
          `/users/search?query=${encodeURIComponent(searchTerm)}`
        );
        setResults(res.data.users || []);
      } catch (err) {
        console.error("Search failed:", err.response?.data || err.message);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // FIXED: Close dropdowns when clicking outside - CHECKS BOTH DESKTOP AND MOBILE REFS
  useEffect(() => {
    const handleClickOutside = (e) => {
      // Search dropdown
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setResults([]);
      }
      
      // Notification dropdowns (check both desktop and mobile)
      const clickedInsideDesktopNotif = notifRef.current && notifRef.current.contains(e.target);
      const clickedInsideMobileNotif = mobileNotifRef.current && mobileNotifRef.current.contains(e.target);
      
      if (!clickedInsideDesktopNotif && !clickedInsideMobileNotif) {
        setNotifOpen(false);
      }
      
      // Account dropdown
      if (acctRef.current && !acctRef.current.contains(e.target)) {
        setAcctOpen(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [navigate]);

  // Open notifications dropdown -> refresh list and load reel + story settings once
  const toggleNotif = async () => {
    const next = !notifOpen;
    setNotifOpen(next);
    if (next) {
      try {
        await loadNotifications();
        if (reelAlertsOn === null || storyAlertsOn === null) {
          const res = await getNotificationSettings().catch(() => null);
          const val = res?.data?.settings || {};
          setReelAlertsOn(val.reelPublish === undefined ? true : !!val.reelPublish);
          setStoryAlertsOn(val.storyPublish === undefined ? true : !!val.storyPublish);
        }
      } catch {}
    }
  };

  // Smarter labels: prefer server text; detect reels by link
  const notifLabel = (n) => {
    const serverText = (n?.text || "").trim();
    if (serverText) return serverText;

    const link = String(n?.link || "");
    const isReel = link.startsWith("/reels/");

    switch (n.type) {
      case "reel_publish":
        return "posted a new reel";
      case "story_publish":
        return "posted a new story";
      case "like":
        return isReel ? "liked your reel" : "liked your post";
      case "comment":
        return isReel ? "commented on your reel" : "commented on your post";
      case "reply":
        return "replied to your comment";
      case "comment_like":
        return "liked your comment";
      case "comment_dislike":
        return "disliked your comment";
      case "reply_like":
        return "liked your reply";
      case "reply_dislike":
        return "disliked your reply";
      case "reply_reaction":
        return "reacted to your reply";
      case "comment_reaction":
        return "reacted to your comment";
      case "follow":
        return "started following you";
      case "message":
        return "sent you a message";
      case "call":
        return serverText || "call update";
      case "report_update":
        return serverText || "report update";
      case "moderation":
        return serverText || "moderation update";
      case "story_like":
        return "liked your story";
      case "story_reaction":
        return serverText || "reacted to your story";
      case "story_reply":
        return "replied to your story";
      default:
        return serverText || "Notification";
    }
  };

  const doSwitch = (id) => {
    if (!user || String(user.id) === String(id)) {
      setAcctOpen(false);
      return;
    }
    switchAccount(id);
    refreshAccounts();
    setAcctOpen(false);
    navigate("/");
  };

  const doRemove = (id) => {
    removeAccount(id);
    refreshAccounts();
    setAcctOpen(false);
  };

  return (
    <nav className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 shadow-lg sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div
            className="text-2xl font-bold cursor-pointer bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text hover:from-blue-700 hover:to-purple-700 transition-all duration-300 flex-shrink-0"
            onClick={() => navigate("/home")}
          >
            Connestro
          </div>

          {/* Desktop Search Bar */}
          {user && (
            <div className="hidden md:flex items-center flex-1 max-w-md mx-8 relative" ref={searchRef}>
              <div className={`relative w-full transition-all duration-300 ${searchFocused ? 'scale-105' : ''}`}>
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-full focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 dark:bg-gray-800 dark:text-gray-100 transition-all duration-300"
                />
              </div>
        
              {searchTerm && (
                <div className="absolute top-full mt-2 w-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl z-50 max-h-80 overflow-y-auto">
                  {loading ? (
                    <div className="px-4 py-3 text-gray-500 dark:text-gray-400 text-sm flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                      <span className="ml-2">Searching...</span>
                    </div>
                  ) : results.length > 0 ? (
                    results.map((u) => {
                      const avatar = u.profileImage ? buildFileUrl(u.profileImage) : "/default-avatar.png";
                      return (
                        <div
                          key={u._id}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-all duration-200 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setResults([]);
                            setSearchTerm("");
                            navigate(`/profile/${u._id}`);
                          }}
                        >
                          <img
                            src={avatar}
                            alt={u.username}
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-700"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {highlightText(`${u.firstName} ${u.lastName}`, searchTerm)}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              @{highlightText(u.username, searchTerm)}
                            </p>
                            {u.place && (
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                📍 {highlightText(u.place, searchTerm)}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="px-4 py-6 text-gray-500 dark:text-gray-400 text-center">
                      <p className="text-lg mb-1">No users found</p>
                      <p className="text-sm">Try a different search term</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-6">
            {user && (
              <>
                <Link 
                  className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors duration-200" 
                  to="/"
                >
                  Feed
                </Link>
                <Link 
                  className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors duration-200" 
                  to="/reels"
                >
                  Reels
                </Link>
                <Link 
                  className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors duration-200 relative" 
                  to="/messages"
                >
                  Messages
                  {unreadTotal > 0 && (
                    <span className="absolute -top-2 -right-3 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                      {unreadTotal}
                    </span>
                  )}
                </Link>

                {/* Desktop Notifications Bell */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={toggleNotif}
                    className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                    title="Notifications"
                  >
                    <IoNotificationsOutline className="text-2xl text-gray-600 dark:text-gray-300" />
                    {notifUnread > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                        {notifUnread}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <div className="absolute right-0 mt-2 w-[28rem] bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl z-50">
                      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-bold text-lg">Notifications</h3>
                          <div className="flex gap-2">
                            <button
                              className="text-xs px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors duration-200"
                              onClick={() => markAllNotifsRead().catch(() => {})}
                            >
                              Mark all read
                            </button>
                            <button
                              className="text-xs px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors duration-200"
                              onClick={() => clearAllNotifs().catch(() => {})}
                            >
                              Clear all
                            </button>
                          </div>
                        </div>
                        
                        {/* Desktop Settings Controls */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-2">
                            <button
                              onClick={() => toggleNotifSound()}
                              className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            >
                              {notifSoundEnabled ? <IoVolumeMedium className="text-xl" /> : <IoVolumeMute className="text-xl" />}
                            </button>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.05"
                              value={notifSoundVolume}
                              onChange={(e) => setNotifSoundVolume(Number(e.target.value))}
                              className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                              title={`Volume: ${Math.round(notifSoundVolume * 100)}%`}
                            />
                            <span className="text-xs text-gray-500 dark:text-gray-400 w-10 text-right">
                              {Math.round(notifSoundVolume * 100)}%
                            </span>
                          </div>
                          
                          <div className="flex gap-2">
                            <button
                              className={`flex-1 text-xs px-2 py-1 rounded-lg transition-all duration-200 ${
                                reelAlertsOn 
                                  ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" 
                                  : "bg-gray-100 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400"
                              }`}
                              onClick={async () => {
                                if (reelAlertsOn === null) return;
                                const next = !reelAlertsOn;
                                setReelAlertsOn(next);
                                try {
                                  await updateNotificationSettings({ reelPublish: next });
                                } catch (e) {
                                  setReelAlertsOn(!next);
                                  console.error("Failed to update reel alert setting", e);
                                }
                              }}
                              disabled={reelAlertsOn === null}
                            >
                              Reels: {reelAlertsOn === null ? "..." : reelAlertsOn ? "ON" : "OFF"}
                            </button>
                            
                            <button
                              className={`flex-1 text-xs px-2 py-1 rounded-lg transition-all duration-200 ${
                                storyAlertsOn 
                                  ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" 
                                  : "bg-gray-100 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400"
                              }`}
                              onClick={async () => {
                                if (storyAlertsOn === null) return;
                                const next = !storyAlertsOn;
                                setStoryAlertsOn(next);
                                try {
                                  await updateNotificationSettings({ storyPublish: next });
                                } catch (e) {
                                  setStoryAlertsOn(!next);
                                  console.error("Failed to update story alert setting", e);
                                }
                              }}
                              disabled={storyAlertsOn === null}
                            >
                              Stories: {storyAlertsOn === null ? "..." : storyAlertsOn ? "ON" : "OFF"}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-8 text-center">
                            <IoNotificationsOutline className="text-5xl text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                            <p className="text-gray-500 dark:text-gray-400">No notifications yet</p>
                          </div>
                        ) : (
                          notifications.slice(0, 10).map((n) => {
                            const avatar = n.actor?.profileImage
                              ? buildFileUrl(n.actor.profileImage)
                              : "/default-avatar.png";
                            const label = notifLabel(n);
                            return (
                              <div
                                key={n._id}
                                className={`flex items-start gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200 ${
                                  !n.read ? "bg-blue-50 dark:bg-blue-900/10" : ""
                                }`}
                              >
                                <img
                                  src={avatar}
                                  alt=""
                                  className="w-10 h-10 rounded-full object-cover cursor-pointer ring-2 ring-gray-200 dark:ring-gray-700 hover:ring-blue-400 dark:hover:ring-blue-600 transition-all duration-200"
                                  onClick={() => {
                                    if (!n.read) markNotifRead(n._id).catch(() => {});
                                    if (n.actor?._id) navigate(`/profile/${n.actor._id}`);
                                    setNotifOpen(false);
                                  }}
                                />
                                <div className="flex-1">
                                  <button
                                    className="text-left w-full group"
                                    onClick={() => {
                                      if (!n.read) markNotifRead(n._id).catch(() => {});
                                      if (n.link) navigate(n.link);
                                      setNotifOpen(false);
                                    }}
                                  >
                                    <div className="text-sm">
                                      <span className="font-semibold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                        @{n.actor?.username || "user"}
                                      </span>{" "}
                                      <span className="text-gray-600 dark:text-gray-300">{label}</span>
                                    </div>
                                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                      {new Date(n.createdAt).toLocaleString()}
                                    </div>
                                  </button>
                                </div>

                                <div className="flex items-center gap-1">
                                  {!n.read && (
                                    <button
                                      className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-full transition-all duration-200"
                                      title="Mark as read"
                                      onClick={() => markNotifRead(n._id).catch(() => {})}
                                    >
                                      <IoCheckmarkDoneSharp />
                                    </button>
                                  )}
                                  <button
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition-all duration-200"
                                    title="Remove"
                                    onClick={() => deleteNotif(n._id).catch(() => {})}
                                  >
                                    <IoClose />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      <div className="p-3">
                        <button
                          className="w-full text-center text-sm px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 font-medium"
                          onClick={() => {
                            setNotifOpen(false);
                            navigate("/notifications");
                          }}
                        >
                          View all notifications
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <Link 
                  className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors duration-200" 
                  to="/my-reports"
                >
                  Reports
                </Link>

                {user?.role === "admin" && (
                  <Link 
                    className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium transition-colors duration-200" 
                    to="/admin"
                  >
                    Admin
                  </Link>
                )}

                {/* Account Menu */}
                <div className="relative" ref={acctRef}>
                  <button
                    onClick={() => setAcctOpen((v) => !v)}
                    className="flex items-center gap-2 px-3 py-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200"
                  >
                    <IoPersonCircleOutline className="text-xl" />
                    <span className="font-medium">Account</span>
                  </button>
                  
                  {acctOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl z-50">
                      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="font-bold text-lg">Switch Account</h3>
                      </div>

                      <div className="max-h-64 overflow-y-auto p-2">
                        {accounts.length === 0 ? (
                          <div className="px-3 py-4 text-center text-gray-500 dark:text-gray-400">
                            <p>No other accounts</p>
                          </div>
                        ) : (
                          accounts.map((a) => {
                            const active = user && String(user.id) === String(a.id);
                            const seed = new Date(a?.user?.updatedAt || Date.now()).getTime();
                            const avatar = a?.user?.profileImage
                              ? buildFileUrl(a.user.profileImage, seed)
                              : "/default-avatar.png";
                            return (
                              <div
                                key={a.id}
                                className={`flex items-center justify-between px-3 py-2 rounded-xl mb-1 ${
                                  active 
                                    ? "bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700" 
                                    : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                } transition-all duration-200`}
                              >
                                <button
                                  className="flex-1 flex items-center gap-3"
                                  onClick={() => doSwitch(a.id)}
                                >
                                  <img
                                    src={avatar}
                                    alt=""
                                    className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-700"
                                  />
                                  <div className="text-left">
                                    <p className={`font-medium ${active ? "text-blue-600 dark:text-blue-400" : ""}`}>
                                      @{a.username}
                                    </p>
                                    {active && (
                                      <p className="text-xs text-gray-500 dark:text-gray-400">Currently active</p>
                                    )}
                                  </div>
                                </button>
                                {!active && (
                                  <button
                                    className="text-xs px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors duration-200"
                                    onClick={() => doRemove(a.id)}
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>

                      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                        <Link
                          to={`/profile/${user?.id}`}
                          className="block w-full text-center px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 font-medium mb-2"
                          onClick={() => setAcctOpen(false)}
                        >
                          View Profile
                        </Link>
                        <button
                          className="w-full text-center px-4 py-2 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors duration-200 font-medium"
                          onClick={() => {
                            setAcctOpen(false);
                            navigate("/login");
                          }}
                        >
                          Add Another Account
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {user ? (
              <button
                onClick={logout}
                className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-2 rounded-full hover:from-red-600 hover:to-pink-600 transition-all duration-300 font-medium shadow-md hover:shadow-lg"
              >
                Logout
              </button>
            ) : (
              <>
                <Link
                  className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-full hover:from-blue-600 hover:to-blue-700 transition-all duration-300 font-medium shadow-md hover:shadow-lg"
                  to="/login"
                >
                  Login
                </Link>
                <Link
                  className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-full hover:from-green-600 hover:to-emerald-600 transition-all duration-300 font-medium shadow-md hover:shadow-lg"
                  to="/signup"
                >
                  Sign Up
                </Link>
              </>
            )}

            <button
              onClick={toggleDarkMode}
              className="p-2.5 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-300 text-gray-600 dark:text-gray-300"
            >
              {darkMode ? <FaSun className="text-yellow-400" /> : <FaMoon className="text-gray-600" />}
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-3">
            {user && (
              <>
                {/* Mobile Notifications Bell */}
                <button
                  onClick={toggleNotif}
                  className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <IoNotificationsOutline className="text-2xl" />
                  {notifUnread > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {notifUnread}
                    </span>
                  )}
                </button>
              </>
            )}
            
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {darkMode ? <FaSun className="text-yellow-400" /> : <FaMoon />}
            </button>
            
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {mobileMenuOpen ? <FaTimes className="text-xl" /> : <FaBars className="text-xl" />}
            </button>
          </div>
        </div>

        {/* Mobile Search */}
        {user && (
          <div className="md:hidden pb-3 px-2" ref={searchRef}>
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-full focus:outline-none focus:border-blue-500 dark:bg-gray-800"
              />
            </div>
            {searchTerm && (
              <div className="absolute left-4 right-4 mt-2 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl z-50 max-h-80 overflow-y-auto">
                {loading ? (
                  <div className="px-4 py-3 text-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mx-auto"></div>
                  </div>
                ) : results.length > 0 ? (
                  results.map((u) => {
                    const avatar = u.profileImage
                      ? buildFileUrl(u.profileImage)
                      : "/default-avatar.png";
                    return (
                      <div
                        key={u._id}
                        className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0"
                        onClick={() => {
                          setResults([]);
                          setSearchTerm("");
                          navigate(`/profile/${u._id}`);
                        }}
                      >
                        <img src={avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                        <div>
                          <p className="font-medium">
                            {highlightText(`${u.firstName} ${u.lastName}`, searchTerm)}
                          </p>
                          <p className="text-sm text-gray-500">
                            @{highlightText(u.username, searchTerm)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="px-4 py-6 text-center text-gray-500">No users found</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 bg-white dark:bg-gray-900 z-40 overflow-y-auto">
          <div className="px-4 py-6 space-y-4">
            {user ? (
              <>
                <Link
                  to="/"
                  className="block px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Feed
                </Link>
                <Link
                  to="/reels"
                  className="block px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Reels
                </Link>
                <Link
                  to="/messages"
                  className="block px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 relative"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Messages
                  {unreadTotal > 0 && (
                    <span className="absolute top-3 right-4 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                      {unreadTotal}
                    </span>
                  )}
                </Link>
                <Link
                  to="/notifications"
                  className="block px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  All Notifications
                </Link>
                <Link
                  to="/my-reports"
                  className="block px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  My Reports
                </Link>
                <Link
                  to={`/profile/${user?.id}`}
                  className="block px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  My Profile
                </Link>
                {user?.role === "admin" && (
                  <Link
                    to="/admin"
                    className="block px-4 py-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Admin Dashboard
                  </Link>
                )}
                
                {/* Mobile Accounts Section */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h3 className="font-bold mb-3 px-4">Switch Account</h3>
                  {accounts.map((a) => {
                    const active = user && String(user.id) === String(a.id);
                    const avatar = a?.user?.profileImage
                      ? buildFileUrl(a.user.profileImage)
                      : "/default-avatar.png";
                    return (
                      <div
                        key={a.id}
                        className={`flex items-center justify-between px-4 py-3 rounded-xl mb-2 ${
                          active ? "bg-blue-50 dark:bg-blue-900/20" : "bg-gray-50 dark:bg-gray-800"
                        }`}
                      >
                        <button
                          className="flex items-center gap-3 flex-1"
                          onClick={() => {
                            doSwitch(a.id);
                            setMobileMenuOpen(false);
                          }}
                        >
                          <img src={avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                          <span className={active ? "font-bold text-blue-600 dark:text-blue-400" : ""}>
                            @{a.username}
                            {active && " (current)"}
                          </span>
                        </button>
                        {!active && (
                          <button
                            className="text-xs px-3 py-1.5 rounded-full bg-red-100 text-red-600"
                            onClick={() => doRemove(a.id)}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    );
                  })}
                  <Link
                    to="/login"
                    className="block px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-center mt-3"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Add Another Account
                  </Link>
                </div>

                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-red-500 text-white font-medium"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="block px-4 py-3 rounded-xl bg-blue-500 text-white text-center font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="block px-4 py-3 rounded-xl bg-green-500 text-white text-center font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      {/* Mobile Notifications Panel - SEPARATE REF */}
      {notifOpen && (
        <div 
          ref={mobileNotifRef}
          className="md:hidden fixed inset-0 top-16 bg-white dark:bg-gray-900 z-50 overflow-y-auto"
        >
          <div className="px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Notifications</h3>
              <button 
                onClick={() => setNotifOpen(false)} 
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <IoClose className="text-2xl" />
              </button>
            </div>

            {/* Mobile Notification Settings */}
            <div className="mb-4 space-y-3">
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                <button 
                  onClick={() => toggleNotifSound()}
                  className="hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded-full transition-colors"
                >
                  {notifSoundEnabled ? <IoVolumeMedium className="text-xl" /> : <IoVolumeMute className="text-xl" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={notifSoundVolume}
                  onChange={(e) => setNotifSoundVolume(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm w-12 text-right">{Math.round(notifSoundVolume * 100)}%</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    reelAlertsOn ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                  }`}
                  onClick={async () => {
                    if (reelAlertsOn === null) return;
                    const next = !reelAlertsOn;
                    setReelAlertsOn(next);
                    try {
                      await updateNotificationSettings({ reelPublish: next });
                    } catch (err) {
                      setReelAlertsOn(!next);
                      console.error("Failed to update reel alert setting", err);
                    }
                  }}
                  disabled={reelAlertsOn === null}
                >
                  Reel Alerts: {reelAlertsOn === null ? "..." : reelAlertsOn ? "ON" : "OFF"}
                </button>
                
                <button
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    storyAlertsOn ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                  }`}
                  onClick={async () => {
                    if (storyAlertsOn === null) return;
                    const next = !storyAlertsOn;
                    setStoryAlertsOn(next);
                    try {
                      await updateNotificationSettings({ storyPublish: next });
                    } catch (err) {
                      setStoryAlertsOn(!next);
                      console.error("Failed to update story alert setting", err);
                    }
                  }}
                  disabled={storyAlertsOn === null}
                >
                  Story Alerts: {storyAlertsOn === null ? "..." : storyAlertsOn ? "ON" : "OFF"}
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  className="flex-1 px-3 py-2 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                  onClick={() => markAllNotifsRead().catch(() => {})}
                >
                  Mark all read
                </button>
                <button
                  className="flex-1 px-3 py-2 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                  onClick={() => clearAllNotifs().catch(() => {})}
                >
                  Clear all
                </button>
              </div>
            </div>

            {/* Mobile Notifications List */}
            <div className="space-y-2">
              {notifications.length === 0 ? (
                <div className="text-center py-8">
                  <IoNotificationsOutline className="text-5xl text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-500 dark:text-gray-400">No notifications yet</p>
                </div>
              ) : (
                notifications.slice(0, 10).map((n) => {
                  const avatar = n.actor?.profileImage
                    ? buildFileUrl(n.actor.profileImage)
                    : "/default-avatar.png";
                  const label = notifLabel(n);
                  return (
                    <div
                      key={n._id}
                      className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${
                        !n.read ? "bg-blue-50 dark:bg-blue-900/10" : "bg-gray-50 dark:bg-gray-800"
                      }`}
                    >
                      <img
                        src={avatar}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-700"
                        onClick={() => {
                          if (!n.read) markNotifRead(n._id).catch(() => {});
                          if (n.actor?._id) navigate(`/profile/${n.actor._id}`);
                          setNotifOpen(false);
                        }}
                      />
                      <div className="flex-1">
                        <button
                          className="text-left w-full"
                          onClick={() => {
                            if (!n.read) markNotifRead(n._id).catch(() => {});
                            if (n.link) navigate(n.link);
                            setNotifOpen(false);
                          }}
                        >
                          <p className="text-sm">
                            <span className="font-semibold">@{n.actor?.username || "user"}</span> {label}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {new Date(n.createdAt).toLocaleString()}
                          </p>
                        </button>
                      </div>
                      <div className="flex gap-1">
                        {!n.read && (
                          <button
                            className="p-1.5 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-full transition-colors"
                            onClick={() => markNotifRead(n._id).catch(() => {})}
                          >
                            <IoCheckmarkDoneSharp />
                          </button>
                        )}
                        <button
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition-colors"
                          onClick={() => deleteNotif(n._id).catch(() => {})}
                        >
                          <IoClose />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <button
              className="w-full mt-4 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 font-medium transition-colors"
              onClick={() => {
                setNotifOpen(false);
                navigate("/notifications");
              }}
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}