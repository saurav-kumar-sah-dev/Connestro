// src/components/SocialLogin.jsx
import { useEffect, useRef, useState } from "react";
import API from "../api/axios";

export default function SocialLogin({ onSuccess, onNeedTerms, acceptTerms }) {
  const [ready, setReady] = useState(false);
  const acceptRef = useRef(acceptTerms);

  // keep checkbox state fresh during async callback
  useEffect(() => {
    acceptRef.current = acceptTerms;
  }, [acceptTerms]);

  // Load Google script once
  useEffect(() => {
    if (window.google?.accounts?.id) {
      setReady(true);
      return;
    }
    if (!document.getElementById("gsi-client")) {
      const s = document.createElement("script");
      s.id = "gsi-client";
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.defer = true;
      s.onload = () => setReady(true);
      document.body.appendChild(s);
    }
  }, []);

  useEffect(() => {
    if (!ready || !window.google?.accounts?.id) return;

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
    if (!clientId || !clientId.endsWith(".apps.googleusercontent.com")) {
      console.error("❌ Invalid Google Client ID:", clientId);
      return;
    }

    try {
      // kill any previous auto‑select sessions
      window.google.accounts.id.disableAutoSelect();
      window.google.accounts.id.cancel();
    } catch (e) {
      console.debug("Disable auto‑select:", e?.message);
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      ux_mode: "popup", // avoids page redirect + iframe checks
      auto_select: false,
      use_fedcm_for_prompt: false, // turn off experimental FedCM
      itp_support: false, // avoids extra ITP iframes in Safari
      callback: async ({ credential }) => {
        if (!credential) return;
        try {
          const res = await API.post("/auth/social/google", {
            idToken: credential,
            acceptTerms: acceptRef.current,
          });
          if (res?.data?.token) {
            onSuccess(res.data);
          } else {
            alert("Google login failed");
          }
        } catch (err) {
          const apiErr = err.response?.data;
          if (apiErr?.code === "TERMS_NOT_ACCEPTED") {
            onNeedTerms({ provider: "google", payload: { idToken: credential } });
          } else {
            alert(apiErr?.msg || "Google login failed");
          }
        }
      },
    });

    const btn = document.getElementById("gsi-btn");
    if (btn) {
      btn.innerHTML = ""; // clear previous renders
      window.google.accounts.id.renderButton(btn, {
        theme: "outline",
        size: "large",
        text: "signin_with",
        width: 300,
      });
    }

    return () => {
      // optional cleanup on hot reload
      window.google?.accounts?.id?.cancel?.();
    };
  }, [ready, onSuccess, onNeedTerms]);

  return (
    <div id="gsi-btn" className="mt-3 flex justify-center">
      {/* Google button renders here */}
    </div>
  );
}