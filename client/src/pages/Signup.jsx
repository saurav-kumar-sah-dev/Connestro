// src/pages/Signup.jsx
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../api/axios";
import { useTheme } from "../context/ThemeContext";
import { upsertAccount } from "../utils/accounts";

// Regex patterns (kept functional)
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const placeRegex = /^[A-Za-z\s,.'-]{2,}$/;

function getAge(date) {
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const m = today.getMonth() - date.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < date.getDate())) age--;
  return age;
}

// Parse a YYYY-MM-DD string into a local Date (avoids UTC shift issues)
function parseLocalYmd(val) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(val);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
}

// Format a Date to local YYYY-MM-DD (no timezone issues)
function formatYmd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function Signup() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    gender: "Male",
    place: "",
    dob: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  });

  const [emailValid, setEmailValid] = useState(true);

  const [passwordChecks, setPasswordChecks] = useState({
    length: false,
    upper: false,
    lower: false,
    number: false,
    symbol: false,
  });

  const [dobChecks, setDobChecks] = useState({
    valid: true,
    notFuture: true,
    age13: true,
  });

  const [placeChecks, setPlaceChecks] = useState({
    min2: true,
    allowed: true,
    max100: true,
  });

  // Fallback for very old browsers that don't support type="date"
  const [dobType, setDobType] = useState("date");
  useEffect(() => {
    const i = document.createElement("input");
    i.setAttribute("type", "date");
    if (i.type !== "date") setDobType("text");
  }, []);

  // Limit DOB to 13+ using max attribute
  const today = new Date();
  const maxDobDate = new Date(
    today.getFullYear() - 13,
    today.getMonth(),
    today.getDate()
  );
  const maxDobStr = formatYmd(maxDobDate);

  const navigate = useNavigate();
  const { darkMode } = useTheme();

  const updatePasswordChecks = (pwd) => {
    setPasswordChecks({
      length: pwd.length >= 8,
      upper: /[A-Z]/.test(pwd),
      lower: /[a-z]/.test(pwd),
      number: /\d/.test(pwd),
      symbol: /[^A-Za-z0-9]/.test(pwd),
    });
  };

  const updateDobChecks = (val) => {
    if (!val) {
      setDobChecks({ valid: true, notFuture: true, age13: true });
      return;
    }
    const d = parseLocalYmd(val);
    const isValid = !!d;
    const now = new Date();
    const notFuture = isValid ? d <= now : false;
    const age13 = isValid ? getAge(d) >= 13 : false;
    setDobChecks({ valid: isValid, notFuture, age13 });
  };

  const updatePlaceChecks = (val) => {
    const s = (val || "").trim().replace(/\s+/g, " ");
    const min2 = s.length >= 2;
    const max100 = s.length <= 100;
    const allowed = s.length ? placeRegex.test(s) : true;
    setPlaceChecks({ min2, allowed, max100 });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === "checkbox" ? checked : value;

    setFormData((prev) => {
      const next = { ...prev, [name]: val };
      if (name === "email") setEmailValid(emailRegex.test(val));
      if (name === "password") updatePasswordChecks(val);
      if (name === "dob") updateDobChecks(val);
      if (name === "place") updatePlaceChecks(val);
      return next;
    });
  };

  const allPasswordOk =
    passwordChecks.length &&
    passwordChecks.upper &&
    passwordChecks.lower &&
    passwordChecks.number &&
    passwordChecks.symbol;

  const passwordsMatch =
    formData.password &&
    formData.confirmPassword &&
    formData.password === formData.confirmPassword;

  const allDobOk =
    !!formData.dob && dobChecks.valid && dobChecks.notFuture && dobChecks.age13;

  const allPlaceOk =
    !!formData.place &&
    placeChecks.min2 &&
    placeChecks.allowed &&
    placeChecks.max100;

  const canSubmit =
    formData.firstName &&
    formData.lastName &&
    formData.gender &&
    formData.place &&
    formData.dob &&
    emailValid &&
    allPasswordOk &&
    passwordsMatch &&
    allDobOk &&
    allPlaceOk &&
    formData.acceptTerms;

  const handleSignup = async (e) => {
    e.preventDefault();

    if (!emailValid) return alert("Please enter a valid email address.");
    if (!allPasswordOk)
      return alert(
        "Password must be at least 8 chars and include upper, lower, number, and special character."
      );
    if (!passwordsMatch) return alert("Passwords do not match.");
    if (!allDobOk)
      return alert(
        "Please provide a valid Date of Birth (not in future, 13+)."
      );
    if (!allPlaceOk)
      return alert(
        "Please enter a valid place (2–100 chars, letters/spaces only)."
      );
    if (!formData.acceptTerms)
      return alert("Please accept the Terms and Conditions to continue.");

    try {
      const res = await API.post("/auth/signup", formData);
      if (res?.data?.token && res?.data?.user) {
        // Multi-account: store and activate
        upsertAccount(res.data);
        navigate("/");
      } else {
        alert("Signup successful");
        navigate("/login");
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.msg || "Signup failed");
    }
  };

  const checkItem = (ok, label) => (
    <li className="flex items-start gap-2 text-[13px] sm:text-sm">
      <span className={`mt-0.5 ${ok ? "text-green-500" : "text-gray-400"}`}>
        {ok ? "✓" : "•"}
      </span>
      <span
        className={`leading-relaxed ${
          darkMode ? "text-slate-300" : "text-slate-700"
        }`}
      >
        {label}
      </span>
    </li>
  );

  const showPasswordRules = formData.password && !allPasswordOk;
  const showDobRules = formData.dob && !allDobOk;
  const showPlaceRules = formData.place && !allPlaceOk;

  const strengthCount =
    (passwordChecks.length ? 1 : 0) +
    (passwordChecks.upper ? 1 : 0) +
    (passwordChecks.lower ? 1 : 0) +
    (passwordChecks.number ? 1 : 0) +
    (passwordChecks.symbol ? 1 : 0);
  const strengthPct = (strengthCount / 5) * 100;
  const strengthLabel =
    strengthCount <= 2
      ? "Weak"
      : strengthCount === 3 || strengthCount === 4
      ? "Medium"
      : "Strong";
  const strengthColor =
    strengthCount <= 2
      ? "bg-red-500"
      : strengthCount <= 4
      ? "bg-amber-500"
      : "bg-emerald-500";

  return (
    <div
      className={`relative min-h-screen px-4 py-6 sm:py-10 flex items-center justify-center transition-colors duration-300 ${
        darkMode
          ? "bg-slate-950 text-slate-200"
          : "bg-gradient-to-br from-blue-50 via-white to-purple-50 text-slate-800"
      }`}
    >
      {/* Animated background gradients */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full blur-[100px] bg-gradient-to-br from-blue-400/30 to-cyan-300/20 animate-pulse" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full blur-[100px] bg-gradient-to-tr from-purple-400/20 to-pink-300/20 animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full blur-[120px] bg-gradient-to-r from-blue-300/10 to-purple-300/10" />
      </div>

      <div className="relative w-full max-w-md mx-auto">
        <div
          className={`rounded-2xl shadow-2xl border backdrop-blur-sm overflow-hidden ${
            darkMode
              ? "border-slate-800 bg-slate-900/95 shadow-slate-900/50"
              : "border-slate-200 bg-white/95 shadow-slate-200/50"
          }`}
        >
          {/* Gradient accent bar */}
          <div className="h-1.5 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 animate-gradient" />

          <div
            className={`px-6 sm:px-8 pt-6 pb-4 text-center border-b ${
              darkMode ? "border-slate-800" : "border-slate-100"
            }`}
          >
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Create Account
            </h1>
            <p
              className={`mt-2 text-sm ${
                darkMode ? "text-slate-400" : "text-slate-600"
              }`}
            >
              Join Connestro today
            </p>
          </div>

          <form onSubmit={handleSignup} className="p-6 sm:p-8 space-y-4">
            {/* Name fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="firstName"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                >
                  First name
                </label>
                <div className="relative group">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </span>
                  <input
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="John"
                    className={`w-full border-2 pl-10 pr-3 py-2.5 rounded-xl transition-all duration-200 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 ${
                      darkMode
                        ? "border-slate-700 bg-slate-800/50 text-slate-100 placeholder-slate-500 hover:border-slate-600"
                        : "border-slate-200 bg-white text-slate-900 placeholder-slate-400 hover:border-slate-300"
                    }`}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="lastName"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                >
                  Last name
                </label>
                <div className="relative group">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </span>
                  <input
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Doe"
                    className={`w-full border-2 pl-10 pr-3 py-2.5 rounded-xl transition-all duration-200 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 ${
                      darkMode
                        ? "border-slate-700 bg-slate-800/50 text-slate-100 placeholder-slate-500 hover:border-slate-600"
                        : "border-slate-200 bg-white text-slate-900 placeholder-slate-400 hover:border-slate-300"
                    }`}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Gender */}
            <div className="space-y-1.5">
              <label
                htmlFor="gender"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
              >
                Gender
              </label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className={`w-full border-2 px-3 py-2.5 rounded-xl transition-all duration-200 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 ${
                  darkMode
                    ? "border-slate-700 bg-slate-800/50 text-slate-100 hover:border-slate-600"
                    : "border-slate-200 bg-white text-slate-900 hover:border-slate-300"
                }`}
                required
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Place */}
            <div className="space-y-1.5">
              <label
                htmlFor="place"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
              >
                Place
              </label>
              <div className="relative group">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </span>
                <input
                  id="place"
                  name="place"
                  value={formData.place}
                  onChange={handleChange}
                  placeholder="City, Country"
                  maxLength={100}
                  className={`w-full border-2 pl-10 pr-3 py-2.5 rounded-xl transition-all duration-200 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 ${
                    darkMode
                      ? "border-slate-700 bg-slate-800/50 text-slate-100 placeholder-slate-500 hover:border-slate-600"
                      : "border-slate-200 bg-white text-slate-900 placeholder-slate-400 hover:border-slate-300"
                  } ${showPlaceRules ? "border-amber-500 focus:border-amber-500" : ""}`}
                  required
                />
              </div>
            </div>

            {showPlaceRules && (
              <div
                className={`text-xs rounded-xl p-3 border ${
                  darkMode
                    ? "bg-amber-900/20 border-amber-800/30 text-amber-200"
                    : "bg-amber-50 border-amber-200 text-amber-900"
                }`}
              >
                <p className="font-semibold mb-2">Place requirements:</p>
                <ul className="space-y-1">
                  {checkItem(placeChecks.min2, "At least 2 characters")}
                  {checkItem(
                    placeChecks.allowed,
                    "Letters, spaces, commas, periods, apostrophes and hyphens only"
                  )}
                  {checkItem(placeChecks.max100, "Maximum 100 characters")}
                </ul>
              </div>
            )}

            {/* Date of Birth - Mobile Safe */}
            <div className="space-y-1.5">
              <label
                htmlFor="dob"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
              >
                Date of birth
              </label>
              <div className="relative group">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </span>
                <input
                  type={dobType}
                  id="dob"
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  min="1900-01-01"
                  max={maxDobStr}
                  placeholder={dobType === "text" ? "YYYY-MM-DD" : undefined}
                  inputMode={dobType === "text" ? "numeric" : undefined}
                  pattern={dobType === "text" ? "\\d{4}-\\d{2}-\\d{2}" : undefined}
                  className={`w-full border-2 pl-10 pr-3 py-2.5 rounded-xl transition-all duration-200 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 ${
                    darkMode
                      ? "border-slate-700 bg-slate-800/50 text-slate-100 hover:border-slate-600 [color-scheme:dark]"
                      : "border-slate-200 bg-white text-slate-900 hover:border-slate-300"
                  } ${showDobRules ? "border-amber-500 focus:border-amber-500" : ""}`}
                  required
                />
              </div>
            </div>

            {showDobRules && (
              <div
                className={`text-xs rounded-xl p-3 border ${
                  darkMode
                    ? "bg-amber-900/20 border-amber-800/30 text-amber-200"
                    : "bg-amber-50 border-amber-200 text-amber-900"
                }`}
              >
                <p className="font-semibold mb-2">Date of birth requirements:</p>
                <ul className="space-y-1">
                  {checkItem(dobChecks.valid, "Must be a valid date")}
                  {checkItem(dobChecks.notFuture, "Cannot be in the future")}
                  {checkItem(dobChecks.age13, "Must be 13 years or older")}
                </ul>
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
              >
                Email address
              </label>
              <div className="relative group">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </span>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  autoComplete="email"
                  inputMode="email"
                  className={`w-full border-2 pl-10 pr-3 py-2.5 rounded-xl transition-all duration-200 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 ${
                    darkMode
                      ? "border-slate-700 bg-slate-800/50 text-slate-100 placeholder-slate-500 hover:border-slate-600"
                      : "border-slate-200 bg-white text-slate-900 placeholder-slate-400 hover:border-slate-300"
                  } ${
                    !emailValid && formData.email
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                      : ""
                  }`}
                  required
                />
              </div>
              {!emailValid && formData.email && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Please enter a valid email address
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
              >
                Password
              </label>
              <div className="relative group">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </span>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter strong password"
                  autoComplete="new-password"
                  className={`w-full border-2 pl-10 pr-3 py-2.5 rounded-xl transition-all duration-200 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 ${
                    darkMode
                      ? "border-slate-700 bg-slate-800/50 text-slate-100 placeholder-slate-500 hover:border-slate-600"
                      : "border-slate-200 bg-white text-slate-900 placeholder-slate-400 hover:border-slate-300"
                  }`}
                  required
                />
              </div>

              {/* Password strength indicator */}
              {formData.password && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex-1 h-2 rounded-full overflow-hidden ${
                        darkMode ? "bg-slate-800" : "bg-slate-200"
                      }`}
                    >
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${strengthColor}`}
                        style={{ width: `${strengthPct}%` }}
                      />
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        strengthCount <= 2
                          ? "text-red-500"
                          : strengthCount <= 4
                          ? "text-amber-500"
                          : "text-emerald-500"
                      }`}
                    >
                      {strengthLabel}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="confirmPassword"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
              >
                Confirm password
              </label>
              <div className="relative group">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </span>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  className={`w-full border-2 pl-10 pr-3 py-2.5 rounded-xl transition-all duration-200 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 ${
                    darkMode
                      ? "border-slate-700 bg-slate-800/50 text-slate-100 placeholder-slate-500 hover:border-slate-600"
                      : "border-slate-200 bg-white text-slate-900 placeholder-slate-400 hover:border-slate-300"
                  } ${
                    formData.confirmPassword &&
                    formData.password !== formData.confirmPassword
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                      : ""
                  }`}
                  required
                />
              </div>
              {formData.confirmPassword &&
                formData.password !== formData.confirmPassword && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Passwords do not match
                  </p>
                )}
            </div>

            {showPasswordRules && (
              <div
                className={`text-xs rounded-xl p-3 border ${
                  darkMode
                    ? "bg-blue-900/20 border-blue-800/30 text-blue-200"
                    : "bg-blue-50 border-blue-200 text-blue-900"
                }`}
              >
                <p className="font-semibold mb-2">Password must contain:</p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                  {checkItem(passwordChecks.length, "8+ characters")}
                  {checkItem(passwordChecks.upper, "Uppercase (A-Z)")}
                  {checkItem(passwordChecks.lower, "Lowercase (a-z)")}
                  {checkItem(passwordChecks.number, "Number (0-9)")}
                  {checkItem(passwordChecks.symbol, "Special (!@#$...)")}
                </ul>
              </div>
            )}

            {/* Terms checkbox */}
            <label className="flex items-start space-x-3 py-2 cursor-pointer group">
              <input
                type="checkbox"
                name="acceptTerms"
                checked={formData.acceptTerms}
                onChange={handleChange}
                className="mt-1 h-4 w-4 rounded border-2 border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                required
              />
              <span
                className={`text-sm leading-relaxed ${
                  darkMode ? "text-slate-300" : "text-slate-700"
                }`}
              >
                I agree to the{" "}
                <Link
                  to="/terms#terms"
                  className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
                >
                  Terms & Conditions
                </Link>{" "}
                and{" "}
                <Link
                  to="/terms#privacy"
                  className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
                >
                  Privacy Policy
                </Link>
              </span>
            </label>

            {/* Submit button */}
            <button
              type="submit"
              disabled={!canSubmit}
              className={`relative w-full px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 transform ${
                canSubmit
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
                  : "bg-slate-400 cursor-not-allowed opacity-60"
              }`}
            >
              <span className="relative z-10">Create Account</span>
              {canSubmit && (
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 blur opacity-50 group-hover:opacity-70 transition-opacity" />
              )}
            </button>

            {/* Login link */}
            <p
              className={`text-center text-sm pt-2 ${
                darkMode ? "text-slate-400" : "text-slate-600"
              }`}
            >
              Already have an account?{" "}
              <Link
                className="text-blue-600 hover:text-blue-700 font-semibold hover:underline transition-colors"
                to="/login"
              >
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}