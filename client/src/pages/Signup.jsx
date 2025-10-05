// src/pages/Signup.jsx
import { useState } from "react";
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
    const d = new Date(val);
    const isValid = !isNaN(d.getTime());
    const notFuture = isValid ? d <= new Date() : false;
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
    <li className="flex items-center gap-2">
      <span className={ok ? "text-green-500" : "text-gray-400"}>
        {ok ? "✓" : "•"}
      </span>
      <span className={darkMode ? "text-slate-300" : "text-slate-700"}>
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
    strengthCount <= 2 ? "Weak" : strengthCount === 3 || strengthCount === 4 ? "Medium" : "Strong";
  const strengthColor =
    strengthCount <= 2 ? "bg-red-500" : strengthCount <= 4 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div
      className={`relative min-h-screen px-4 py-10 flex items-center justify-center transition-colors duration-300 ${
        darkMode
          ? "bg-slate-950 text-slate-200"
          : "bg-gradient-to-b from-slate-50 to-white text-slate-800"
      }`}
    >
      {/* Decorative background flares */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -right-32 h-72 w-72 rounded-full blur-3xl bg-gradient-to-br from-blue-500/20 to-cyan-400/10" />
        <div className="absolute -bottom-24 -left-32 h-72 w-72 rounded-full blur-3xl bg-gradient-to-tr from-indigo-400/10 to-blue-500/20" />
      </div>

      <div className="relative w-full max-w-md">
        <div
          className={`rounded-2xl shadow-xl border overflow-hidden ${
            darkMode ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"
          }`}
        >
          {/* Accent bar */}
          <div className="h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600" />

          <div
            className={`px-6 pt-6 pb-4 text-center border-b ${
              darkMode ? "border-slate-800" : "border-slate-200"
            }`}
          >
            <h1 className="text-2xl font-extrabold tracking-tight">
              Create your Connestro account
            </h1>
            <p className={`mt-1 text-sm ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
              Where connections grow stronger.
            </p>
          </div>

          <form onSubmit={handleSignup} className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="firstName" className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  First name
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5Zm0 2c-4 0-8 2-8 6v1h16v-1c0-4-4-6-8-6Z"/></svg>
                  </span>
                  <input
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="John"
                    className={`w-full border pl-9 pr-3 py-2 rounded-lg transition-colors duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      darkMode
                        ? "border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500"
                        : "border-slate-300 bg-white text-slate-900 placeholder-slate-500"
                    }`}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="lastName" className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Last name
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5Zm0 2c-4 0-8 2-8 6v1h16v-1c0-4-4-6-8-6Z"/></svg>
                  </span>
                  <input
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Doe"
                    className={`w-full border pl-9 pr-3 py-2 rounded-lg transition-colors duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      darkMode
                        ? "border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500"
                        : "border-slate-300 bg-white text-slate-900 placeholder-slate-500"
                    }`}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="gender" className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Gender
              </label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className={`w-full border px-3 py-2 rounded-lg transition-colors duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  darkMode
                    ? "border-slate-700 bg-slate-800 text-slate-100"
                    : "border-slate-300 bg-white text-slate-900"
                }`}
                required
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="place" className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Place
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7Zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z"/></svg>
                </span>
                <input
                  id="place"
                  name="place"
                  value={formData.place}
                  onChange={handleChange}
                  placeholder="City, Country"
                  maxLength={100}
                  className={`w-full border pl-9 pr-3 py-2 rounded-lg transition-colors duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    darkMode
                      ? "border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500"
                      : "border-slate-300 bg-white text-slate-900 placeholder-slate-500"
                  } ${showPlaceRules ? "border-amber-500" : ""}`}
                  required
                />
              </div>
            </div>

            {showPlaceRules && (
              <div
                className={`text-xs rounded-lg p-3 ${
                  darkMode ? "bg-slate-800 text-slate-200" : "bg-amber-50 text-slate-700"
                }`}
              >
                <p className="font-medium mb-2">Place must be:</p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                  {checkItem(placeChecks.min2, "At least 2 characters")}
                  {checkItem(placeChecks.allowed, "Letters, spaces, commas, periods, ' and -")}
                  {checkItem(placeChecks.max100, "Max 100 characters")}
                </ul>
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="dob" className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Date of birth
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2h2v2h6V2h2v2h3v18H4V4h3V2Zm13 6H4v12h16V8Z"/></svg>
                </span>
                <input
                  type="date"
                  id="dob"
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  className={`w-full border pl-9 pr-3 py-2 rounded-lg transition-colors duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    darkMode
                      ? "border-slate-700 bg-slate-800 text-slate-100"
                      : "border-slate-300 bg-white text-slate-900"
                  } ${showDobRules ? "border-amber-500" : ""}`}
                  required
                />
              </div>
            </div>

            {showDobRules && (
              <div
                className={`text-xs rounded-lg p-3 ${
                  darkMode ? "bg-slate-800 text-slate-200" : "bg-amber-50 text-slate-700"
                }`}
              >
                <p className="font-medium mb-2">DOB must be:</p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                  {checkItem(dobChecks.valid, "A valid date")}
                  {checkItem(dobChecks.notFuture, "Not in the future")}
                  {checkItem(dobChecks.age13, "Age 13+")}
                </ul>
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="email" className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Email
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4a2 2 0 0 0-2 2v1.2l10 5.8 10-5.8V6a2 2 0 0 0-2-2Zm0 6.4-8 4.6-8-4.6V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-7.6Z"/></svg>
                </span>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className={`w-full border pl-9 pr-3 py-2 rounded-lg transition-colors duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    darkMode
                      ? "border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500"
                      : "border-slate-300 bg-white text-slate-900 placeholder-slate-500"
                  } ${emailValid ? "" : "border-red-500"}`}
                  required
                />
              </div>
              {!emailValid && (
                <p className="text-xs text-red-500 mt-1">
                  Please enter a valid email address.
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="password" className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Password
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17 8V7a5 5 0 1 0-10 0v1H5v14h14V8h-2ZM9 7a3 3 0 1 1 6 0v1H9V7Z"/></svg>
                </span>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={`w-full border pl-9 pr-3 py-2 rounded-lg transition-colors duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    darkMode
                      ? "border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500"
                      : "border-slate-300 bg-white text-slate-900 placeholder-slate-500"
                  }`}
                  required
                />
              </div>

              {/* Visual strength bar (derived from existing checks) */}
              {formData.password && (
                <div className="mt-2">
                  <div className={`h-1.5 rounded-full ${darkMode ? "bg-slate-800" : "bg-slate-200"}`}>
                    <div
                      className={`h-1.5 rounded-full transition-all duration-300 ${strengthColor}`}
                      style={{ width: `${strengthPct}%` }}
                    />
                  </div>
                  <p className={`mt-1 text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                    Strength: {strengthLabel}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="confirmPassword" className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Confirm password
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17 8V7a5 5 0 1 0-10 0v1H5v14h14V8h-2ZM9 7a3 3 0 1 1 6 0v1H9V7Z"/></svg>
                </span>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={`w-full border pl-9 pr-3 py-2 rounded-lg transition-colors duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    darkMode
                      ? "border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500"
                      : "border-slate-300 bg-white text-slate-900 placeholder-slate-500"
                  } ${
                    formData.confirmPassword && formData.password !== formData.confirmPassword
                      ? "border-red-500"
                      : ""
                  }`}
                  required
                />
              </div>
              {formData.confirmPassword &&
                formData.password !== formData.confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match.</p>
                )}
            </div>

            {showPasswordRules && (
              <div
                className={`text-xs rounded-lg p-3 ${
                  darkMode ? "bg-slate-800 text-slate-200" : "bg-slate-50 text-slate-700"
                }`}
              >
                <p className="font-medium mb-2">Password must contain:</p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                  {checkItem(passwordChecks.length, "At least 8 characters")}
                  {checkItem(passwordChecks.upper, "An uppercase letter (A-Z)")}
                  {checkItem(passwordChecks.lower, "A lowercase letter (a-z)")}
                  {checkItem(passwordChecks.number, "A number (0-9)")}
                  {checkItem(passwordChecks.symbol, "A special character (!@#$...)")}
                </ul>
              </div>
            )}

            <label className="flex items-start space-x-2 text-sm">
              <input
                type="checkbox"
                name="acceptTerms"
                checked={formData.acceptTerms}
                onChange={handleChange}
                className="mt-1 h-4 w-4 rounded border-slate-300"
                required
              />
              <span className={`${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                I agree to the{" "}
                <Link to="/terms#terms" className="text-blue-600 hover:underline">
                  Terms & Conditions
                </Link>{" "}
                and{" "}
                <Link to="/terms#privacy" className="text-blue-600 hover:underline">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>

            <button
              type="submit"
              disabled={!canSubmit}
              className={`w-full px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                canSubmit
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-slate-400 text-white cursor-not-allowed"
              }`}
            >
              Create account
            </button>

            <p
              className={`text-center text-sm pt-1 ${
                darkMode ? "text-slate-400" : "text-slate-600"
              }`}
            >
              Already have an account?{" "}
              <Link className="text-blue-600 hover:underline" to="/login">
                Log in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}