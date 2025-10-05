// src/pages/Home.jsx or wherever this component is located
import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useMemo } from "react";
import clsx from "clsx";
import { 
  IoRocketOutline, 
  IoSparkles
} from "react-icons/io5";

const styles = {
  container: "min-h-screen flex flex-col justify-center items-center text-center px-4 sm:px-6 lg:px-8 relative overflow-hidden transition-colors duration-500",
  containerLight: "bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50",
  containerDark: "bg-gradient-to-br from-gray-950 via-gray-900 to-black",
  
  heading: "text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 tracking-tight drop-shadow-2xl transition-all duration-300 animate-fade-in-down",
  headingLight: "text-gray-900",
  headingDark: "text-white",
  
  brandSpan: "text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 animate-gradient-x",
  
  tagline: "text-base sm:text-lg md:text-xl lg:text-2xl leading-relaxed mb-10 max-w-3xl mx-auto transition-colors duration-300 animate-fade-in-up",
  taglineLight: "text-gray-700",
  taglineDark: "text-gray-300",
  
  taglineHighlight: "font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600",

  ctaButton: "group relative px-8 sm:px-10 lg:px-12 py-3 sm:py-4 lg:py-5 rounded-2xl font-bold text-lg shadow-2xl transition-all transform duration-300 hover:-translate-y-2 hover:shadow-3xl overflow-hidden",
  ctaButtonLight: "bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white hover:scale-105",
  ctaButtonDark: "bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white hover:scale-105",

  footer: "mt-16 text-sm sm:text-base md:text-lg max-w-2xl leading-relaxed transition-colors duration-300 animate-fade-in",
  footerLight: "text-gray-600",
  footerDark: "text-gray-400",
};

export default function Home() {
  const { darkMode } = useTheme();

  // Safely parse user from localStorage and memoize it to prevent re-parsing on every render.
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
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating Orbs */}
        <div className={`absolute top-20 left-10 w-72 h-72 ${darkMode ? 'bg-blue-600' : 'bg-blue-400'} rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob`}></div>
        <div className={`absolute top-40 right-10 w-72 h-72 ${darkMode ? 'bg-purple-600' : 'bg-purple-400'} rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000`}></div>
        <div className={`absolute -bottom-8 left-1/2 w-72 h-72 ${darkMode ? 'bg-pink-600' : 'bg-pink-400'} rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000`}></div>
        
        {/* Grid Pattern */}
        <div className={`absolute inset-0 ${darkMode ? 'opacity-5' : 'opacity-10'}`} 
          style={{
            backgroundImage: `linear-gradient(${darkMode ? '#ffffff' : '#000000'} 1px, transparent 1px), linear-gradient(90deg, ${darkMode ? '#ffffff' : '#000000'} 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        ></div>
      </div>

      {/* Content Container */}
      <div className="relative z-10 max-w-6xl mx-auto">
        
        {/* Sparkle Icon */}
        <div className="flex justify-center mb-6 animate-bounce">
          <div className={`p-4 rounded-full ${darkMode ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-gradient-to-r from-blue-400 to-purple-400'} shadow-2xl`}>
            <IoSparkles className="text-white text-4xl sm:text-5xl" />
          </div>
        </div>

        {/* Hero Section */}
        <h1
          className={clsx(
            styles.heading,
            darkMode ? styles.headingDark : styles.headingLight
          )}
        >
          Welcome to <br className="sm:hidden" />
          <span className={styles.brandSpan}>Connestro</span>
        </h1>

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
          Share stories, discover reels, chat in real time, and build your own
          digital community.
        </p>

        {/* Call to Action Button */}
        {user && (
          <div className="flex flex-col items-center gap-4">
            <Link
              to="/"
              className={clsx(
                styles.ctaButton,
                darkMode ? styles.ctaButtonDark : styles.ctaButtonLight
              )}
            >
              <span className="relative z-10 flex items-center gap-2">
                <IoRocketOutline className="text-2xl group-hover:rotate-45 transition-transform duration-300" />
                Go to Feed
                <IoRocketOutline className="text-2xl group-hover:-rotate-45 transition-transform duration-300" />
              </span>
              {/* Button Shine Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-30 transform -skew-x-12 group-hover:translate-x-full transition-all duration-700"></div>
            </Link>
          </div>
        )}

        {/* Footer Note */}
        <p
          className={clsx(
            styles.footer,
            darkMode ? styles.footerDark : styles.footerLight
          )}
        >
          Connestro — A modern social space with posts, reels, stories, and
          real‑time conversations. Experience the future of social networking.
        </p>

        {/* Decorative Line */}
        <div className="mt-8 flex items-center justify-center gap-2">
          <div className={`h-px w-16 ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
          <IoSparkles className={`${darkMode ? 'text-purple-400' : 'text-purple-600'} animate-pulse`} />
          <div className={`h-px w-16 ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes fade-in-down {
          0% {
            opacity: 0;
            transform: translateY(-20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in-up {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }

        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          25% {
            transform: translate(20px, -50px) scale(1.1);
          }
          50% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          75% {
            transform: translate(50px, 50px) scale(1.05);
          }
        }

        @keyframes gradient-x {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        .animate-fade-in-down {
          animation: fade-in-down 0.8s ease-out;
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out 0.2s backwards;
        }

        .animate-fade-in {
          animation: fade-in 1s ease-out 0.4s backwards;
        }

        .animate-blob {
          animation: blob 7s infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }

        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 3s ease infinite;
        }
      `}</style>
    </div>
  );
}