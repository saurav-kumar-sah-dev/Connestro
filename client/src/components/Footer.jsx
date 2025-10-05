// src/components/Footer.jsx
import { Link } from "react-router-dom";
import { 
  FaLinkedinIn, 
  FaInstagram, 
  FaGithub, 
  FaEnvelope,
  FaHome,
  FaNewspaper,
  FaUserCircle,
  FaShieldAlt,
  FaFileContract,
  FaCog,
  FaHeart,
  FaArrowUp
} from "react-icons/fa";
import { IoSparkles } from "react-icons/io5";
import { useTheme } from "../context/ThemeContext";
import { useState, useEffect } from "react";

export default function Footer() {
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  })();

  const { darkMode } = useTheme();
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Show scroll to top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const year = new Date().getFullYear();

  return (
    <footer className={`relative mt-auto ${darkMode ? "bg-gradient-to-b from-gray-900 to-black" : "bg-gradient-to-b from-gray-50 to-white"} transition-all duration-300`}>
      {/* Decorative Wave */}
      <div className="absolute top-0 left-0 right-0 overflow-hidden">
        <svg 
          className={`w-full h-12 ${darkMode ? "text-gray-800" : "text-gray-100"}`} 
          preserveAspectRatio="none" 
          viewBox="0 0 1440 54"
        >
          <path 
            fill="currentColor" 
            d="M0,22 C120,42 240,2 360,12 C480,22 600,52 720,32 C840,12 960,2 1080,22 C1200,42 1320,52 1440,32 L1440,0 L0,0 Z"
            opacity="0.3"
          />
          <path 
            fill="currentColor" 
            d="M0,32 C120,12 240,42 360,32 C480,22 600,2 720,22 C840,42 960,52 1080,32 C1200,12 1320,2 1440,22 L1440,0 L0,0 Z"
            opacity="0.5"
          />
        </svg>
      </div>

      {/* Gradient accent bar */}
      <div className="h-1.5 bg-gradient-to-r from-blue-600 via-purple-500 to-pink-500 shadow-lg shadow-purple-500/20" />

      {/* Main Footer Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur-lg opacity-60 animate-pulse"></div>
                <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg font-bold text-xl tracking-wide shadow-xl">
                  Connestro
                </div>
              </div>
              <IoSparkles className="text-yellow-500 text-xl animate-pulse" />
            </div>
            
            <p className={`text-sm leading-relaxed ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
              Where connections grow stronger. Join our community and share your stories with the world.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className={`font-bold text-lg flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
              <FaNewspaper className="text-blue-500" />
              Quick Links
            </h3>
            <ul className="space-y-3">
              <li>
                <Link 
                  to="/" 
                  className={`flex items-center gap-2 text-sm ${
                    darkMode ? "text-gray-400 hover:text-blue-400" : "text-gray-600 hover:text-blue-600"
                  } transition-all duration-200 group`}
                >
                  <span className="transform group-hover:translate-x-1 transition-transform">→</span>
                  Feed
                </Link>
              </li>
              <li>
                <Link 
                  to="/home" 
                  className={`flex items-center gap-2 text-sm ${
                    darkMode ? "text-gray-400 hover:text-blue-400" : "text-gray-600 hover:text-blue-600"
                  } transition-all duration-200 group`}
                >
                  <span className="transform group-hover:translate-x-1 transition-transform">→</span>
                  Home
                </Link>
              </li>
              <li>
                <Link 
                  to="/reels" 
                  className={`flex items-center gap-2 text-sm ${
                    darkMode ? "text-gray-400 hover:text-blue-400" : "text-gray-600 hover:text-blue-600"
                  } transition-all duration-200 group`}
                >
                  <span className="transform group-hover:translate-x-1 transition-transform">→</span>
                  Reels
                </Link>
              </li>
              {user && (
                <>
                  <li>
                    <Link 
                      to={`/profile/${user.id}`} 
                      className={`flex items-center gap-2 text-sm ${
                        darkMode ? "text-gray-400 hover:text-blue-400" : "text-gray-600 hover:text-blue-600"
                      } transition-all duration-200 group`}
                    >
                      <span className="transform group-hover:translate-x-1 transition-transform">→</span>
                      My Profile
                    </Link>
                  </li>
                  <li>
                    <Link 
                      to="/messages" 
                      className={`flex items-center gap-2 text-sm ${
                        darkMode ? "text-gray-400 hover:text-blue-400" : "text-gray-600 hover:text-blue-600"
                      } transition-all duration-200 group`}
                    >
                      <span className="transform group-hover:translate-x-1 transition-transform">→</span>
                      Messages
                    </Link>
                  </li>
                </>
              )}
              {user?.role === "admin" && (
                <li>
                  <Link 
                    to="/admin" 
                    className={`flex items-center gap-2 text-sm ${
                      darkMode ? "text-purple-400 hover:text-purple-300" : "text-purple-600 hover:text-purple-700"
                    } transition-all duration-200 group font-medium`}
                  >
                    <span className="transform group-hover:translate-x-1 transition-transform">→</span>
                    Admin Dashboard
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Legal Links */}
          <div className="space-y-4">
            <h3 className={`font-bold text-lg flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
              <FaShieldAlt className="text-green-500" />
              Legal
            </h3>
            <ul className="space-y-3">
              <li>
                <Link 
                  to="/terms#terms" 
                  className={`flex items-center gap-2 text-sm ${
                    darkMode ? "text-gray-400 hover:text-blue-400" : "text-gray-600 hover:text-blue-600"
                  } transition-all duration-200 group`}
                >
                  <FaFileContract className="text-xs" />
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link 
                  to="/terms#privacy" 
                  className={`flex items-center gap-2 text-sm ${
                    darkMode ? "text-gray-400 hover:text-blue-400" : "text-gray-600 hover:text-blue-600"
                  } transition-all duration-200 group`}
                >
                  <FaShieldAlt className="text-xs" />
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link 
                  to="/terms#cookies" 
                  className={`flex items-center gap-2 text-sm ${
                    darkMode ? "text-gray-400 hover:text-blue-400" : "text-gray-600 hover:text-blue-600"
                  } transition-all duration-200 group`}
                >
                  <FaCog className="text-xs" />
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link 
                  to="/terms#guidelines" 
                  className={`flex items-center gap-2 text-sm ${
                    darkMode ? "text-gray-400 hover:text-blue-400" : "text-gray-600 hover:text-blue-600"
                  } transition-all duration-200 group`}
                >
                  <FaFileContract className="text-xs" />
                  Community Guidelines
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Social */}
          <div className="space-y-4">
            <h3 className={`font-bold text-lg flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
              <FaEnvelope className="text-red-500" />
              Get in Touch
            </h3>
            
            {/* Contact Card */}
            <div className={`p-4 rounded-xl ${darkMode ? "bg-gray-800/50" : "bg-gray-100/80"} backdrop-blur-sm space-y-3`}>
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${darkMode ? "text-gray-500" : "text-gray-500"}`}>
                  Email Us
                </p>
                <a
                  href="mailto:sauravshubham903@gmail.com"
                  className={`text-sm ${
                    darkMode ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"
                  } transition-colors duration-200 break-all`}
                >
                  sauravshubham903@gmail.com
                </a>
              </div>
              
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${darkMode ? "text-gray-500" : "text-gray-500"}`}>
                  Follow Us
                </p>
                <div className="flex gap-3">
                  <a
                    href="https://www.linkedin.com/in/sauravkumarsah-dev/"
                    aria-label="LinkedIn"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-2.5 rounded-lg ${
                      darkMode 
                        ? "bg-gray-900 hover:bg-blue-900/50 text-gray-400 hover:text-blue-400" 
                        : "bg-white hover:bg-blue-50 text-gray-600 hover:text-blue-600"
                    } transition-all duration-200 transform hover:scale-110 hover:rotate-3`}
                    title="LinkedIn"
                  >
                    <FaLinkedinIn size={18} />
                  </a>
                  <a
                    href="https://github.com/saurav-kumar-sah-dev"
                    aria-label="GitHub"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-2.5 rounded-lg ${
                      darkMode 
                        ? "bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white" 
                        : "bg-white hover:bg-gray-100 text-gray-600 hover:text-gray-900"
                    } transition-all duration-200 transform hover:scale-110 hover:rotate-3`}
                    title="GitHub"
                  >
                    <FaGithub size={18} />
                  </a>
                  <a
                    href="https://instagram.com/saurav_shubham903"
                    aria-label="Instagram"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-2.5 rounded-lg ${
                      darkMode 
                        ? "bg-gray-900 hover:bg-pink-900/50 text-gray-400 hover:text-pink-400" 
                        : "bg-white hover:bg-pink-50 text-gray-600 hover:text-pink-500"
                    } transition-all duration-200 transform hover:scale-110 hover:rotate-3`}
                    title="Instagram"
                  >
                    <FaInstagram size={18} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className={`mt-12 pt-8 border-t ${darkMode ? "border-gray-800" : "border-gray-200"}`}>
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-2">
              <span className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                © {year} Connestro. Built with
              </span>
              <FaHeart className="text-red-500 animate-pulse" size={14} />
              <span className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                by Saurav
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-500"}`}>
                Version 2.0.1
              </span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                darkMode 
                  ? "bg-green-900/50 text-green-400 border border-green-800" 
                  : "bg-green-100 text-green-700 border border-green-300"
              }`}>
                🟢 All systems operational
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className={`fixed bottom-8 right-8 p-3 rounded-full shadow-lg transform transition-all duration-300 hover:scale-110 z-50 ${
            darkMode 
              ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-purple-500/50" 
              : "bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:shadow-blue-500/50"
          }`}
          title="Scroll to top"
        >
          <FaArrowUp size={20} />
        </button>
      )}

      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500 rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-blue-500 rounded-full filter blur-3xl"></div>
      </div>
    </footer>
  );
}