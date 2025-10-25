import { Link, useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useMemo } from "react";
import clsx from "clsx";
import {
  IoHomeOutline,
  IoRocketOutline,
  IoSearchOutline,
  IoArrowBackOutline,
  IoSparkles,
  IoPlanetOutline,
  IoStarOutline,
  IoHeartOutline,
} from "react-icons/io5";

const styles = {
  container:
    "min-h-screen flex flex-col justify-center items-center text-center px-4 sm:px-6 lg:px-8 relative overflow-hidden transition-all duration-700",
  containerLight: "bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50",
  containerDark: "bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900",

  contentWrapper: "relative z-10 max-w-4xl mx-auto py-12 sm:py-16 lg:py-20",

  heroSection: "space-y-8 sm:space-y-10 lg:space-y-12",

  sparkleContainer: "flex justify-center mb-8 sm:mb-10 relative",
  
  sparkleIcon: 
    "relative p-4 sm:p-5 lg:p-6 rounded-3xl shadow-2xl backdrop-blur-xl transform hover:rotate-12 transition-all duration-500 group",
  sparkleIconLight: "bg-gradient-to-br from-red-400/90 to-orange-500/90",
  sparkleIconDark: "bg-gradient-to-br from-red-500/80 to-orange-600/80",

  heading:
    "text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-4 sm:mb-6 tracking-tight leading-[1.1] drop-shadow-2xl transition-all duration-500 animate-fade-in-down",
  headingLight: "text-slate-900",
  headingDark: "text-white",

  errorNumber:
    "block sm:inline text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-orange-600 to-yellow-600 animate-gradient-shift",

  subtitle:
    "text-lg sm:text-xl md:text-2xl font-medium mb-4 transition-all duration-500 animate-fade-in opacity-90",
  subtitleLight: "text-slate-600",
  subtitleDark: "text-slate-300",

  tagline:
    "text-base sm:text-lg md:text-xl lg:text-2xl leading-relaxed mb-12 sm:mb-14 max-w-3xl mx-auto transition-all duration-500 animate-fade-in-up px-4",
  taglineLight: "text-slate-700",
  taglineDark: "text-slate-300",

  taglineHighlight:
    "font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600",

  buttonsContainer: "flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 px-4",

  ctaPrimary:
    "group relative px-8 sm:px-10 lg:px-14 py-4 sm:py-5 lg:py-6 rounded-full font-bold text-base sm:text-lg lg:text-xl shadow-2xl transition-all transform duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] overflow-hidden w-full sm:w-auto max-w-xs sm:max-w-none",
  ctaPrimaryLight:
    "bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white hover:scale-105 hover:from-blue-500 hover:to-pink-500",
  ctaPrimaryDark:
    "bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white hover:scale-105 hover:from-blue-400 hover:to-pink-400",

  ctaSecondary:
    "group relative px-8 sm:px-10 lg:px-14 py-4 sm:py-5 lg:py-6 rounded-full font-semibold text-base sm:text-lg lg:text-xl border-2 transition-all transform duration-500 hover:-translate-y-2 hover:shadow-xl backdrop-blur-2xl w-full sm:w-auto max-w-xs sm:max-w-none cursor-pointer",
  ctaSecondaryLight:
    "bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 border-slate-300/60 hover:bg-gradient-to-r hover:from-slate-200 hover:to-slate-300 hover:scale-105 hover:border-blue-400/50 hover:shadow-lg",
  ctaSecondaryDark:
    "bg-gradient-to-r from-slate-800 to-slate-700 text-slate-200 border-slate-600/60 hover:bg-gradient-to-r hover:from-slate-700 hover:to-slate-600 hover:scale-105 hover:border-blue-400/50 hover:shadow-lg",

  buttonIcon: "text-xl sm:text-2xl transition-all duration-300",
  
  footer:
    "mt-16 sm:mt-20 text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed transition-all duration-500 animate-fade-in px-4",
  footerLight: "text-slate-600",
  footerDark: "text-slate-400",

  decorativeDivider: "mt-10 sm:mt-12 flex items-center justify-center gap-3 sm:gap-4",
  
  floatingIcon: "absolute animate-float opacity-20",
  floatingIconLight: "text-slate-700",
  floatingIconDark: "text-slate-300",

  shimmer: "absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent",

  quickLinksContainer: "mt-8 pt-6 border-t",
  quickLinksContainerLight: "border-slate-200",
  quickLinksContainerDark: "border-slate-700",

  quickLinksTitle: "text-sm mb-4",
  quickLinksTitleLight: "text-slate-500",
  quickLinksTitleDark: "text-slate-400",

  quickLinksGrid: "flex flex-wrap justify-center gap-2 sm:gap-3",

  quickLink: "px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105",
  quickLinkLight: "bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800",
  quickLinkDark: "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white",

  funMessage: "mt-6 text-sm",
  funMessageLight: "text-slate-400",
  funMessageDark: "text-slate-500",
};

