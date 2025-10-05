import React from "react";

function formatDate(d) {
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "";
    return dt.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

export default function ViewEnhancedProfileModal({ user, onClose }) {
  if (!user) return null;

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isOwner = String(currentUser.id) === String(user._id);

  const groupAllows = (groupVisibility) => {
    if (isOwner) return true;
    if (typeof groupVisibility === "string" && groupVisibility !== "public") return false;
    return true;
  };

  const itemAllows = (itemVisibility, groupVisibility) => {
    if (!groupAllows(groupVisibility)) return false;
    if (isOwner) return true;
    if (typeof itemVisibility === "string") return itemVisibility === "public";
    return true;
  };

  const showField = (vis) => isOwner || vis === "public";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-y-auto max-h-[90vh]">
        {/* Accent bar */}
        <div className="h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600" />

        {/* Header */}
        <div className="px-6 pt-5 pb-3 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              {user.firstName} {user.middleName && `${user.middleName} `}{user.lastName}
            </h2>
            {user.username && (
              <p className="text-sm text-slate-500 dark:text-slate-400">@{user.username}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Close"
            type="button"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-6 space-y-6">
          {/* Personal Info */}
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Personal Info</h3>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-slate-700 dark:text-slate-300">
              {showField(user.visibility?.nickname) && user.nickname && (
                <p><strong className="text-slate-900 dark:text-slate-100">Nickname:</strong> {user.nickname}</p>
              )}
              {user.surname && (
                <p><strong className="text-slate-900 dark:text-slate-100">Surname:</strong> {user.surname}</p>
              )}
              {showField(user.visibility?.pronouns) && user.pronouns && (
                <p><strong className="text-slate-900 dark:text-slate-100">Pronouns:</strong> {user.pronouns}</p>
              )}
              {showField(user.visibility?.place) && user.place && (
                <p><strong className="text-slate-900 dark:text-slate-100">Place:</strong> {user.place}</p>
              )}
              {showField(user.visibility?.dob) && user.dob && (
                <p><strong className="text-slate-900 dark:text-slate-100">DOB:</strong> {formatDate(user.dob)}</p>
              )}
              {showField(user.visibility?.email) && user.email && (
                <p className="sm:col-span-2"><strong className="text-slate-900 dark:text-slate-100">Email:</strong> {user.email}</p>
              )}
              {showField(user.visibility?.bio) && user.bio && (
                <p className="sm:col-span-2"><strong className="text-slate-900 dark:text-slate-100">Bio:</strong> {user.bio}</p>
              )}
              {showField(user.visibility?.about) && user.about && (
                <p className="sm:col-span-2"><strong className="text-slate-900 dark:text-slate-100">About:</strong> {user.about}</p>
              )}
            </div>
          </section>

          {/* Contact Info */}
          {groupAllows(user.visibility?.contactInfo) &&
            Array.isArray(user.contactInfo) &&
            (() => {
              const visible = user.contactInfo.filter(
                (c) => c?.value && itemAllows(c.visibility, user.visibility?.contactInfo)
              );
              return visible.length ? (
                <section className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Contact Info</h3>
                  <ul className="space-y-1 text-slate-700 dark:text-slate-300">
                    {visible.map((c, idx) => (
                      <li key={c._id || idx}>
                        <strong className="text-slate-900 dark:text-slate-100 capitalize">{c.type}:</strong> {c.value}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null;
            })()}

          {/* Skills */}
          {Array.isArray(user.skills) && user.skills.length > 0 && (
            <section className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Skills</h3>
              <ul className="flex flex-wrap gap-2">
                {user.skills.map((skill, i) => (
                  <li
                    key={i}
                    className="px-3 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-300 text-sm"
                  >
                    {skill}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Education */}
          {Array.isArray(user.education) && user.education.length > 0 && (
            <section className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Education</h3>
              <ul className="space-y-3">
                {user.education.map((edu) => (
                  <li key={edu._id || `${edu.school}-${edu.startYear}`} className="pl-3 border-l-2 border-slate-300 dark:border-slate-700">
                    <p className="text-slate-900 dark:text-slate-100">
                      <strong>{edu.degree}</strong> {edu.field ? `in ${edu.field}` : ""}
                    </p>
                    <p className="text-slate-700 dark:text-slate-300">
                      {edu.school} ({edu.startYear} - {edu.endYear || "Present"})
                    </p>
                    <div className="text-sm text-slate-600 dark:text-slate-400 space-x-3">
                      {edu.cgpa ? <span>CGPA: {edu.cgpa}</span> : null}
                      {edu.marks ? <span>Marks: {edu.marks}%</span> : null}
                      {edu.place ? <span>Place: {edu.place}</span> : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Experience */}
          {Array.isArray(user.experience) && user.experience.length > 0 && (
            <section className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Experience</h3>
              <ul className="space-y-3">
                {user.experience.map((exp) => (
                  <li key={exp._id || `${exp.company}-${exp.role}`} className="pl-3 border-l-2 border-slate-300 dark:border-slate-700">
                    <p className="text-slate-900 dark:text-slate-100">
                      <strong>{exp.role}</strong> at {exp.company}
                    </p>
                    <p className="text-slate-700 dark:text-slate-300">
                      {exp.startDate?.slice(0, 10)} - {exp.endDate?.slice(0, 10) || "Present"}
                    </p>
                    {exp.description && <p className="text-sm text-slate-600 dark:text-slate-400">{exp.description}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Websites */}
          {Array.isArray(user.websites) &&
            (() => {
              const visible = user.websites.filter((link) => link?.url && itemAllows(link.visibility));
              return visible.length ? (
                <section className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Websites & Links</h3>
                  <ul className="space-y-1">
                    {visible.map((link) => (
                      <li key={link._id || link.url}>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline dark:text-blue-400"
                          title={link.url}
                        >
                          {link.label || link.url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null;
            })()}

          {/* Tags */}
          {Array.isArray(user.tags) && user.tags.length > 0 && (
            <section className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Tags</h3>
              <ul className="flex flex-wrap gap-2">
                {user.tags.map((tag, i) => (
                  <li
                    key={i}
                    className="px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 text-sm"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Linked Accounts */}
          {Array.isArray(user.linkedAccounts) &&
            (() => {
              const visible = user.linkedAccounts.filter((acc) => acc?.url && itemAllows(acc.visibility));
              return visible.length ? (
                <section className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Linked Accounts</h3>
                  <ul className="space-y-1">
                    {visible.map((acc) => (
                      <li key={acc._id || acc.url}>
                        <a
                          href={acc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline dark:text-blue-400"
                          title={acc.url}
                        >
                          {acc.platform || acc.url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null;
            })()}

          {/* Achievements */}
          {Array.isArray(user.achievements) &&
            (() => {
              const visible = user.achievements.filter((a) => a?.title && itemAllows(a.visibility));
              return visible.length ? (
                <section className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Achievements</h3>
                  <ul className="space-y-3">
                    {visible.map((ach) => (
                      <li key={ach._id || ach.title} className="pl-3 border-l-2 border-slate-300 dark:border-slate-700">
                        <p className="text-slate-900 dark:text-slate-100">
                          <strong>{ach.title}</strong> {ach.year ? `(${ach.year})` : ""}
                        </p>
                        {ach.description && (
                          <p className="text-slate-700 dark:text-slate-300 text-sm">{ach.description}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null;
            })()}
        </div>
      </div>
    </div>
  );
}