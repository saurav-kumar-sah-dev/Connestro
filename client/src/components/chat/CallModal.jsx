import { useContext, useEffect, useRef, useState } from "react";
import { ChatContext } from "../../context/ChatContext";
import { AppContext } from "../../context/AppContext";
import {
  IoMicOff,
  IoMic,
  IoVideocam,
  IoVideocamOff,
  IoPause,
  IoPlay,
  IoCall,
  IoVolumeHigh,
  IoWarningOutline,
} from "react-icons/io5";

const RING_TIMEOUT_SEC = Number(import.meta.env.VITE_CALL_RING_TIMEOUT_SEC || 30);

// Parse ICE servers from env
function getIceServers() {
  const stunList = (import.meta.env.VITE_STUN_URLS ||
    "stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const turnUrls = (import.meta.env.VITE_TURN_URLS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const turnUsername = import.meta.env.VITE_TURN_USERNAME || "";
  const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL || "";

  const servers = [];
  if (stunList.length) servers.push({ urls: stunList });
  if (turnUrls.length && turnUsername && turnCredential) {
    servers.push({ urls: turnUrls, username: turnUsername, credential: turnCredential });
  }
  return servers.length ? servers : [{ urls: ["stun:stun.l.google.com:19302"] }];
}

// Reorder codecs to prefer H.264 (helps Safari/Chrome interop)
function preferH264InCapabilities() {
  try {
    const caps = RTCRtpSender.getCapabilities && RTCRtpSender.getCapabilities("video");
    if (!caps || !caps.codecs) return null;
    const h264 = caps.codecs.filter(
      (c) => c.mimeType && c.mimeType.toLowerCase() === "video/h264" && !/packetization-mode=0/i.test(c.sdpFmtpLine || "")
    );
    const others = caps.codecs.filter((c) => !h264.includes(c));
    return [...h264, ...others];
  } catch {
    return null;
  }
}

// SDP munger fallback to prefer H.264 if setCodecPreferences is unavailable
function preferH264InSdp(sdp) {
  try {
    const lines = sdp.split("\r\n");
    const mIndex = lines.findIndex((l) => l.startsWith("m=video"));
    if (mIndex === -1) return sdp;

    // Collect H.264 payload types
    const h264Pts = [];
    for (const l of lines) {
      if (l.startsWith("a=rtpmap:")) {
        // a=rtpmap:<pt> <codec>/<clock>[/channels]
        const parts = l.substring("a=rtpmap:".length).split(" ");
        const pt = parts[0];
        const codec = (parts[1] || "").split("/")[0].toLowerCase();
        if (codec === "h264") h264Pts.push(pt);
      }
    }
    if (!h264Pts.length) return sdp;

    // Reorder m=video line to put H264 payload types first
    const mParts = lines[mIndex].split(" ");
    const header = mParts.slice(0, 3);
    const payloads = mParts.slice(3);
    const newPayloads = [...h264Pts.filter((pt) => payloads.includes(pt)), ...payloads.filter((pt) => !h264Pts.includes(pt))];
    lines[mIndex] = [...header, ...newPayloads].join(" ");
    return lines.join("\r\n");
  } catch {
    return sdp;
  }
}

export default function CallModal() {
  const { socket } = useContext(AppContext);
  const { call, acceptCall, declineCall, endCall, setCall } = useContext(ChatContext);

  const pcRef = useRef(null);
  const hasOfferedRef = useRef(false);
  const negotiatingRef = useRef(false);
  const readyToNegotiateRef = useRef(false);

  const localStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);

  // Ringtones + tones
  const ringOutRef = useRef(null);
  const ringInRef = useRef(null);
  const connectedToneRef = useRef(null);
  const endToneRef = useRef(null);

  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [onHold, setOnHold] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [ringLeft, setRingLeft] = useState(RING_TIMEOUT_SEC);
  const [audioUnlockNeeded, setAudioUnlockNeeded] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [iceState, setIceState] = useState("");
  const [bitrate, setBitrate] = useState({ outKbps: 0, inKbps: 0 });

  const peerId = call?.peerId;
  const isCaller = call?.role === "caller";
  const accepted = call?.state === "accepted";
  const media = call?.media || "audio";
  const conversationId = call?.conversationId;

  // Init audio assets once
  useEffect(() => {
    ringOutRef.current = new Audio("/sounds/ring-outgoing.mp3");
    ringOutRef.current.loop = true;
    ringOutRef.current.preload = "auto";
    ringOutRef.current.volume = 0.9;

    ringInRef.current = new Audio("/sounds/ring-incoming.mp3");
    ringInRef.current.loop = true;
    ringInRef.current.preload = "auto";
    ringInRef.current.volume = 0.9;

    connectedToneRef.current = new Audio("/sounds/connected.mp3");
    connectedToneRef.current.preload = "auto";
    connectedToneRef.current.volume = 0.9;

    endToneRef.current = new Audio("/sounds/end.mp3");
    endToneRef.current.preload = "auto";
    endToneRef.current.volume = 0.9;
  }, []);

  const stopAllRings = () => {
    try {
      if (ringOutRef.current) {
        ringOutRef.current.pause();
        ringOutRef.current.currentTime = 0;
      }
      if (ringInRef.current) {
        ringInRef.current.pause();
        ringInRef.current.currentTime = 0;
      }
    } catch {}
  };

  const playOutgoingRing = async () => {
    try {
      await ringOutRef.current?.play();
    } catch {
      setAudioUnlockNeeded(true);
    }
  };

  const playIncomingRing = async () => {
    try {
      await ringInRef.current?.play();
    } catch {
      setAudioUnlockNeeded(true);
    }
  };

  const playConnectedTone = async () => {
    try {
      await connectedToneRef.current?.play();
    } catch {}
  };

  const playEndTone = async () => {
    try {
      await endToneRef.current?.play();
    } catch {}
  };

  const cleanup = () => {
    try {
      const pc = pcRef.current;
      if (pc) {
        pc.onicecandidate = null;
        pc.onnegotiationneeded = null;
        pc.ontrack = null;
        pc.oniceconnectionstatechange = null;

        try {
          pc.getSenders().forEach((s) => s.track && s.track.stop());
        } catch {}
        try {
          pc.getReceivers().forEach((r) => r.track && r.track.stop());
        } catch {}

        pc.close();
      }
    } catch {}
    pcRef.current = null;
    hasOfferedRef.current = false;
    negotiatingRef.current = false;
    readyToNegotiateRef.current = false;

    if (localStreamRef.current) {
      try {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      } catch {}
      localStreamRef.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;

    stopAllRings();
    setElapsed(0);
    setRingLeft(RING_TIMEOUT_SEC);
    setMuted(false);
    setCameraOff(false);
    setOnHold(false);
    setMediaError("");
    setIceState("");
    setBitrate({ outKbps: 0, inKbps: 0 });
  };

  useEffect(() => {
    return () => cleanup();
  }, []);

  // Elapsed timer when accepted
  useEffect(() => {
    if (!accepted) return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [accepted]);

  // Local ring countdown (UI only; server enforces timeout)
  useEffect(() => {
    if (!call || accepted) return;
    if (!(call.state === "calling" || call.state === "ringing")) return;
    setRingLeft(RING_TIMEOUT_SEC);
    const id = setInterval(() => setRingLeft((v) => (v > 0 ? v - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [call, accepted]);

  // Start/stop ringtones based on state
  useEffect(() => {
    if (!call) {
      stopAllRings();
      return;
    }
    if (accepted) {
      stopAllRings();
      playConnectedTone();
      return;
    }
    if (call.role === "caller" && call.state === "calling") {
      stopAllRings();
      playOutgoingRing();
    } else if (call.role === "callee" && call.state === "ringing") {
      stopAllRings();
      playIncomingRing();
    } else {
      stopAllRings();
    }
  }, [call, accepted]);

  // More flexible constraints with fallback (helps older browsers)
  const getConstraints = () =>
    media === "video"
      ? {
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
            facingMode: "user",
          },
        }
      : { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false };

  const ensureLocal = async () => {
    if (!localStreamRef.current) {
      try {
        // Try ideal constraints first
        localStreamRef.current = await navigator.mediaDevices.getUserMedia(getConstraints());
      } catch (e1) {
        try {
          // Fallback to simpler constraints
          const fallback =
            media === "video"
              ? { audio: true, video: true }
              : { audio: true, video: false };
          localStreamRef.current = await navigator.mediaDevices.getUserMedia(fallback);
        } catch (e2) {
          console.warn("getUserMedia error:", e2);
          setMediaError(
            (e2 && (e2.message || e2.name)) ||
              "Microphone/camera permission denied or unavailable. Check site permissions."
          );
          throw e2;
        }
      }
      readyToNegotiateRef.current = true;

      if (localVideoRef.current && media === "video") {
        localVideoRef.current.srcObject = localStreamRef.current;
        try {
          await localVideoRef.current.play();
        } catch {}
      }
    }
  };

  const bumpAutoplay = async () => {
    try {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.muted = false;
        remoteAudioRef.current.volume = 1;
        await remoteAudioRef.current.play();
      }
      setAudioUnlockNeeded(false);
    } catch {
      setAudioUnlockNeeded(true);
    }
    try {
      await remoteVideoRef.current?.play?.();
    } catch {}
  };

  const setVideoCodecPreference = (pc) => {
    try {
      const preferred = preferH264InCapabilities();
      if (!preferred) return;
      const txs = pc.getTransceivers ? pc.getTransceivers() : [];
      for (const t of txs) {
        const kind = t.kind || (t.sender && t.sender.track && t.sender.track.kind);
        if (kind === "video" && t.setCodecPreferences) {
          t.setCodecPreferences(preferred);
        }
      }
    } catch (e) {
      // ignore
    }
  };

  const createPc = () => {
    const existing = pcRef.current;
    if (existing && (existing.connectionState === "closed" || existing.signalingState === "closed")) {
      try {
        existing.close();
      } catch {}
      pcRef.current = null;
    }
    if (pcRef.current) return pcRef.current;

    const pc = new RTCPeerConnection({
      iceServers: getIceServers(),
    });

    pc.onicecandidate = (e) => {
      if (e.candidate && socket && peerId) {
        const json = e.candidate.toJSON ? e.candidate.toJSON() : e.candidate;
        socket.emit("call:signal", {
          toUserId: peerId,
          data: { type: "candidate", candidate: json, conversationId },
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      setIceState(pc.iceConnectionState || "");
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        stopAllRings();
      }
      if (pc.iceConnectionState === "failed") {
        endCall();
        cleanup();
        playEndTone();
      }
    };

    pc.ontrack = async (e) => {
      const stream = (e.streams && e.streams[0]) ? e.streams[0] : (e.track ? new MediaStream([e.track]) : null);
      if (!stream) return;

      if (e.track.kind === "audio") {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = stream;
          remoteAudioRef.current.muted = false;
          remoteAudioRef.current.volume = 1;
          try {
            await remoteAudioRef.current.play();
            setAudioUnlockNeeded(false);
          } catch {
            setAudioUnlockNeeded(true);
          }
        }
        stopAllRings();
      } else if (e.track.kind === "video" && media === "video") {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
          try {
            await remoteVideoRef.current.play();
          } catch {}
        }
      }
    };

    pc.onnegotiationneeded = async () => {
      try {
        if (!isCaller) return;
        const pcNow = pcRef.current;
        if (!pcNow) return;
        if (!readyToNegotiateRef.current) return;
        const haveLocalTracks = pcNow.getSenders().some((s) => s.track);
        if (!haveLocalTracks) return;
        if (hasOfferedRef.current) return;
        if (negotiatingRef.current) return;
        negotiatingRef.current = true;

        setVideoCodecPreference(pcNow);
        const offer = await pcNow.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: media === "video",
          voiceActivityDetection: true,
        });
        const sdp = preferH264InSdp(offer.sdp || "");
        await pcNow.setLocalDescription({ type: "offer", sdp });
        socket?.emit("call:signal", {
          toUserId: peerId,
          data: { type: "offer", sdp, conversationId },
        });
        hasOfferedRef.current = true;
      } catch (e) {
        console.warn("negotiation error:", e);
      } finally {
        negotiatingRef.current = false;
      }
    };

    pcRef.current = pc;
    return pc;
  };

  // Stats monitor (diagnostics)
  useEffect(() => {
    if (!accepted) return;
    let prev = { ts: 0, out: 0, in: 0 };
    const id = setInterval(async () => {
      try {
        const pc = pcRef.current;
        if (!pc) return;
        const stats = await pc.getStats();
        let outBytes = 0;
        let inBytes = 0;
        stats.forEach((r) => {
          if (r.type === "outbound-rtp" && !r.isRemote && r.kind === "audio") outBytes += r.bytesSent || 0;
          if (r.type === "inbound-rtp" && !r.isRemote && r.kind === "audio") inBytes += r.bytesReceived || 0;
          if (r.type === "outbound-rtp" && !r.isRemote && r.kind === "video") outBytes += r.bytesSent || 0;
          if (r.type === "inbound-rtp" && !r.isRemote && r.kind === "video") inBytes += r.bytesReceived || 0;
        });
        const now = Date.now();
        if (prev.ts) {
          const dt = (now - prev.ts) / 1000;
          const outKbps = dt > 0 ? Math.round(((outBytes - prev.out) * 8) / 1000 / dt) : 0;
          const inKbps = dt > 0 ? Math.round(((inBytes - prev.in) * 8) / 1000 / dt) : 0;
          setBitrate({ outKbps, inKbps });
        }
        prev = { ts: now, out: outBytes, in: inBytes };
      } catch {}
    }, 2000);
    return () => clearInterval(id);
  }, [accepted]);

  // When accepted, ensure local stream, tracks, and (caller) send offer AFTER tracks are added
  useEffect(() => {
    const go = async () => {
      if (!socket || !call || !accepted) return;
      await ensureLocal();
      const pc = createPc();

      // Attach local tracks (only once)
      if (localStreamRef.current) {
        const existingTracks = pc.getSenders().map((s) => s.track);
        localStreamRef.current.getTracks().forEach((t) => {
          if (!existingTracks.includes(t)) pc.addTrack(t, localStreamRef.current);
        });
      }

      // Create the very first offer explicitly after tracks are attached
      if (isCaller && !hasOfferedRef.current && !negotiatingRef.current) {
        try {
          negotiatingRef.current = true;
          setVideoCodecPreference(pc);
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: media === "video",
            voiceActivityDetection: true,
          });
          const sdp = preferH264InSdp(offer.sdp || "");
          await pc.setLocalDescription({ type: "offer", sdp });
          socket.emit("call:signal", {
            toUserId: peerId,
            data: { type: "offer", sdp, conversationId },
          });
          hasOfferedRef.current = true;
        } catch (e) {
          console.warn("createOffer failed:", e);
        } finally {
          negotiatingRef.current = false;
        }
      }

      stopAllRings();
      await bumpAutoplay();
    };
    go();
  }, [accepted, isCaller, peerId, socket]); // eslint-disable-line

  // Signal handler (offer/answer/candidate)
  useEffect(() => {
    if (!socket || !call) return;

    const onSignal = async ({ fromUserId, data }) => {
      if (String(fromUserId) !== String(peerId)) return;
      if (data.conversationId && data.conversationId !== conversationId) return;

      if (data.type === "offer") {
        await ensureLocal();
        const pc = createPc();

        if (localStreamRef.current) {
          const existingTracks = pc.getSenders().map((s) => s.track);
          localStreamRef.current.getTracks().forEach((t) => {
            if (!existingTracks.includes(t)) pc.addTrack(t, localStreamRef.current);
          });
        }

        await pc.setRemoteDescription({ type: "offer", sdp: data.sdp });

        setVideoCodecPreference(pc);

        const answer = await pc.createAnswer();
        const sdp = preferH264InSdp(answer.sdp || "");
        await pc.setLocalDescription({ type: "answer", sdp });
        socket.emit("call:signal", {
          toUserId: peerId,
          data: { type: "answer", sdp, conversationId },
        });

        if (call.state !== "accepted") {
          setCall((prev) => (prev ? { ...prev, state: "accepted" } : prev));
        }
        stopAllRings();
        await bumpAutoplay();
      } else if (data.type === "answer") {
        const pc = createPc();
        await pc.setRemoteDescription({ type: "answer", sdp: data.sdp });
        stopAllRings();
        await bumpAutoplay();
      } else if (data.type === "candidate") {
        const pc = createPc();
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.warn("addIceCandidate failed:", e);
        }
      }
    };

    socket.on("call:signal", onSignal);
    return () => socket.off("call:signal", onSignal);
  }, [socket, call, peerId, conversationId, setCall]);

  // Remote ends call -> cleanup media/pc
  useEffect(() => {
    if (!socket) return;
    const onEnd = ({ fromUserId, conversationId: cid }) => {
      if (String(fromUserId) === String(peerId) && cid === conversationId) {
        stopAllRings();
        cleanup();
        playEndTone();
      }
    };
    socket.on("call:end", onEnd);
    return () => socket.off("call:end", onEnd);
  }, [socket, peerId, conversationId]);

  // Actions
  const toggleMute = () => {
    setMuted((m) => {
      const next = !m;
      localStreamRef.current?.getAudioTracks()?.forEach((t) => (t.enabled = !next));
      return next;
    });
  };

  const toggleCamera = () => {
    setCameraOff((off) => {
      const next = !off;
      localStreamRef.current?.getVideoTracks()?.forEach((t) => (t.enabled = !next));
      return next;
    });
  };

  const toggleHold = () => {
    setOnHold((h) => {
      const next = !h;
      const enable = !next;
      localStreamRef.current?.getTracks()?.forEach((t) => (t.enabled = enable));
      return next;
    });
  };

  const formatTime = (s) => {
    const mm = Math.floor(s / 60)
      .toString()
      .padStart(2, "0");
    const ss = Math.floor(s % 60)
      .toString()
      .padStart(2, "0");
    return `${mm}:${ss}`;
  };

  // User-gesture to unlock audio if autoplay blocked
  const unlockAudio = async () => {
    try {
      await ringInRef.current?.play().catch(() => {});
      await ringOutRef.current?.play().catch(() => {});
      if (remoteAudioRef.current) {
        remoteAudioRef.current.muted = false;
        remoteAudioRef.current.volume = 1;
        await remoteAudioRef.current.play();
      }
      setAudioUnlockNeeded(false);
    } catch {
      setAudioUnlockNeeded(true);
    }
  };

  if (!call) return null;

  const showRingInfo = !accepted && (call.state === "calling" || call.state === "ringing");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/70 backdrop-blur-sm">
      <div
        className={`w-full ${media === "video" ? "max-w-2xl" : "max-w-md"} rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden`}
      >
        {/* Accent bar */}
        <div className="h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600" />

        {/* Top bar */}
        <div className="relative px-4 sm:px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-semibold">
            <IoCall />
            {isCaller
              ? `Calling ${call.media === "video" ? "(Video)" : "(Audio)"}`
              : `Incoming ${call.media === "video" ? "Video" : "Audio"} Call`}
          </div>

          {/* Audio unlock (if needed) */}
          {audioUnlockNeeded && (
            <button
              onClick={unlockAudio}
              className="absolute top-2 right-2 sm:right-3 inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm bg-amber-400 text-black hover:bg-amber-500"
              title="Enable sound"
            >
              <IoVolumeHigh /> Enable sound
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-3">
          {/* Diagnostics (optional) */}
          {(mediaError || iceState || accepted) && (
            <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
              {mediaError && (
                <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                  <IoWarningOutline /> {mediaError}
                </div>
              )}
              {iceState && <div>ICE: {iceState}</div>}
              {accepted && (
                <div>
                  kbps (audio+video): out {bitrate.outKbps} • in {bitrate.inKbps}
                </div>
              )}
            </div>
          )}

          {/* Media preview */}
          {media === "video" ? (
            <div className="relative">
              <video
                className="w-full aspect-video bg-black rounded-xl"
                ref={remoteVideoRef}
                autoPlay
                playsInline
                muted
              />
              {/* local PIP */}
              <video
                className="absolute bottom-3 right-3 w-28 h-20 bg-black rounded-lg object-cover ring-2 ring-white/40 dark:ring-slate-800"
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
              />
            </div>
          ) : (
            <div className="w-full h-40 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
              Audio call
            </div>
          )}
          <audio ref={remoteAudioRef} autoPlay />

          {/* State line */}
          {accepted ? (
            <div className="text-sm text-slate-700 dark:text-slate-300">
              Connected • {formatTime(elapsed)}
            </div>
          ) : (
            <div className="text-sm text-slate-700 dark:text-slate-300">
              {call.role === "callee" ? "Ringing…" : "Calling…"}
              {showRingInfo ? ` • Timeout in ${ringLeft}s` : ""}
            </div>
          )}

          {/* Controls */}
          <div className="flex flex-wrap gap-2 justify-between items-center pt-1">
            <div className="flex gap-2">
              <button
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors
                  ${muted
                    ? "bg-slate-800 text-white border-slate-700 hover:bg-slate-700"
                    : "bg-slate-200 text-slate-800 border-slate-300 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600 dark:hover:bg-slate-600"
                  }`}
                onClick={toggleMute}
                title={muted ? "Unmute" : "Mute"}
              >
                {muted ? <IoMicOff /> : <IoMic />} {muted ? "Unmute" : "Mute"}
              </button>

              {call.media === "video" && (
                <button
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors
                    ${cameraOff
                      ? "bg-slate-800 text-white border-slate-700 hover:bg-slate-700"
                      : "bg-slate-200 text-slate-800 border-slate-300 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600 dark:hover:bg-slate-600"
                    }`}
                  onClick={toggleCamera}
                  title={cameraOff ? "Turn camera on" : "Turn camera off"}
                >
                  {cameraOff ? <IoVideocamOff /> : <IoVideocam />} {cameraOff ? "Camera on" : "Camera off"}
                </button>
              )}

              <button
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors
                  ${onHold
                    ? "bg-amber-600 text-white border-amber-700 hover:bg-amber-700"
                    : "bg-slate-200 text-slate-800 border-slate-300 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600 dark:hover:bg-slate-600"
                  }`}
                onClick={toggleHold}
                title={onHold ? "Resume" : "Hold"}
              >
                {onHold ? <IoPlay /> : <IoPause />} {onHold ? "Resume" : "Hold"}
              </button>
            </div>

            <div className="flex gap-2">
              {call.state === "ringing" && call.role === "callee" && (
                <>
                  <button
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700"
                    onClick={async () => {
                      stopAllRings();
                      try {
                        await acceptCall();
                        await unlockAudio();
                        await bumpAutoplay();
                      } catch {}
                    }}
                  >
                    Accept
                  </button>
                  <button
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-slate-300 text-slate-800 hover:bg-slate-400 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
                    onClick={() => {
                      stopAllRings();
                      declineCall();
                      playEndTone();
                    }}
                  >
                    Decline
                  </button>
                </>
              )}

              {(call.state === "accepted" || call.state === "calling") && (
                <button
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-rose-600 text-white hover:bg-rose-700"
                  onClick={() => {
                    endCall();
                    stopAllRings();
                    playEndTone();
                    cleanup();
                  }}
                >
                  End
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}