export default function NotFound() {
  const { darkMode } = useTheme();
  const navigate = useNavigate();

  const user = useMemo(() => {
    try {
      const userData = localStorage.getItem("user");
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      return null;
    }
  }, []);

  // Smart back navigation - goes to previous page or fallback
  const handleGoBack = () => {
    // Check if there's history to go back to
    if (window.history.length > 1) {
      navigate(-1); // Go back to previous page
    } else {
      // Fallback to appropriate page based on user status
      if (user) {
        navigate('/'); // Go to feed if user is logged in
      } else {
        navigate('/home'); // Go to landing if not logged in
      }
    }
  };

  return (
    <div
      className={clsx(
        styles.container,
        darkMode ? styles.containerDark : styles.containerLight
      )}
    >
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Animated Gradient Orbs */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div
            className={`absolute top-[10%] left-[10%] w-64 sm:w-72 lg:w-96 h-64 sm:h-72 lg:h-96 ${
              darkMode ? "bg-red-600" : "bg-red-400"
            } rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob`}
          />
          <div
            className={`absolute top-[30%] right-[10%] w-64 sm:w-72 lg:w-96 h-64 sm:h-72 lg:h-96 ${
              darkMode ? "bg-orange-600" : "bg-orange-400"
            } rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000`}
          />
          <div
            className={`absolute bottom-[10%] left-[30%] w-64 sm:w-72 lg:w-96 h-64 sm:h-72 lg:h-96 ${
              darkMode ? "bg-yellow-600" : "bg-yellow-400"
            } rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000`}
          />
        </div>

        {/* Mesh Gradient */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: darkMode
              ? "radial-gradient(at 40% 20%, hsla(0,100%,74%,0.3) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(30,100%,56%,0.3) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(60,100%,93%,0.3) 0px, transparent 50%)"
              : "radial-gradient(at 40% 20%, hsla(0,100%,74%,0.2) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(30,100%,56%,0.2) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(60,100%,93%,0.2) 0px, transparent 50%)",
          }}
        />

        {/* Refined Grid */}
        <div
          className={`absolute inset-0 ${darkMode ? "opacity-[0.03]" : "opacity-[0.05]"}`}
          style={{
            backgroundImage: `linear-gradient(${
              darkMode ? "#ffffff" : "#000000"
            } 1px, transparent 1px), linear-gradient(90deg, ${
              darkMode ? "#ffffff" : "#000000"
            } 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        {/* Radial Spotlight */}
        <div
          className="absolute inset-0"
          style={{
            background: darkMode
              ? "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(255,100,100,0.15), transparent 70%)"
              : "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(255,255,255,0.5), transparent 70%)",
          }}
        />

        {/* Floating Decorative Icons */}
        <IoPlanetOutline
          className={clsx(
            styles.floatingIcon,
            darkMode ? styles.floatingIconDark : styles.floatingIconLight,
            "top-[15%] left-[5%] text-3xl sm:text-4xl lg:text-5xl"
          )}
        />
        <IoStarOutline
          className={clsx(
            styles.floatingIcon,
            darkMode ? styles.floatingIconDark : styles.floatingIconLight,
            "top-[20%] right-[8%] text-2xl sm:text-3xl lg:text-4xl animation-delay-2000"
          )}
        />
        <IoHeartOutline
          className={clsx(
            styles.floatingIcon,
            darkMode ? styles.floatingIconDark : styles.floatingIconLight,
            "bottom-[20%] left-[8%] text-2xl sm:text-3xl lg:text-4xl animation-delay-4000"
          )}
        />
        <IoSparkles
          className={clsx(
            styles.floatingIcon,
            darkMode ? styles.floatingIconDark : styles.floatingIconLight,
            "bottom-[15%] right-[5%] text-3xl sm:text-4xl lg:text-5xl animation-delay-3000"
          )}
        />
      </div>

      {/* Main Content */}
      <div className={styles.contentWrapper}>
        <div className={styles.heroSection}>
          {/* Animated 404 Icon */}
          <div className={styles.sparkleContainer}>
            <div
              className={clsx(
                styles.sparkleIcon,
                darkMode ? styles.sparkleIconDark : styles.sparkleIconLight
              )}
            >
              <IoSearchOutline className="text-white text-3xl sm:text-4xl lg:text-5xl group-hover:scale-110 transition-transform duration-500" />
              <div className="absolute inset-0 rounded-3xl bg-white/20 blur-xl group-hover:bg-white/30 transition-all duration-500" />
            </div>
          </div>

          {/* Hero Heading */}
          <div>
            <h1
              className={clsx(
                styles.heading,
                darkMode ? styles.headingDark : styles.headingLight
              )}
            >
              Oops! Page{" "}
              <span className={styles.errorNumber}>404</span>{" "}
              Not Found
            </h1>
            
            <p
              className={clsx(
                styles.subtitle,
                darkMode ? styles.subtitleDark : styles.subtitleLight
              )}
            >
              Lost in the Digital Universe
            </p>
          </div>

          {/* Tagline */}
          <p
            className={clsx(
              styles.tagline,
              darkMode ? styles.taglineDark : styles.taglineLight
            )}
          >
            The page you're looking for has{" "}
            <span className={styles.taglineHighlight}>
              vanished into the digital void.
            </span>{" "}
            But don't worry, we'll help you find your way back to the amazing content on Connestro!
          </p>

          {/* CTA Buttons */}
          <div className={styles.buttonsContainer}>
            {user ? (
              <Link
                to="/"
                className={clsx(
                  styles.ctaPrimary,
                  darkMode ? styles.ctaPrimaryDark : styles.ctaPrimaryLight
                )}
                aria-label="Go to feed"
              >
                <span className="relative z-10 flex items-center justify-center gap-3">
                  <IoRocketOutline className={clsx(styles.buttonIcon, "group-hover:rotate-12")} />
                  <span>Back to Feed</span>
                  <IoRocketOutline className={clsx(styles.buttonIcon, "group-hover:-rotate-12")} />
                </span>
                <div className={styles.shimmer} />
              </Link>
            ) : (
              <Link
                to="/home"
                className={clsx(
                  styles.ctaPrimary,
                  darkMode ? styles.ctaPrimaryDark : styles.ctaPrimaryLight
                )}
                aria-label="Go to home"
              >
                <span className="relative z-10 flex items-center justify-center gap-3">
                  <IoHomeOutline className={clsx(styles.buttonIcon, "group-hover:scale-110")} />
                  <span>Go to Home</span>
                </span>
                <div className={styles.shimmer} />
              </Link>
            )}

            <button
              onClick={handleGoBack}
              className={clsx(
                styles.ctaPrimary,
                darkMode ? styles.ctaPrimaryDark : styles.ctaPrimaryLight
              )}
              aria-label="Go back to previous page"
            >
              <span className="relative z-10 flex items-center justify-center gap-3">
                <IoArrowBackOutline className={clsx(styles.buttonIcon, "group-hover:-translate-x-1 group-hover:scale-110")} />
                <span className="group-hover:translate-x-0.5 transition-transform duration-300">Go Back</span>
              </span>
              <div className={styles.shimmer} />
            </button>
          </div>

          {/* Quick Links */}
          <div className={clsx(
            styles.quickLinksContainer,
            darkMode ? styles.quickLinksContainerDark : styles.quickLinksContainerLight
          )}>
            <p className={clsx(
              styles.quickLinksTitle,
              darkMode ? styles.quickLinksTitleDark : styles.quickLinksTitleLight
            )}>
              Try these popular pages:
            </p>
            <div className={styles.quickLinksGrid}>
              <Link
                to="/reels"
                className={clsx(
                  styles.quickLink,
                  darkMode ? styles.quickLinkDark : styles.quickLinkLight
                )}
              >
                🎬 Reels
              </Link>
              <Link
                to="/messages"
                className={clsx(
                  styles.quickLink,
                  darkMode ? styles.quickLinkDark : styles.quickLinkLight
                )}
              >
                💬 Messages
              </Link>
              <Link
                to="/notifications"
                className={clsx(
                  styles.quickLink,
                  darkMode ? styles.quickLinkDark : styles.quickLinkLight
                )}
              >
                🔔 Notifications
              </Link>
              <Link
                to="/"
                className={clsx(
                  styles.quickLink,
                  darkMode ? styles.quickLinkDark : styles.quickLinkLight
                )}
              >
                📱 Feed
              </Link>
            </div>
          </div>

          {/* Footer Text */}
          <p
            className={clsx(
              styles.footer,
              darkMode ? styles.footerDark : styles.footerLight
            )}
          >
            Don't worry, even the best explorers sometimes get lost. 
            <span className={styles.taglineHighlight}> Let's get you back on track!</span>
          </p>

          {/* Decorative Divider */}
          <div className={styles.decorativeDivider}>
            <div
              className={`h-px w-20 sm:w-24 ${
                darkMode ? "bg-gradient-to-r from-transparent to-purple-700" : "bg-gradient-to-r from-transparent to-purple-300"
              }`}
            />
            <IoSparkles
              className={`text-2xl sm:text-3xl ${
                darkMode ? "text-purple-400" : "text-purple-600"
              } animate-pulse`}
            />
            <div
              className={`h-px w-20 sm:w-24 ${
                darkMode ? "bg-gradient-to-l from-transparent to-purple-700" : "bg-gradient-to-l from-transparent to-purple-300"
              }`}
            />
          </div>

          {/* Fun Message */}
          <div className="mt-6">
            <p className={clsx(
              styles.funMessage,
              darkMode ? styles.funMessageDark : styles.funMessageLight
            )}>
              🚀 Maybe this page is exploring the digital universe? 🌌
            </p>
          </div>
        </div>
      </div>

      {/* Enhanced Animations */}
      <style jsx>{`
        @keyframes fade-in-down {
          0% {
            opacity: 0;
            transform: translateY(-30px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in-up {
          0% {
            opacity: 0;
            transform: translateY(30px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in {
          0% {
            opacity: 0;
            transform: scale(0.95);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1) rotate(0deg);
          }
          25% {
            transform: translate(30px, -50px) scale(1.1) rotate(90deg);
          }
          50% {
            transform: translate(-20px, 30px) scale(0.9) rotate(180deg);
          }
          75% {
            transform: translate(50px, 50px) scale(1.05) rotate(270deg);
          }
        }

        @keyframes gradient-shift {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          25% {
            transform: translateY(-10px) rotate(5deg);
          }
          50% {
            transform: translateY(0) rotate(0deg);
          }
          75% {
            transform: translateY(-5px) rotate(-5deg);
          }
        }

        @keyframes shimmer {
          100% {
            transform: translateX(200%);
          }
        }

        .animate-fade-in-down {
          animation: fade-in-down 1s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .animate-fade-in-up {
          animation: fade-in-up 1s cubic-bezier(0.16, 1, 0.3, 1) 0.2s backwards;
        }

        .animate-fade-in {
          animation: fade-in 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.4s backwards;
        }

        .animate-blob {
          animation: blob 20s infinite cubic-bezier(0.4, 0, 0.6, 1);
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        .animate-gradient-shift {
          background-size: 200% 200%;
          animation: gradient-shift 4s ease infinite;
        }

        .animate-shimmer {
          animation: shimmer 2s infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-3000 {
          animation-delay: 3s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }

        /* Smooth hover transitions for mobile */
        @media (hover: hover) {
          button:hover,
          a:hover {
            transition-duration: 300ms;
          }
        }

        /* Reduce motion for accessibility */
        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
}
