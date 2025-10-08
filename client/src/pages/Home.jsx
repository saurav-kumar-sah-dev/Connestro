// src/pages/Home.jsx
import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useMemo } from "react";
import clsx from "clsx";
import {
  IoRocketOutline,
  IoSparkles,
  IoPersonAddOutline,
  IoLogInOutline,
  IoStarOutline,
  IoHeartOutline,
} from "react-icons/io5";

const styles = {
  container:
    "min-h-screen flex flex-col justify-center items-center text-center px-4 sm:px-6 lg:px-8 relative overflow-hidden transition-all duration-700",
  containerLight: "bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50",
  containerDark: "bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900",

  contentWrapper: "relative z-10 max-w-7xl mx-auto py-12 sm:py-16 lg:py-20",

  heroSection: "space-y-8 sm:space-y-10 lg:space-y-12",

  sparkleContainer: "flex justify-center mb-8 sm:mb-10 relative",
  
  sparkleIcon: 
    "relative p-4 sm:p-5 lg:p-6 rounded-3xl shadow-2xl backdrop-blur-xl transform hover:rotate-12 transition-all duration-500 group",
  sparkleIconLight: "bg-gradient-to-br from-blue-400/90 to-purple-500/90",
  sparkleIconDark: "bg-gradient-to-br from-blue-500/80 to-purple-600/80",

  heading:
    "text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black mb-4 sm:mb-6 tracking-tight leading-[1.1] drop-shadow-2xl transition-all duration-500 animate-fade-in-down",
  headingLight: "text-slate-900",
  headingDark: "text-white",

  brandName:
    "block sm:inline text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 animate-gradient-shift mt-2 sm:mt-0",

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
    "group relative px-8 sm:px-10 lg:px-14 py-4 sm:py-5 lg:py-6 rounded-full font-semibold text-base sm:text-lg lg:text-xl border-2 transition-all transform duration-500 hover:-translate-y-2 hover:shadow-xl backdrop-blur-2xl w-full sm:w-auto max-w-xs sm:max-w-none",
  ctaSecondaryLight:
    "bg-white/60 text-slate-900 border-slate-200/50 hover:bg-white/80 hover:scale-105 hover:border-purple-300/50",
  ctaSecondaryDark:
    "bg-white/5 text-white border-white/10 hover:bg-white/10 hover:scale-105 hover:border-purple-400/30",

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
};

export default function Home() {
  const { darkMode } = useTheme();

  const user = useMemo(() => {
    try {
      const userData = localStorage.getItem("user");
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      return null;
    }
  }, []);

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
              darkMode ? "bg-blue-600" : "bg-blue-400"
            } rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob`}
          />
          <div
            className={`absolute top-[30%] right-[10%] w-64 sm:w-72 lg:w-96 h-64 sm:h-72 lg:h-96 ${
              darkMode ? "bg-purple-600" : "bg-purple-400"
            } rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000`}
          />
          <div
            className={`absolute bottom-[10%] left-[30%] w-64 sm:w-72 lg:w-96 h-64 sm:h-72 lg:h-96 ${
              darkMode ? "bg-pink-600" : "bg-pink-400"
            } rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000`}
          />
        </div>

        {/* Mesh Gradient */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: darkMode
              ? "radial-gradient(at 40% 20%, hsla(280,100%,74%,0.3) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(189,100%,56%,0.3) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(355,100%,93%,0.3) 0px, transparent 50%)"
              : "radial-gradient(at 40% 20%, hsla(280,100%,74%,0.2) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(189,100%,56%,0.2) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(355,100%,93%,0.2) 0px, transparent 50%)",
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
              ? "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(120,80,255,0.15), transparent 70%)"
              : "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(255,255,255,0.5), transparent 70%)",
          }}
        />

        {/* Floating Decorative Icons */}
        <IoStarOutline
          className={clsx(
            styles.floatingIcon,
            darkMode ? styles.floatingIconDark : styles.floatingIconLight,
            "top-[15%] left-[5%] text-3xl sm:text-4xl lg:text-5xl"
          )}
        />
        <IoHeartOutline
          className={clsx(
            styles.floatingIcon,
            darkMode ? styles.floatingIconDark : styles.floatingIconLight,
            "top-[20%] right-[8%] text-2xl sm:text-3xl lg:text-4xl animation-delay-2000"
          )}
        />
        <IoSparkles
          className={clsx(
            styles.floatingIcon,
            darkMode ? styles.floatingIconDark : styles.floatingIconLight,
            "bottom-[20%] left-[8%] text-2xl sm:text-3xl lg:text-4xl animation-delay-4000"
          )}
        />
        <IoStarOutline
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
          {/* Animated Logo */}
          <div className={styles.sparkleContainer}>
            <div
              className={clsx(
                styles.sparkleIcon,
                darkMode ? styles.sparkleIconDark : styles.sparkleIconLight
              )}
            >
              <IoSparkles className="text-white text-3xl sm:text-4xl lg:text-5xl group-hover:scale-110 transition-transform duration-500" />
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
              Welcome to{" "}
              <span className={styles.brandName}>Connestro</span>
            </h1>
            
            <p
              className={clsx(
                styles.subtitle,
                darkMode ? styles.subtitleDark : styles.subtitleLight
              )}
            >
              Your Premium Social Experience
            </p>
          </div>

          {/* Tagline */}
          <p
            className={clsx(
              styles.tagline,
              darkMode ? styles.taglineDark : styles.taglineLight
            )}
          >
            <span className={styles.taglineHighlight}>
              Where connections grow stronger.
            </span>{" "}
            Share stories, discover reels, chat in real-time, and build your
            digital community with style.
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
                  <span>Explore Feed</span>
                  <IoRocketOutline className={clsx(styles.buttonIcon, "group-hover:-rotate-12")} />
                </span>
                <div className={styles.shimmer} />
              </Link>
            ) : (
              <>
                <Link
                  to="/signup"
                  className={clsx(
                    styles.ctaPrimary,
                    darkMode ? styles.ctaPrimaryDark : styles.ctaPrimaryLight
                  )}
                  aria-label="Create an account"
                >
                  <span className="relative z-10 flex items-center justify-center gap-3">
                    <IoPersonAddOutline className={clsx(styles.buttonIcon, "group-hover:scale-110")} />
                    <span>Get Started Free</span>
                  </span>
                  <div className={styles.shimmer} />
                </Link>

                <Link
                  to="/login"
                  className={clsx(
                    styles.ctaSecondary,
                    darkMode ? styles.ctaSecondaryDark : styles.ctaSecondaryLight
                  )}
                  aria-label="Sign in"
                >
                  <span className="relative z-10 flex items-center justify-center gap-3">
                    <IoLogInOutline className={clsx(styles.buttonIcon, "group-hover:translate-x-1")} />
                    <span>Sign In</span>
                  </span>
                </Link>
              </>
            )}
          </div>

          {/* Footer Text */}
          <p
            className={clsx(
              styles.footer,
              darkMode ? styles.footerDark : styles.footerLight
            )}
          >
            Join millions creating, sharing, and connecting on Connestro — 
            the future of social networking is here.
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