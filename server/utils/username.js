const SAFE_CHARS = /[^a-z0-9._]/g;
const USERNAME_REGEX = /^[a-zA-Z0-9._]{3,30}$/;

const RESERVED_USERNAMES = [
  "admin", "administrator", "root", "system", "support",
  "help", "about", "blog", "api", "www", "you", "me",
  "terms", "privacy", "contact"
];
const reservedSet = new Set(RESERVED_USERNAMES.map((s) => s.toLowerCase()));

function slugifyUsername(str = "") {
  return String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, ".")
    .replace(SAFE_CHARS, "")
    .replace(/\.+/g, ".")
    .replace(/^\.|\.$/g, "")
    .slice(0, 30) || "user";
}

async function generateUniqueUsername(UserModel, { firstName, lastName, email, fallback }) {
  const base =
    slugifyUsername([firstName, lastName].filter(Boolean).join(".")) ||
    slugifyUsername(email?.split("@")[0]) ||
    slugifyUsername(fallback || "user");

  const MAX_TRIES = 200;
  for (let i = 0; i < MAX_TRIES; i++) {
    const candidate = i === 0 ? base : `${base}${i}`;
    const exists = await UserModel.findOne({ username: candidate })
      .collation({ locale: "en", strength: 2 })
      .select("_id")
      .lean();
    if (!exists && !reservedSet.has(candidate.toLowerCase())) return candidate;
  }
  const rand = Math.random().toString(36).slice(2, 8);
  return `${base}${rand}`.slice(0, 30);
}

function validateUsername(username = "") {
  const u = String(username).trim();
  if (!u) return { ok: false, msg: "Username is required" };
  if (!USERNAME_REGEX.test(u)) {
    return { ok: false, msg: "Use 3–30 chars (letters, numbers, . or _)." };
  }
  if (reservedSet.has(u.toLowerCase())) {
    return { ok: false, msg: "This username is reserved." };
  }
  return { ok: true };
}

function isReservedUsername(username = "") {
  return reservedSet.has(String(username).toLowerCase());
}

module.exports = {
  USERNAME_REGEX,
  slugifyUsername,
  generateUniqueUsername,
  validateUsername,
  isReservedUsername,
};