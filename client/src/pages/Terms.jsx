import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

/* ---------- Config ---------- */
// Reads from your .env with fallbacks (unchanged)
const TERMS_VERSION = import.meta.env.VITE_TERMS_VERSION || "1.1";
const TERMS_UPDATED = import.meta.env.VITE_TERMS_UPDATED || "January 15, 2025";

/* ---------- Reusable UI ---------- */

function ReadingProgress({ darkMode }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const updateProgress = () => {
      const doc = document.documentElement;
      const scrollTop = doc.scrollTop || document.body.scrollTop;
      const height = doc.scrollHeight - doc.clientHeight;
      const pct = height > 0 ? (scrollTop / height) * 100 : 0;
      setProgress(Math.max(0, Math.min(100, pct)));
    };

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, []);

  const prefersNoMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-x-0 top-0 z-40 h-1 origin-left pointer-events-none ${
        darkMode ? "opacity-60" : "opacity-90"
      } bg-gradient-to-r from-blue-500 via-sky-400 to-emerald-500`}
      style={{
        transform: `scaleX(${Math.max(0.02, progress / 100)})`,
        transition: prefersNoMotion ? "none" : "transform 120ms linear",
      }}
    />
  );
}

const SkipToContent = () => (
  <a
    href="#main"
    className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 z-50 focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-md"
  >
    Skip to content
  </a>
);

/**
 * Page header
 */
const PageHeader = ({ darkMode }) => (
  <header
    className={`relative overflow-hidden py-16 md:py-20 px-6 md:px-10 text-center border-b ${
      darkMode ? "border-slate-800 bg-slate-950" : "border-slate-200 bg-white"
    }`}
  >
    {/* Decorative background */}
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-200/50 via-transparent to-transparent dark:from-blue-900/30" />
      <div className="absolute -inset-x-32 -top-24 h-64 blur-2xl opacity-50 bg-gradient-to-r from-blue-500/20 via-cyan-400/20 to-emerald-400/20 dark:from-blue-400/10 dark:via-cyan-300/10 dark:to-emerald-300/10" />
    </div>

    <div className="relative max-w-4xl mx-auto">
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-400">
        Connestro Terms of Service
      </h1>
      <p className="mt-3 text-lg md:text-xl font-medium text-slate-600 dark:text-slate-300">
        Where connections grow stronger.
      </p>
      <p className="mt-4 max-w-3xl mx-auto text-slate-500 dark:text-slate-400">
        Welcome! These terms govern your access to and use of all Connestro services, including our
        websites, APIs, and features like Posts, Reels, Stories, and private messaging.
      </p>
    </div>
  </header>
);

/**
 * Sub-navigation for quick anchors
 */
const SectionNav = ({ darkMode }) => (
  <nav
    aria-label="On this page"
    className={`sticky top-0 z-30 border-b backdrop-blur supports-[backdrop-filter]:bg-white/70 supports-[backdrop-filter]:dark:bg-slate-900/50 ${
      darkMode ? "bg-slate-900/80 border-slate-800" : "bg-white/90 border-slate-200"
    }`}
  >
    <div className="max-w-6xl mx-auto px-6 md:px-10 py-2.5">
      <ul className="flex items-center gap-2 flex-wrap">
        <li>
          <a
            href="#terms"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-slate-800/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Terms & Conditions
          </a>
        </li>
        <li>
          <a
            href="#privacy"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-slate-800/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Privacy Policy
          </a>
        </li>
      </ul>
    </div>
  </nav>
);

/**
 * Section container
 */
const PolicySection = ({ id, title, children }) => (
  <section
    id={id}
    className="scroll-mt-24 py-14 md:py-16 px-6 md:px-10"
    aria-labelledby={`${id}-heading`}
  >
    <div className="max-w-4xl mx-auto">
      <div className="mb-10 md:mb-12 border-b border-slate-200 dark:border-slate-800 pb-4">
        <h2
          id={`${id}-heading`}
          className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white"
        >
          {title}
        </h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Version {TERMS_VERSION} • Last updated: {TERMS_UPDATED}
        </p>
      </div>
      <div className="space-y-8 md:space-y-10">{children}</div>
      <div className="mt-14 text-center">
        <a
          href="#top"
          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
        >
          Back to top ↑
        </a>
      </div>
    </div>
  </section>
);

/**
 * A styled policy item (card)
 */
const PolicyItem = ({ title, children, icon }) => (
  <div className="group relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 shadow-sm hover:shadow-md transition-shadow">
    <div className="p-5 md:p-6">
      <h3 className="flex items-center text-lg md:text-xl font-semibold text-slate-800 dark:text-slate-100">
        <span className="flex-shrink-0 w-10 h-10 mr-4 rounded-full bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 ring-1 ring-slate-200/70 dark:ring-slate-700 inline-flex items-center justify-center">
          {icon}
        </span>
        {title}
      </h3>
      <div className="mt-4 text-slate-600 dark:text-slate-300 leading-relaxed space-y-3">
        {children}
      </div>
    </div>
  </div>
);

/* ---------- SVG Icons ---------- */

const Icon = ({ path }) => (
  <svg
    className="w-5 h-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
  </svg>
);

const UserIcon = () => (
  <Icon path="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
);
const LockIcon = () => (
  <Icon path="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
);
const ContentIcon = () => (
  <Icon path="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
);
const BanIcon = () => (
  <Icon path="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
);
const SparklesIcon = () => (
  <Icon path="M5 3v4M3 5h4M6.343 6.343l-2.828 2.828M17.657 17.657l2.828-2.828M18 5h4M19 3v4M12 2v2m0 16v2m-6.343-2.343l2.828-2.828M6.343 17.657l-2.828-2.828" />
);
const ShieldIcon = () => (
  <Icon path="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 20.917l9 3 9-3A12.02 12.02 0 0021 7.957a11.955 11.955 0 01-2.382-1.016z" />
);
const MailIcon = () => (
  <Icon path="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
);
const GlobeIcon = () => (
  <Icon path="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h8a2 2 0 002-2v-1a2 2 0 012-2h1.945M7.75 4a9 9 0 0110.5 0M7.75 4a9 9 0 00-3.282 5.142M7.75 4L5.25 7.5M16.25 4a9 9 0 00-10.5 0m10.5 0a9 9 0 013.282 5.142m-3.282-5.142L18.75 7.5" />
);
const DataIcon = () => (
  <Icon path="M4 7v10m16-10v10M9 4h6m-6 16h6M7 7h10v10H7z" />
);
const ShareIcon = () => (
  <Icon path="M8.684 13.342C8.86 13.528 9 13.764 9 14v1c0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75v-1c0-.236.14-.472.316-.658l3.16-3.16a.75.75 0 00-.53-1.28H6.75a.75.75 0 00-.53 1.28l2.464 2.464z" />
);
const CookieIcon = () => <Icon path="M3.75 3.75a.75.75 0 000 1.5h16.5a.75.75 0 000-1.5H3.75zM3.75 7.5a.75.75 0 000 1.5h16.5a.75.75 0 000-1.5H3.75zM3.75 11.25a.75.75 0 000 1.5h16.5a.75.75 0 000-1.5H3.75zM3.75 15a.75.75 0 000 1.5h16.5a.75.75 0 000-1.5H3.75z" />;
const UpdateIcon = () => <Icon path="M4 4v5h5M20 20v-5h-5M4 4l5 5M20 20l-5-5" />;

/* ---------- Main Page ---------- */

export default function Terms() {
  const { darkMode } = useTheme();
  const location = useLocation();
  const [showTop, setShowTop] = useState(false);

  // Smooth-scroll to hash on route change or initial load
  useEffect(() => {
    let timer;
    const scrollToHash = () => {
      const prefersNoMotion =
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (location.hash) {
        const id = location.hash.substring(1);
        const el = document.getElementById(id);
        if (el) {
          timer = setTimeout(() => {
            el.scrollIntoView({
              behavior: prefersNoMotion ? "auto" : "smooth",
              block: "start",
            });
          }, 100);
        }
      } else {
        window.scrollTo({ top: 0, behavior: "auto" });
      }
    };

    scrollToHash();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [location]);

  // Show floating "back to top" button
  useEffect(() => {
    const onScroll = () => setShowTop((document.documentElement.scrollTop || 0) > 500);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const onBackToTop = () => {
    const prefersNoMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: prefersNoMotion ? "auto" : "smooth" });
  };

  return (
    <div
      id="top"
      className={`min-h-screen transition-colors duration-300 ${
        darkMode ? "bg-slate-950 text-slate-300" : "bg-white text-slate-700"
      }`}
    >
      <SkipToContent />
      <ReadingProgress darkMode={darkMode} />
      <PageHeader darkMode={darkMode} />
      <SectionNav darkMode={darkMode} />

      <main id="main" className="relative">
        <PolicySection id="terms" title="Terms & Conditions">
          <PolicyItem title="1. Your Agreement with Connestro" icon={<UserIcon />}>
            <p>
              By creating an account or using our Service, you agree to these Terms. This agreement covers
              your use of all features, including but not limited to Posts, Reels, Stories, Status, private
              messaging, and audio/video calls.
            </p>
          </PolicyItem>

          <PolicyItem title="2. Your Account and Responsibilities" icon={<LockIcon />}>
            <ul className="list-disc pl-5 space-y-2 marker:text-blue-500">
              <li>
                <strong>Eligibility:</strong> You must be at least 13 years old to use Connestro.
              </li>
              <li>
                <strong>Account Security:</strong> You are responsible for safeguarding your password and for
                all activities that occur under your account(s).
              </li>
              <li>
                <strong>Accurate Information:</strong> You agree to provide accurate registration information
                and to keep it updated. Impersonation is not permitted.
              </li>
            </ul>
          </PolicyItem>

          <PolicyItem title="3. Content on Connestro" icon={<ContentIcon />}>
            <p>
              You retain ownership of the content you create and share, such as posts, videos for Reels,
              images for Stories, and profile information ("User Content").
            </p>
            <p>
              By submitting User Content, you grant Connestro a worldwide, non-exclusive, royalty-free
              license to host, display, reproduce, modify (e.g., for formatting), and distribute it on and
              through the Service. This license is solely for the purpose of operating, developing, and
              providing the Service.
            </p>
          </PolicyItem>

          <PolicyItem title="4. Prohibited Conduct" icon={<BanIcon />}>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-2 marker:text-blue-500">
              <li>Post content that is unlawful, harmful, harassing, or infringes on anyone&apos;s rights.</li>
              <li>Attempt to disrupt our systems, reverse-engineer our code, or bypass our security measures.</li>
              <li>Use the service for spam, phishing, or unauthorized commercial activities.</li>
              <li>Attempt to bypass file size, duration, or quantity limits for features like Reels and Stories.</li>
            </ul>
          </PolicyItem>

          <PolicyItem title="5. Content Moderation and Termination" icon={<ShieldIcon />}>
            <p>
              We have the right, but not the obligation, to review, hide, or remove any content that we
              believe violates these terms or our policies. We may suspend or permanently terminate your
              account for violations or for any other reason at our discretion to protect the safety and
              integrity of our platform.
            </p>
          </PolicyItem>

          <PolicyItem title="6. Disclaimers and Limitation of Liability" icon={<ShieldIcon />}>
            <p>
              The Service is provided &quot;AS IS.&quot; Connestro will not be liable for any indirect,
              incidental, special, consequential, or punitive damages arising out of your use of the Service.
            </p>
          </PolicyItem>

          <PolicyItem title="7. Changes to Terms" icon={<UpdateIcon />}>
            <p>
              We may update these Terms from time to time. We will notify you of significant changes. Your
              continued use of Connestro after changes means you accept the new Terms.
            </p>
          </PolicyItem>
        </PolicySection>

        <PolicySection id="privacy" title="Privacy Policy">
          <PolicyItem title="1. Data We Collect" icon={<DataIcon />}>
            <p>We collect information to provide and improve our Service:</p>
            <ul className="list-disc pl-5 space-y-2 marker:text-blue-500">
              <li>
                <strong>Information You Provide:</strong> Your profile details (name, username, bio, etc.),
                and the content you create, including Posts, Reels, Stories, Status updates, and messages.
              </li>
              <li>
                <strong>Usage and Engagement Data:</strong> Information about your activity, such as who you
                follow, which posts you like, Reels you watch, story views, and reactions.
              </li>
              <li>
                <strong>Call and Message Metadata:</strong> We collect metadata from your interactions, such
                as who you message or call, timestamps, and duration. We do not store or listen to the
                content of your audio or video calls.
              </li>
              <li>
                <strong>Technical Data:</strong> IP address, device type, browser information, and other data
                for security, analytics, and service functionality.
              </li>
            </ul>
          </PolicyItem>

          <PolicyItem title="2. How We Use Your Data" icon={<SparklesIcon />}>
            <ul className="list-disc pl-5 space-y-2 marker:text-blue-500">
              <li>To provide, operate, and maintain the Connestro service.</li>
              <li>To personalize your experience, such as curating your feed of Posts and Reels.</li>
              <li>To facilitate communication, including private messages and audio/video calls.</li>
              <li>To enforce our terms, prevent abuse, and investigate reports of misconduct.</li>
              <li>To communicate important updates, security alerts, and support messages.</li>
            </ul>
          </PolicyItem>

          <PolicyItem title="3. Data Sharing and Disclosure" icon={<ShareIcon />}>
            <p>We do not sell your personal data. We may share information with:</p>
            <ul className="list-disc pl-5 space-y-2 marker:text-blue-500">
              <li>Third-party service providers (e.g., hosting) who process data on our behalf.</li>
              <li>Third-party services you connect to, such as Google for authentication.</li>
              <li>Law enforcement or other parties if required by law or to protect safety and rights.</li>
            </ul>
          </PolicyItem>

          <PolicyItem title="4. Data Retention and Deletion" icon={<ShieldIcon />}>
            <p>
              We retain data as long as your account is active or as needed to provide the Service. When you
              delete your account, we initiate a process to delete your content, such as posts, reels, and
              stories, in accordance with our data retention policies.
            </p>
          </PolicyItem>

          <PolicyItem title="5. Your Data Rights" icon={<UserIcon />}>
            <p>
              Depending on your location, you may have rights to access, correct, or delete your personal
              data. You can manage much of your information through your account settings or by contacting us.
            </p>
          </PolicyItem>

          <PolicyItem title="6. Contact Us" icon={<MailIcon />}>
            <p>
              For any questions about this Privacy Policy, please contact our privacy team at{" "}
              <a
                href="mailto:sauravshubham903@gmail.com"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                sauravshubham903@gmail.com
              </a>
              .
            </p>
          </PolicyItem>
        </PolicySection>
      </main>

      {/* Floating Back-to-Top */}
      <button
        type="button"
        onClick={onBackToTop}
        className={`fixed bottom-6 right-6 z-40 inline-flex items-center justify-center rounded-full shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-opacity ${
          showTop ? "opacity-100" : "opacity-0 pointer-events-none"
        } ${darkMode ? "bg-slate-800 text-white" : "bg-white text-slate-700"} border border-slate-200 dark:border-slate-700 w-11 h-11`}
        aria-label="Back to top"
      >
        ↑
      </button>
    </div>
  );
}