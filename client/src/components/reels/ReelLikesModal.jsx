import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getReelLikes } from "../../api/reels";
import { buildFileUrl } from "../../utils/url";

export default function ReelLikesModal({ open, onClose, reelId }) {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!open || !reelId) return;
    let mounted = true;
    (async () => {
      try {
        setErr("");
        setLoading(true);
        const res = await getReelLikes(reelId);
        if (!mounted) return;
        setUsers(Array.isArray(res.data?.users) ? res.data.users : []);
      } catch (e) {
        setErr(e?.response?.data?.msg || "Failed to load likes");
        setUsers([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [open, reelId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-md w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="font-semibold">Likes</div>
          <button className="px-2 py-1 rounded hover:bg-gray-100" onClick={onClose}>✕</button>
        </div>

        <div className="p-3">
          {loading ? (
            <div className="text-sm text-gray-600">Loading…</div>
          ) : err ? (
            <div className="text-sm text-red-600">{err}</div>
          ) : users.length === 0 ? (
            <div className="text-sm text-gray-600">No likes yet</div>
          ) : (
            <ul className="space-y-2">
              {users.map((u) => {
                const avatar = u?.profileImage ? buildFileUrl(u.profileImage) : "/default-avatar.png";
                const fullName = `${u?.firstName || ""} ${u?.lastName || ""}`.trim();
                return (
                  <li key={u._id} className="flex items-center gap-3">
                    <button
                      onClick={() => { onClose?.(); navigate(`/profile/${u._id}`); }}
                      className="flex items-center gap-3"
                      title={`@${u?.username}`}
                    >
                      <img src={avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                      <div className="text-left">
                        {fullName && <div className="font-medium leading-4">{fullName}</div>}
                        <div className="text-sm text-gray-600">@{u?.username}</div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}