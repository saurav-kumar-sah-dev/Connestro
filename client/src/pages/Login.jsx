// src/pages/Login.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../api/axios";
import { useTheme } from "../context/ThemeContext";
import SocialLogin from "../components/SocialLogin";
import { upsertAccount } from "../utils/accounts";

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [needTerms, setNeedTerms] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingSocial, setPendingSocial] = useState(null);

  const navigate = useNavigate();
  const { darkMode } = useTheme();

  const completeLogin = (data) => {
    // Multi-account: store or update this account and activate it
    upsertAccount(data);
    if (data.user.role === "admin") navigate("/admin");
    else navigate("/");
  };

  const doLogin = async (payload) => {
    try {
      setSubmitting(true);
      const res = await API.post("/auth/login", payload);
      if (res.data?.token) {
        completeLogin(res.data);
      } else {
        alert("Login failed");
      }
    } catch (err) {
      const apiErr = err.response?.data;
      if (apiErr?.code === "TERMS_NOT_ACCEPTED") {
        setNeedTerms(true);
      } else {
        alert(apiErr?.msg || "Login failed. Please check your credentials.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    await doLogin({ identifier, password });
  };

  const acceptAndLogin = async () => {
    if (!acceptTerms) {
      alert("Please accept the Terms and Conditions to continue.");
      return;
    }
    if (pendingSocial?.provider === "google") {
      try {
        setSubmitting(true);
        const res = await API.post("/auth/social/google", {
          ...pendingSocial.payload,
          acceptTerms: true,
        });
        if (res?.data?.token) completeLogin(res.data);
      } catch (err) {
        alert(err.response?.data?.msg || "Login failed");
      } finally {
        setPendingSocial(null);
        setSubmitting(false);
      }
    } else {
      await doLogin({ identifier, password, acceptTerms: true });
    }
  };

  return (
    <div
      className={`min-h-screen px-4 py-10 flex items-center justify-center transition-colors duration-300 ${
        darkMode
          ? "bg-slate-950 text-slate-200"
          : "bg-gradient-to-b from-slate-50 to-white text-slate-800"
      }`}
    >
      <div className="w-full max-w-md">
        <div
          className={`relative rounded-2xl shadow-lg border overflow-hidden ${
            darkMode ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"
          }`}
        >
          <div
            className={`px-6 pt-6 pb-4 text-center border-b ${
              darkMode ? "border-slate-800" : "border-slate-200"
            }`}
          >
            <h1 className="text-2xl font-bold">Welcome back to Connestro</h1>
            <p className={`mt-1 text-sm ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
              Where connections grow stronger.
            </p>
          </div>

          <div className="p-6">
            <form onSubmit={handleLogin} className="flex flex-col space-y-4">
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Username or Email"
                className={`border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 transition-colors duration-200 ${
                  darkMode
                    ? "border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500 focus:ring-blue-500"
                    : "border-slate-300 bg-white text-slate-900 placeholder-slate-500 focus:ring-blue-500"
                }`}
                required
                disabled={submitting}
              />

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className={`border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 transition-colors duration-200 ${
                  darkMode
                    ? "border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500 focus:ring-blue-500"
                    : "border-slate-300 bg-white text-slate-900 placeholder-slate-500 focus:ring-blue-500"
                }`}
                required
                disabled={submitting}
              />

              <div className="flex justify-end -mt-1">
                <Link
                  to="/forgot-password"
                  className={`text-sm ${darkMode ? "text-blue-400" : "text-blue-600"} hover:underline`}
                >
                  Forgot password?
                </Link>
              </div>

              {!needTerms && (
                <button
                  type="submit"
                  disabled={submitting}
                  className={`w-full rounded-lg px-4 py-2 font-medium transition-colors duration-200 ${
                    submitting
                      ? "opacity-70 cursor-not-allowed bg-blue-600 text-white"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {submitting ? "Logging in..." : "Log in"}
                </button>
              )}
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className={`h-px ${darkMode ? "bg-slate-800" : "bg-slate-200"}`} />
              <span
                className={`absolute inset-0 -top-3 mx-auto w-fit px-3 text-xs ${
                  darkMode ? "bg-slate-900 text-slate-400" : "bg-white text-slate-500"
                }`}
              >
                Or continue with
              </span>
            </div>

            <SocialLogin
              onSuccess={completeLogin}
              onNeedTerms={(pending) => {
                setPendingSocial(pending);
                setNeedTerms(true);
              }}
              acceptTerms={acceptTerms}
            />

            {needTerms && (
              <div
                className={`mt-5 p-4 rounded-lg border ${
                  darkMode
                    ? "bg-slate-800 border-slate-700 text-slate-200"
                    : "bg-slate-50 border-slate-200 text-slate-800"
                }`}
              >
                <p className="text-sm mb-2 font-medium">
                  Please accept the Terms & Conditions to continue. This is a one-time step.
                </p>
                <label className="flex items-start space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300"
                  />
                  <span>
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
                  onClick={acceptAndLogin}
                  disabled={submitting}
                  className={`mt-3 w-full rounded-lg px-4 py-2 font-medium transition-colors duration-200 ${
                    submitting
                      ? "opacity-70 cursor-not-allowed bg-blue-600 text-white"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {submitting ? "Please wait..." : "Accept & Continue"}
                </button>
              </div>
            )}

            <p
              className={`mt-6 text-center text-sm transition-colors duration-300 ${
                darkMode ? "text-slate-400" : "text-slate-600"
              }`}
            >
              Don’t have an account?{" "}
              <Link className="text-blue-600 hover:underline" to="/signup">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}