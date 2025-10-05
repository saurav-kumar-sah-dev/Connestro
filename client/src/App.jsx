// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import Feed from "./pages/Feed";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import { AppProvider } from "./context/AppContext";
import PostDetails from "./pages/PostDetails";
import AdminDashboard from "./pages/AdminDashboard";
import Footer from "./components/Footer";
import { ThemeProvider } from "./context/ThemeContext";
import FollowersFollowingPage from "./pages/FollowersFollowingPage";
import Terms from "./pages/Terms";
import AdminRoute from "./routes/AdminRoute";
import SetPassword from "./pages/SetPassword";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Messages from "./pages/Messages";
import { ChatProvider } from "./context/ChatContext";
import StartChatRoute from "./routes/StartChatRoute";
import CallModal from "./components/chat/CallModal";
import Notifications from "./pages/Notifications";
import MyReports from "./pages/MyReports";
import { ensureActiveSeed } from "./utils/accounts";
import Reels from "./pages/Reels";

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("token"));

  useEffect(() => {
    ensureActiveSeed();
  }, []);

  useEffect(() => {
    const update = () => setToken(localStorage.getItem("token"));
    window.addEventListener("auth:changed", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("auth:changed", update);
      window.removeEventListener("storage", update);
    };
  }, []);

  return (
    <ThemeProvider>
      {/* Force a fresh AppContext on account switch */}
      <AppProvider key={token}>
        <BrowserRouter>
          {/* Force a fresh ChatContext on account switch too */}
          <ChatProvider key={token}>
            <Navbar />
            <CallModal />
            <Routes>
              <Route path="/home" element={<Home />} />
              <Route path="/terms" element={<Terms />} />
              <Route
                path="/"
                element={token ? <Feed /> : <Navigate to="/home" replace />}
              />

              {/* Reels */}
              <Route
                path="/reels"
                element={token ? <Reels /> : <Navigate to="/home" replace />}
              />
              <Route
                path="/reels/:startId"
                element={token ? <Reels /> : <Navigate to="/home" replace />}
              />

              <Route
                path="/messages"
                element={token ? <Messages /> : <Navigate to="/home" replace />}
              />
              <Route
                path="/messages/:id"
                element={token ? <Messages /> : <Navigate to="/home" replace />}
              />
              <Route
                path="/messages/u/:userId"
                element={
                  token ? <StartChatRoute /> : <Navigate to="/home" replace />
                }
              />

              <Route
                path="/profile/:id"
                element={token ? <Profile /> : <Navigate to="/home" replace />}
              />
              <Route
                path="/profile/:id/followers"
                element={
                  token ? (
                    <FollowersFollowingPage />
                  ) : (
                    <Navigate to="/home" replace />
                  )
                }
              />
              <Route
                path="/profile/:id/following"
                element={
                  token ? (
                    <FollowersFollowingPage />
                  ) : (
                    <Navigate to="/home" replace />
                  )
                }
              />

              <Route
                path="/post/:id"
                element={
                  token ? <PostDetails /> : <Navigate to="/home" replace />
                }
              />

              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                }
              />

              <Route
                path="/notifications"
                element={
                  token ? <Notifications /> : <Navigate to="/home" replace />
                }
              />
              <Route
                path="/my-reports"
                element={
                  token ? <MyReports /> : <Navigate to="/home" replace />
                }
              />

              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route
                path="/settings/password"
                element={
                  token ? <SetPassword /> : <Navigate to="/home" replace />
                }
              />
            </Routes>
            <Footer />
          </ChatProvider>
        </BrowserRouter>
      </AppProvider>
    </ThemeProvider>
  );
}