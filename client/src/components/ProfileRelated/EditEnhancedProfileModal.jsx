import { useState, useContext } from "react";
import { v4 as uuidv4 } from "uuid";
import API from "../../api/axios";
import ArrayInputList from "./ArrayInputList";
import { AppContext } from "../../context/AppContext";
import VisibilityToggle from "./VisibilityToggle";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const phoneRegex = /^\+?[0-9\s\-()]{7,20}$/i;

function isValidUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export default function EditEnhancedProfileModal({ user, onClose, onUpdate }) {
  const { socket, setUsers, setPosts } = useContext(AppContext);

  // Personal Info
  const [nickname, setNickname] = useState(user.nickname || "");
  const [surname, setSurname] = useState(user.surname || "");
  const [pronouns, setPronouns] = useState(user.pronouns || "");
  const [about, setAbout] = useState(user.about || "");
  const [aboutPublic, setAboutPublic] = useState(user.visibility?.about === "public");
  const [nicknamePublic, setNicknamePublic] = useState(user.visibility?.nickname === "public");
  const [pronounsPublic, setPronounsPublic] = useState(user.visibility?.pronouns === "public");

  // Top-level visibility for Contact Info
  const [contactInfoPublic, setContactInfoPublic] = useState(
    user.visibility?.contactInfo === "public"
  );

  // Enhanced fields
  const [skills, setSkills] = useState((user.skills || []).map((s) => ({ id: uuidv4(), value: s })));
  const [education, setEducation] = useState((user.education || []).map((e) => ({ ...e, id: uuidv4() })));
  const [experience, setExperience] = useState((user.experience || []).map((e) => ({ ...e, id: uuidv4() })));

  // Per-item visibility
  const [contactInfo, setContactInfo] = useState(
    (user.contactInfo || []).map((c) => ({
      ...c,
      id: uuidv4(),
      visibilityPublic: (c.visibility || "private") === "public",
    }))
  );
  const [websites, setWebsites] = useState(
    (user.websites || []).map((w) => ({
      ...w,
      id: uuidv4(),
      visibilityPublic: (w.visibility || "public") === "public",
    }))
  );
  const [linkedAccounts, setLinkedAccounts] = useState(
    (user.linkedAccounts || []).map((l) => ({
      ...l,
      id: uuidv4(),
      visibilityPublic: (l.visibility || "public") === "public",
    }))
  );
  const [achievements, setAchievements] = useState(
    (user.achievements || []).map((a) => ({
      ...a,
      id: uuidv4(),
      visibilityPublic: (a.visibility || "public") === "public",
    }))
  );

  // Contact handlers
  const handleContactChange = (id, field, value) => {
    setContactInfo((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };
  const handleContactAdd = () => {
    setContactInfo((prev) => [...prev, { id: uuidv4(), type: "phone", value: "", visibilityPublic: false }]);
  };
  const handleContactRemove = (id) => setContactInfo((prev) => prev.filter((c) => c.id !== id));

  // Websites handlers
  const handleWebsiteChange = (id, field, value) => {
    setWebsites((prev) => prev.map((w) => (w.id === id ? { ...w, [field]: value } : w)));
  };
  const handleWebsiteAdd = () =>
    setWebsites((prev) => [...prev, { id: uuidv4(), label: "", url: "", visibilityPublic: true }]);
  const handleWebsiteRemove = (id) => setWebsites((prev) => prev.filter((w) => w.id !== id));

  // Linked accounts handlers
  const handleLinkedChange = (id, field, value) => {
    setLinkedAccounts((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  };
  const handleLinkedAdd = () =>
    setLinkedAccounts((prev) => [...prev, { id: uuidv4(), platform: "", url: "", visibilityPublic: true }]);
  const handleLinkedRemove = (id) => setLinkedAccounts((prev) => prev.filter((l) => l.id !== id));

  // Achievements handlers
  const handleAchievementChange = (id, field, value) => {
    setAchievements((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)));
  };
  const handleAchievementAdd = () =>
    setAchievements((prev) => [
      ...prev,
      { id: uuidv4(), title: "", description: "", year: "", visibilityPublic: true },
    ]);
  const handleAchievementRemove = (id) => setAchievements((prev) => prev.filter((a) => a.id !== id));

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Optional validation: contact and URLs
    for (const c of contactInfo) {
      const val = (c.value || "").trim();
      if (!val) continue;
      if (c.type === "email" && !emailRegex.test(val)) {
        alert("Please enter a valid contact email.");
        return;
      }
      if (c.type === "phone" && !phoneRegex.test(val)) {
        alert("Please enter a valid phone number.");
        return;
      }
    }
    for (const w of websites) {
      const url = (w.url || "").trim();
      if (url && !isValidUrl(url)) {
        alert("Please enter a valid website URL (http/https).");
        return;
      }
    }
    for (const l of linkedAccounts) {
      const url = (l.url || "").trim();
      if (url && !isValidUrl(url)) {
        alert("Please enter a valid linked account URL (http/https).");
        return;
      }
    }

    try {
      const contactPayload = contactInfo
        .map((c) => ({
          type: c.type,
          value: (c.value || "").trim(),
          visibility: c.visibilityPublic ? "public" : "private",
        }))
        .filter((c) => c.value);

      const websitesPayload = websites
        .map(({ id, visibilityPublic, label, url }) => ({
          label: (label || "").trim(),
          url: (url || "").trim(),
          visibility: visibilityPublic ? "public" : "private",
        }))
        .filter((w) => w.url);

      const linkedPayload = linkedAccounts
        .map(({ id, visibilityPublic, platform, url }) => ({
          platform: (platform || "").trim(),
          url: (url || "").trim(),
          visibility: visibilityPublic ? "public" : "private",
        }))
        .filter((l) => l.url);

      const achievementsPayload = achievements
        .map(({ id, visibilityPublic, title, description, year }) => ({
          title: (title || "").trim(),
          description: (description || "").trim(),
          year: Number(year) || 0,
          visibility: visibilityPublic ? "public" : "private",
        }))
        .filter((a) => a.title);

      const payload = {
        nickname,
        surname,
        pronouns,
        about,
        skills: skills.map((s) => (s.value || "").trim()).filter(Boolean),
        education: education.map(({ id, ...rest }) => ({
          ...rest,
          startYear: Number(rest.startYear) || 0,
          endYear: Number(rest.endYear) || 0,
          cgpa: Number(rest.cgpa) || 0,
          marks: Number(rest.marks) || 0,
        })),
        experience: experience.map(({ id, ...rest }) => rest),
        websites: websitesPayload,
        contactInfo: contactPayload,
        linkedAccounts: linkedPayload,
        achievements: achievementsPayload,
        visibility: {
          about: aboutPublic ? "public" : "private",
          contactInfo: contactInfoPublic ? "public" : "private",
          nickname: nicknamePublic ? "public" : "private",
          pronouns: pronounsPublic ? "public" : "private",
        },
      };

      const { data } = await API.put("/users/enhanced/update", payload);
      const updatedUser = data.user;

      setUsers((prev) => ({ ...prev, [updatedUser._id]: updatedUser }));
      setPosts((prev) => prev.map((p) => (p.user?._id === updatedUser._id ? { ...p, user: updatedUser } : p)));

      onUpdate?.(updatedUser);
      onClose?.();
    } catch (err) {
      console.error("Enhanced profile update failed:", err.response?.data || err.message);
      alert("Failed to update profile. Please check the console for details.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-y-auto max-h-[90vh]">
        {/* Accent bar */}
        <div className="h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600" />

        {/* Header */}
        <div className="px-6 pt-5 pb-3 flex items-start justify-between">
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Edit Enhanced Profile
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Add more details about yourself. Choose what’s visible publicly.
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
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-6">
          {/* Personal Info */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Personal Info</h3>

            <div className="flex gap-2 flex-wrap items-center">
              <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Nickname
                  </label>
                  <input
                    type="text"
                    placeholder="Nickname"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2"
                  />
                </div>
                <VisibilityToggle field="nickname" visible={nicknamePublic} onToggle={() => setNicknamePublic((v) => !v)} />
              </div>

              <div className="flex-1 min-w-[220px]">
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Surname
                </label>
                <input
                  type="text"
                  placeholder="Surname"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2"
                />
              </div>

              <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Pronouns
                  </label>
                  <input
                    type="text"
                    placeholder="Pronouns"
                    value={pronouns}
                    onChange={(e) => setPronouns(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2"
                  />
                </div>
                <VisibilityToggle field="pronouns" visible={pronounsPublic} onToggle={() => setPronounsPublic((v) => !v)} />
              </div>
            </div>

            <div className="flex items-start gap-2 mt-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  About
                </label>
                <textarea
                  placeholder="Write a short bio..."
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 resize-y"
                  rows={3}
                />
              </div>
              <div className="pt-6">
                <VisibilityToggle field="about" visible={aboutPublic} onToggle={() => setAboutPublic((v) => !v)} />
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Contact Info</h3>
              <VisibilityToggle
                field="contactInfo"
                visible={contactInfoPublic}
                onToggle={() => setContactInfoPublic((v) => !v)}
              />
            </div>

            {contactInfo.map((c) => (
              <div key={c.id} className="flex items-center gap-2 mb-2">
                <select
                  value={c.type}
                  onChange={(e) => handleContactChange(c.id, "type", e.target.value)}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2"
                >
                  <option value="phone">Phone</option>
                  <option value="email">Email</option>
                  <option value="other">Other</option>
                </select>
                <input
                  type="text"
                  placeholder={
                    c.type === "email" ? "email@example.com" : c.type === "phone" ? "+1 555 555 5555" : "Value"
                  }
                  value={c.value}
                  onChange={(e) => handleContactChange(c.id, "value", e.target.value)}
                  className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2"
                />
                <VisibilityToggle
                  field={`contact-${c.id}`}
                  visible={c.visibilityPublic}
                  onToggle={() => handleContactChange(c.id, "visibilityPublic", !c.visibilityPublic)}
                />
                <button
                  type="button"
                  onClick={() => handleContactRemove(c.id)}
                  className="px-2 py-2 rounded-md bg-rose-500 text-white hover:bg-rose-600"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={handleContactAdd}
              className="mt-2 inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Add Contact
            </button>
          </div>

          {/* Skills */}
          <ArrayInputList
            label="Skills"
            data={skills}
            fields={[{ name: "value", placeholder: "Skill" }]}
            onChange={(i, f, v) => setSkills((prev) => prev.map((s, j) => (i === j ? { ...s, [f]: v } : s)))}
            onAdd={() => setSkills((prev) => [...prev, { id: uuidv4(), value: "" }])}
            onRemove={(i) => setSkills((prev) => prev.filter((_, j) => j !== i))}
          />

          {/* Education */}
          <ArrayInputList
            label="Education"
            data={education}
            fields={[
              { name: "school" },
              { name: "degree" },
              { name: "field" },
              { name: "startYear", type: "number" },
              { name: "endYear", type: "number" },
              { name: "cgpa", type: "number" },
              { name: "marks", type: "number" },
              { name: "place" },
            ]}
            onChange={(i, f, v) => setEducation((prev) => prev.map((e, j) => (i === j ? { ...e, [f]: v } : e)))}
            onAdd={() =>
              setEducation((prev) => [
                ...prev,
                { id: uuidv4(), school: "", degree: "", field: "", startYear: 0, endYear: 0, cgpa: 0, marks: 0, place: "" },
              ])
            }
            onRemove={(i) => setEducation((prev) => prev.filter((_, j) => j !== i))}
          />

          {/* Experience */}
          <ArrayInputList
            label="Experience"
            data={experience}
            fields={[
              { name: "company" },
              { name: "role" },
              { name: "description" },
              { name: "startDate", type: "date" },
              { name: "endDate", type: "date" },
            ]}
            onChange={(i, f, v) => setExperience((prev) => prev.map((e, j) => (i === j ? { ...e, [f]: v } : e)))}
            onAdd={() =>
              setExperience((prev) => [
                ...prev,
                { id: uuidv4(), company: "", role: "", description: "", startDate: "", endDate: "" },
              ])
            }
            onRemove={(i) => setExperience((prev) => prev.filter((_, j) => j !== i))}
          />

          {/* Websites */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Websites / Links</h3>
            {websites.map((w) => (
              <div key={w.id} className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Label"
                  value={w.label || ""}
                  onChange={(e) => handleWebsiteChange(w.id, "label", e.target.value)}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2"
                />
                <input
                  type="url"
                  placeholder="https://example.com"
                  value={w.url || ""}
                  onChange={(e) => handleWebsiteChange(w.id, "url", e.target.value)}
                  className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2"
                />
                <VisibilityToggle
                  field={`website-${w.id}`}
                  visible={w.visibilityPublic}
                  onToggle={() => handleWebsiteChange(w.id, "visibilityPublic", !w.visibilityPublic)}
                />
                <button
                  type="button"
                  onClick={() => handleWebsiteRemove(w.id)}
                  className="px-2 py-2 rounded-md bg-rose-500 text-white hover:bg-rose-600"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={handleWebsiteAdd}
              className="mt-2 inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Add Link
            </button>
          </div>

          {/* Linked Accounts */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Linked Accounts</h3>
            {linkedAccounts.map((l) => (
              <div key={l.id} className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Platform"
                  value={l.platform || ""}
                  onChange={(e) => handleLinkedChange(l.id, "platform", e.target.value)}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2"
                />
                <input
                  type="url"
                  placeholder="https://profile.example"
                  value={l.url || ""}
                  onChange={(e) => handleLinkedChange(l.id, "url", e.target.value)}
                  className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2"
                />
                <VisibilityToggle
                  field={`linked-${l.id}`}
                  visible={l.visibilityPublic}
                  onToggle={() => handleLinkedChange(l.id, "visibilityPublic", !l.visibilityPublic)}
                />
                <button
                  type="button"
                  onClick={() => handleLinkedRemove(l.id)}
                  className="px-2 py-2 rounded-md bg-rose-500 text-white hover:bg-rose-600"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={handleLinkedAdd}
              className="mt-2 inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Add Account
            </button>
          </div>

          {/* Achievements */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Achievements</h3>
            {achievements.map((a) => (
              <div key={a.id} className="grid md:grid-cols-4 gap-2 mb-2 items-center">
                <input
                  type="text"
                  placeholder="Title"
                  value={a.title || ""}
                  onChange={(e) => handleAchievementChange(a.id, "title", e.target.value)}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2"
                />
                <input
                  type="number"
                  placeholder="Year"
                  value={a.year || ""}
                  onChange={(e) => handleAchievementChange(a.id, "year", e.target.value)}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={a.description || ""}
                  onChange={(e) => handleAchievementChange(a.id, "description", e.target.value)}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 col-span-1 md:col-span-1"
                />
                <div className="flex items-center gap-2">
                  <VisibilityToggle
                    field={`achievement-${a.id}`}
                    visible={a.visibilityPublic}
                    onToggle={() => handleAchievementChange(a.id, "visibilityPublic", !a.visibilityPublic)}
                  />
                  <button
                    type="button"
                    onClick={() => handleAchievementRemove(a.id)}
                    className="px-2 py-2 rounded-md bg-rose-500 text-white hover:bg-rose-600"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={handleAchievementAdd}
              className="mt-2 inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Add Achievement
            </button>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}