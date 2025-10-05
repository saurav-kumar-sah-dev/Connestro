// src/pages/ForgotPassword.jsx
import { useState } from "react";
import API from "../api/axios";
import { useTheme } from "../context/ThemeContext";
import { Link } from "react-router-dom";

export default function ForgotPassword() {
  const { darkMode } = useTheme();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      setLoading(true);
      await API.post("/auth/forgot-password", { email });
      setSent(true);
    } catch {
      setSent(true);
    } finally {
      setLoading(false);
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
            darkMode
              ? "bg-slate-900 border-slate-800"
              : "bg-white border-slate-200"
          }`}
        >
          <div
            className={`px-6 pt-6 pb-4 text-center border-b ${
              darkMode ? "border-slate-800" : "border-slate-200"
            }`}
          >
            <h1 className="text-2xl font-bold">Forgot your password?</h1>
            <p className={`mt-1 text-sm ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
              Enter your Connestro account email and we’ll send you a reset link.
            </p>
          </div>

          <div className="p-6">
            {sent ? (
              <div
                className={`p-4 rounded-lg ${
                  darkMode ? "bg-slate-800 text-slate-200" : "bg-green-50 text-slate-800"
                }`}
              >
                <p>
                  If that email is registered, a reset link has been sent. Check your inbox and spam folder.
                </p>
                <p className="mt-3 text-sm">
                  <Link
                    to="/login"
                    className={`${darkMode ? "text-blue-400" : "text-blue-600"} hover:underline`}
                  >
                    Back to Login
                  </Link>
                </p>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className={`w-full border px-3 py-2 rounded-lg transition-colors ${
                    darkMode
                      ? "border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500"
                      : "border-slate-300 bg-white text-slate-900 placeholder-slate-500"
                  }`}
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full px-4 py-2 rounded-lg font-medium text-white transition-colors ${
                    loading
                      ? "bg-slate-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {loading ? "Sending..." : "Send reset link"}
                </button>

                <p className={`text-center text-sm ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
                  Remembered your password?{" "}
                  <Link to="/login" className="text-blue-600 hover:underline">
                    Log in
                  </Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}