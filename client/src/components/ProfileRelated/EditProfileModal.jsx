import { useState, useContext, useEffect, useRef } from "react";
import API from "../../api/axios";
import { AppContext } from "../../context/AppContext";
import VisibilityToggle from "./VisibilityToggle";
import { API_BASE, buildFileUrl } from "../../utils/url";
import { updateCurrentAccountUser } from "../../utils/accounts";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const placeRegex = /^[A-Za-z\s,.'-]{2,}$/;
const USERNAME_REGEX = /^[a-zA-Z0-9._]{3,30}$/;

function getAge(date) {
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const m = today.getMonth() - date.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < date.getDate())) age--;
  return age;
}

function normalizePlace(str = "") {
  return str.trim().replace(/\s+/g, " ");
}

export default function EditProfileModal({ user, onClose, onUpdate }) {
  const { socket, setUsers, setPosts } = useContext(AppContext);

  const [username, setUsername] = useState(user.username);
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [gender, setGender] = useState(user.gender);
  const [place, setPlace] = useState(user.place || "");
  const [dob, setDob] = useState(user.dob ? user.dob.slice(0, 10) : "");
  const [email, setEmail] = useState(user.email || "");
  const [bio, setBio] = useState(user.bio || "");

  const [profileImage, setProfileImage] = useState(null);
  const [preview, setPreview] = useState(
    user.profileImage ? buildFileUrl(user.profileImage) : "/default-avatar.png"
  );
  const [loading, setLoading] = useState(false);

  const [visibleFields, setVisibleFields] = useState({
    email: user.visibility?.email === "public",
    dob: user.visibility?.dob === "public",
    place: user.visibility?.place === "public",
    bio: user.visibility?.bio === "public",
  });

  // Validation states
  const [emailValid, setEmailValid] = useState(true);
  const [dobChecks, setDobChecks] = useState({ valid: true, notFuture: true, age13: true });
  const [placeChecks, setPlaceChecks] = useState({ min2: true, allowed: true, max100: true });

  // Username availability state (debounced)
  const [usernameStatus, setUsernameStatus] = useState("idle"); // idle | same | invalid | checking | available | taken | error
  const [usernameMsg, setUsernameMsg] = useState("");
  const reqId = useRef(0);

  useEffect(() => {
    setEmailValid(!email || emailRegex.test(email));
    if (place) updatePlaceChecks(place);
    if (dob) updateDobChecks(dob);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced username availability check
  useEffect(() => {
    const candidate = (username || "").trim();
    setUsernameMsg("");

    if (candidate === (user.username || "").trim()) {
      setUsernameStatus("same");
      return;
    }
    if (!USERNAME_REGEX.test(candidate)) {
      setUsernameStatus("invalid");
      if (candidate) setUsernameMsg("Use 3–30 chars (letters, numbers, . or _).");
      else setUsernameMsg("Username is required");
      return;
    }

    setUsernameStatus("checking");
    const my = ++reqId.current;

    const t = setTimeout(async () => {
      try {
        const res = await API.get("/users/username-available", {
          params: { username: candidate },
        });
        if (my !== reqId.current) return;
        if (res.data?.success) {
          if (res.data.available) {
            setUsernameStatus("available");
            setUsernameMsg("Username is available ✅");
          } else {
            setUsernameStatus("taken");
            setUsernameMsg(res.data?.msg || "Username is already taken.");
          }
        } else {
          setUsernameStatus("error");
          setUsernameMsg("Could not check availability.");
        }
      } catch (err) {
        if (my !== reqId.current) return;
        setUsernameStatus("error");
        setUsernameMsg(err.response?.data?.msg || "Could not check availability.");
      }
    }, 350);

    return () => clearTimeout(t);
  }, [username, user.username]);

  const toggleVisibility = (field) => {
    setVisibleFields((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const updateDobChecks = (val) => {
    if (!val) {
      setDobChecks({ valid: true, notFuture: true, age13: true });
      return;
    }
    const d = new Date(val);
    const valid = !isNaN(d.getTime());
    const notFuture = valid ? d <= new Date() : false;
    const age13 = valid ? getAge(d) >= 13 : false;
    setDobChecks({ valid, notFuture, age13 });
  };

  const updatePlaceChecks = (val) => {
    const s = normalizePlace(val || "");
    const min2 = s.length >= 2;
    const max100 = s.length <= 100;
    const allowed = s.length ? placeRegex.test(s) : true;
    setPlaceChecks({ min2, allowed, max100 });
  };

  const allDobOk = !dob || (dobChecks.valid && dobChecks.notFuture && dobChecks.age13);
  const allPlaceOk = !!place && placeChecks.min2 && placeChecks.allowed && placeChecks.max100;

  const usernameOk =
    username.trim() === (user.username || "").trim() ||
    usernameStatus === "available";

  const canSave =
    usernameOk &&
    firstName &&
    lastName &&
    gender &&
    place &&
    emailValid &&
    allDobOk &&
    allPlaceOk &&
    !loading &&
    usernameStatus !== "checking";

  const checkItem = (ok, label) => (
    <li className="flex items-center gap-2">
      <span className={ok ? "text-emerald-500" : "text-slate-400"}>{ok ? "✓" : "•"}</span>
      <span className="text-slate-700 dark:text-slate-300">{label}</span>
    </li>
  );

  const showDobRules = dob && !allDobOk;
  const showPlaceRules = place && !allPlaceOk;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!emailValid) return alert("Please enter a valid email address.");
    if (!allPlaceOk) return alert("Please enter a valid place (2–100 chars, letters/spaces only).");
    if (!allDobOk) return alert("Please provide a valid DOB (not in future, 13+).");
    if (!usernameOk) return alert(usernameMsg || "Please choose a valid username.");

    setLoading(true);
    try {
      const visibilityPayload = {
        email: visibleFields.email ? "public" : "private",
        dob: visibleFields.dob ? "public" : "private",
        place: visibleFields.place ? "public" : "private",
        bio: visibleFields.bio ? "public" : "private",
        contactInfo: user.visibility?.contactInfo || "private",
      };

      // Normalize place before sending
      const cleanPlace = normalizePlace(place);

      // Update basic profile
      let updatedUser = user;
      const res = await API.put("/users/update", {
        username: username.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        gender,
        place: cleanPlace,
        dob,
        email: email.trim(),
        bio,
        visibility: visibilityPayload,
      });
      updatedUser = res.data.user;

      // Update image if selected
      if (profileImage) {
        const formData = new FormData();
        formData.append("profileImage", profileImage);
        const res2 = await API.put(`/users/${user._id}/profile-image`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        updatedUser = res2.data.user;
        setPreview(buildFileUrl(updatedUser.profileImage, Date.now()));
        setProfileImage(null);
      }

      // Update caches
      setUsers((prev) => ({ ...prev, [updatedUser._id]: updatedUser }));
      setPosts((prev) =>
        prev.map((p) => (p.user?._id === updatedUser._id ? { ...p, user: updatedUser } : p))
      );

      // Keep localStorage username in sync
      try {
        const me = JSON.parse(localStorage.getItem("user") || "null");
        if (me && String(me.id) === String(updatedUser._id) && me.username !== updatedUser.username) {
          me.username = updatedUser.username;
          localStorage.setItem("user", JSON.stringify(me));
        }
      } catch {}

      // Keep active account snapshot in sync
      updateCurrentAccountUser({
        id: String(updatedUser._id),
        username: updatedUser.username,
        role: updatedUser.role,
        passwordSet: updatedUser.passwordSet,
        ...updatedUser,
      });

      onUpdate(updatedUser);
      onClose();
    } catch (err) {
      alert(err.response?.data?.msg || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  // Shared input class for consistent contrast
  const inputCls =
    "w-full rounded-lg border px-3 py-2 text-sm placeholder-slate-400 dark:placeholder-slate-500 " +
    "border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 " +
    "dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/70 backdrop-blur-sm overscroll-contain"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-xl sm:max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl max-h-[85vh] overflow-y-auto">
        {/* Accent bar */}
        <div className="h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600" />

        {/* Header */}
        <div className="px-6 pt-5 pb-3 flex items-start justify-between">
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Edit Profile
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Update your basic details and choose what’s visible on your profile.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Avatar */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <img
                src={preview}
                alt="Preview"
                className="w-24 h-24 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-800"
              />
              <label className="w-full sm:w-auto">
                <span className="sr-only">Choose profile image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="block w-full text-sm file:mr-3 file:px-4 file:py-2 file:rounded-md file:border-0 file:bg-slate-200 file:text-slate-800 hover:file:bg-slate-300 dark:file:bg-slate-700 dark:file:text-slate-100 dark:hover:file:bg-slate-600"
                />
              </label>
            </div>

            {/* Username + availability */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Username
              </label>
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={inputCls}
                required
              />
              {usernameStatus !== "idle" && (
                <p
                  className={`text-xs mt-1 ${
                    usernameStatus === "available"
                      ? "text-emerald-600"
                      : usernameStatus === "checking"
                      ? "text-slate-500"
                      : "text-rose-500"
                  }`}
                >
                  {usernameStatus === "checking" ? "Checking availability..." : usernameMsg}
                </p>
              )}
            </div>

            {/* Name grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={inputCls}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  placeholder="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={inputCls}
                  required
                />
              </div>
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className={inputCls}
                required
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Place + rules */}
            <div>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Place
                  </label>
                  <input
                    type="text"
                    placeholder="City, Country"
                    value={place}
                    onChange={(e) => {
                      setPlace(e.target.value);
                      updatePlaceChecks(e.target.value);
                    }}
                    className={`${inputCls} ${showPlaceRules ? "border-amber-500" : ""}`}
                    required
                    maxLength={100}
                  />
                </div>
                <VisibilityToggle field="place" visible={visibleFields.place} onToggle={toggleVisibility} />
              </div>
              {showPlaceRules && (
                <div className="text-xs rounded-lg p-3 mt-2 bg-amber-50 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <p className="font-medium mb-1">Place must be:</p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                    {checkItem(placeChecks.min2, "At least 2 characters")}
                    {checkItem(placeChecks.allowed, "Only letters, spaces, , . ' -")}
                    {checkItem(placeChecks.max100, "Max 100 characters")}
                  </ul>
                </div>
              )}
            </div>

            {/* DOB + rules */}
            <div>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    placeholder="DOB"
                    value={dob}
                    onChange={(e) => {
                      setDob(e.target.value);
                      updateDobChecks(e.target.value);
                    }}
                    className={`${inputCls} ${showDobRules ? "border-amber-500" : ""}`}
                  />
                </div>
                <VisibilityToggle field="dob" visible={visibleFields.dob} onToggle={toggleVisibility} />
              </div>
              {showDobRules && (
                <div className="text-xs rounded-lg p-3 mt-2 bg-amber-50 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <p className="font-medium mb-1">DOB must be:</p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                    {checkItem(dobChecks.valid, "A valid date")}
                    {checkItem(dobChecks.notFuture, "Not in the future")}
                    {checkItem(dobChecks.age13, "Age 13+")}
                  </ul>
                </div>
              )}
            </div>

            {/* Email */}
            <div>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailValid(!e.target.value || emailRegex.test(e.target.value));
                    }}
                    className={`${inputCls} ${emailValid ? "" : "border-rose-500"}`}
                  />
                  {!emailValid && (
                    <p className="text-xs text-rose-500 mt-1">Please enter a valid email address.</p>
                  )}
                </div>
                <VisibilityToggle field="email" visible={visibleFields.email} onToggle={toggleVisibility} />
              </div>
            </div>

            {/* Bio */}
            <div>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Bio
                  </label>
                  <textarea
                    placeholder="Tell people a little about yourself..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className={`${inputCls} resize-y`}
                    rows={3}
                  />
                </div>
                <div className="pt-6">
                  <VisibilityToggle field="bio" visible={visibleFields.bio} onToggle={toggleVisibility} />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSave}
                className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
                  canSave ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-400 cursor-not-allowed"
                }`}
              >
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}