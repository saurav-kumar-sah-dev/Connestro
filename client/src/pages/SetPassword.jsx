// src/pages/SetPassword.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import { useTheme } from "../context/ThemeContext";

function getChecks(pwd) {
  return {
    length: pwd.length >= 8,
    upper: /[A-Z]/.test(pwd),
    lower: /[a-z]/.test(pwd),
    number: /\d/.test(pwd),
    symbol: /[^A-Za-z0-9]/.test(pwd),
  };
}

export default function SetPassword() {
  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [checks, setChecks] = useState(getChecks(""));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const needsCurrent = !!user?.passwordSet;

  useEffect(() => {
    setChecks(getChecks(newPassword));
  }, [newPassword]);

  const allOk =
    checks.length &&
    checks.upper &&
    checks.lower &&
    checks.number &&
    checks.symbol &&
    newPassword === confirmPassword &&
    (!needsCurrent || currentPassword.length > 0);

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    if (!allOk)
      return setMsg(
        "Please meet the password requirements and confirm correctly."
      );
    try {
      setSaving(true);
      const payload = { newPassword, confirmPassword };
      if (needsCurrent) payload.currentPassword = currentPassword;
      const res = await API.patch("/users/me/password", payload);
      if (res.data?.success) {
        const u = JSON.parse(localStorage.getItem("user") || "null");
        if (u) {
          u.passwordSet = true;
          localStorage.setItem("user", JSON.stringify(u));
        }
        setMsg("Password updated ✅");
        setTimeout(() => navigate("/"), 1000);
      } else {
        setMsg("Failed to update password");
      }
    } catch (err) {
      setMsg(err.response?.data?.msg || "Failed to update password");
    } finally {
      setSaving(false);
    }
  };

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
            className={`px-6 pt-6 pb-4 text-center border-b ${
              darkMode ? "border-slate-800" : "border-slate-200"
            }`}
          >
            <h1 className="text-2xl font-bold">
              {needsCurrent ? "Change Password" : "Set Your Password"}
            </h1>
            <p className={`mt-1 text-sm ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
              Keep your Connestro account secure.
            </p>
          </div>

          <form onSubmit={submit} className="p-6 space-y-4">
            {needsCurrent && (
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Current password"
                className={`w-full border px-3 py-2 rounded-lg transition-colors ${
                  darkMode
                    ? "border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500"
                    : "border-slate-300 bg-white text-slate-900 placeholder-slate-500"
                }`}
                required
              />
            )}

            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
              className={`w-full border px-3 py-2 rounded-lg transition-colors ${
                darkMode
                  ? "border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500"
                  : "border-slate-300 bg-white text-slate-900 placeholder-slate-500"
              }`}
              required
            />

            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className={`w-full border px-3 py-2 rounded-lg transition-colors ${
                darkMode
                  ? "border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500"
                  : "border-slate-300 bg-white text-slate-900 placeholder-slate-500"
              }`}
              required
            />

            <div
              className={`text-xs rounded-lg p-3 ${
                darkMode ? "bg-slate-800 text-slate-200" : "bg-slate-50 text-slate-700"
              }`}
            >
              <p className="font-medium mb-1">Password must contain:</p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                <li className={checks.length ? "text-green-500" : "text-gray-400"}>
                  {checks.length ? "✓" : "•"} At least 8 characters
                </li>
                <li className={checks.upper ? "text-green-500" : "text-gray-400"}>
                  {checks.upper ? "✓" : "•"} An uppercase letter (A-Z)
                </li>
                <li className={checks.lower ? "text-green-500" : "text-gray-400"}>
                  {checks.lower ? "✓" : "•"} A lowercase letter (a-z)
                </li>
                <li className={checks.number ? "text-green-500" : "text-gray-400"}>
                  {checks.number ? "✓" : "•"} A number (0-9)
                </li>
                <li className={checks.symbol ? "text-green-500" : "text-gray-400"}>
                  {checks.symbol ? "✓" : "•"} A special character (!@#$...)
                </li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={!allOk || saving}
              className={`w-full px-4 py-2 rounded-lg font-medium text-white transition-colors ${
                !allOk || saving
                  ? "bg-slate-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {saving ? "Saving..." : needsCurrent ? "Change Password" : "Set Password"}
            </button>

            {msg && (
              <p
                className={`text-sm mt-2 ${
                  /✅/.test(msg) ? "text-green-600" : "text-red-500"
                }`}
              >
                {msg}
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}