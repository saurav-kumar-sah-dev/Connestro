// src/pages/ResetPassword.jsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import API from "../api/axios";
import { useTheme } from "../context/ThemeContext";
import { upsertAccount } from "../utils/accounts";

function useQuery() {
  const { search } = useLocation();
  return new URLSearchParams(search);
}

export default function ResetPassword() {
  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const q = useQuery();

  const token = q.get("token") || "";
  const email = q.get("email") || "";

  const [valid, setValid] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const [checks, setChecks] = useState({
    length: false,
    upper: false,
    lower: false,
    number: false,
    symbol: false,
  });

  useEffect(() => {
    const verify = async () => {
      if (!token || !email) {
        setValid(false);
        return;
      }
      try {
        const res = await API.get("/auth/reset-password/verify", {
          params: { token, email },
        });
        setValid(!!res.data?.valid);
      } catch {
        setValid(false);
      }
    };
    verify();
  }, [token, email]);

  useEffect(() => {
    const pwd = newPassword || "";
    setChecks({
      length: pwd.length >= 8,
      upper: /[A-Z]/.test(pwd),
      lower: /[a-z]/.test(pwd),
      number: /\d/.test(pwd),
      symbol: /[^A-Za-z0-9]/.test(pwd),
    });
  }, [newPassword]);

  const allOk =
    checks.length && checks.upper && checks.lower && checks.number && checks.symbol;
  const match = newPassword && confirm && newPassword === confirm;

  const submit = async (e) => {
    e.preventDefault();
    if (!allOk)
      return alert(
        "Password must include 8+ chars, upper, lower, number, and a special character."
      );
    if (!match) return alert("Passwords do not match.");

    try {
      setLoading(true);
      const res = await API.post("/auth/reset-password", {
        token,
        email,
        newPassword,
        confirmPassword: confirm,
      });
      if (res.data?.token) {
        // Multi-account: store and activate
        upsertAccount(res.data);
        navigate("/");
      } else {
        alert("Password reset failed");
      }
    } catch (err) {
      alert(err.response?.data?.msg || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  if (valid === null) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          darkMode ? "bg-slate-950 text-slate-200" : "bg-slate-50 text-slate-800"
        }`}
      >
        <p className="text-sm">Verifying link...</p>
      </div>
    );
  }

  if (!valid) {
    return (
      <div
        className={`min-h-screen px-4 py-10 flex items-center justify-center ${
          darkMode ? "bg-slate-950" : "bg-slate-50"
        }`}
      >
        <div
          className={`w-full max-w-md rounded-2xl shadow-lg border p-8 text-center ${
            darkMode ? "bg-slate-900 border-slate-800 text-slate-200" : "bg-white border-slate-200 text-slate-800"
          }`}
        >
          <h2 className="text-2xl font-bold mb-2">Reset Password</h2>
          <p className={`${darkMode ? "text-slate-300" : "text-slate-600"}`}>
            This link is invalid or has expired.
          </p>
          <p className="mt-3 text-sm">
            <Link
              to="/forgot-password"
              className={`${darkMode ? "text-blue-400" : "text-blue-600"} hover:underline`}
            >
              Request a new link
            </Link>
          </p>
        </div>
      </div>
    );
  }

  const checkItem = (ok, label) => (
    <li className="flex items-center gap-2">
      <span className={ok ? "text-green-500" : "text-gray-400"}>
        {ok ? "✓" : "•"}
      </span>
      <span className={darkMode ? "text-slate-300" : "text-slate-700"}>{label}</span>
    </li>
  );

  return (
    <div
      className={`min-h-screen px-4 py-10 flex items-center justify-center ${
        darkMode
          ? "bg-slate-950 text-slate-200"
          : "bg-gradient-to-b from-slate-50 to-white text-slate-800"
      }`}
    >
      <div className="w-full max-w-md">
        <div
          className={`rounded-2xl shadow-lg border overflow-hidden ${
            darkMode ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"
          }`}
        >
          <div
            className={`px-6 pt-6 pb-3 text-center border-b ${
              darkMode ? "border-slate-800" : "border-slate-200"
            }`}
          >
            <h2 className="text-2xl font-bold">Set a new password</h2>
            <p className={`text-sm mb-2 ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
              for {email}
            </p>
          </div>

          <form onSubmit={submit} className="p-6 space-y-4">
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={`w-full border px-3 py-2 rounded-lg transition-colors ${
                darkMode
                  ? "border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500"
                  : "border-slate-300 bg-white text-slate-900 placeholder-slate-500"
              }`}
              required
            />

            <input
              type="password"
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={`w-full border px-3 py-2 rounded-lg transition-colors ${
                darkMode
                  ? "border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500"
                  : "border-slate-300 bg-white text-slate-900 placeholder-slate-500"
              } ${confirm && newPassword !== confirm ? "border-red-500" : ""}`}
              required
            />
            {confirm && newPassword !== confirm && (
              <p className="text-xs text-red-500">Passwords do not match.</p>
            )}

            {newPassword && !allOk && (
              <div
                className={`text-xs rounded-lg p-3 ${
                  darkMode ? "bg-slate-800 text-slate-200" : "bg-slate-50 text-slate-700"
                }`}
              >
                <p className="font-medium mb-2">Password must contain:</p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                  {checkItem(checks.length, "At least 8 characters")}
                  {checkItem(checks.upper, "An uppercase letter (A-Z)")}
                  {checkItem(checks.lower, "A lowercase letter (a-z)")}
                  {checkItem(checks.number, "A number (0-9)")}
                  {checkItem(checks.symbol, "A special character (!@#$...)")}
                </ul>
              </div>
            )}

            <button
              type="submit"
              disabled={!allOk || !match || loading}
              className={`w-full px-4 py-2 rounded-lg font-medium text-white transition-colors ${
                !allOk || !match || loading
                  ? "bg-slate-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {loading ? "Updating..." : "Update password"}
            </button>

            <p className="text-center text-sm mt-2">
              <Link
                to="/login"
                className={`${darkMode ? "text-blue-400" : "text-blue-600"} hover:underline`}
              >
                Back to Login
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}