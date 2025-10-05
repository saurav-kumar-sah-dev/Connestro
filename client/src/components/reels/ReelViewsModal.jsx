import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getReelViews } from "../../api/reels";
import { buildFileUrl } from "../../utils/url";

export default function ReelViewsModal({ open, onClose, reelId }) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!open || !reelId) return;
    let mounted = true;
    (async () => {
      try {
        setErr("");
        setLoading(true);
        const res = await getReelViews(reelId, { limit: 100 });
        if (!mounted) return;
        const list = Array.isArray(res.data?.items) ? res.data.items : [];
        setItems(list);
      } catch (e) {
        setErr(e?.response?.data?.msg || "Failed to load views (owner only)");
        setItems([]);
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
          <div className="font-semibold">Views</div>
          <button className="px-2 py-1 rounded hover:bg-gray-100" onClick={onClose}>✕</button>
        </div>

        <div className="p-3">
          {loading ? (
            <div className="text-sm text-gray-600">Loading…</div>
          ) : err ? (
            <div className="text-sm text-red-600">{err}</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-gray-600">No views yet</div>
          ) : (
            <ul className="space-y-2">
              {items.map((v) => {
                const u = v.viewer || {};
                const avatar = u?.profileImage ? buildFileUrl(u.profileImage) : "/default-avatar.png";
                const fullName = `${u?.firstName || ""} ${u?.lastName || ""}`.trim();
                const when = v?.createdAt ? new Date(v.createdAt).toLocaleString() : "";
                return (
                  <li key={v._id} className="flex items-center gap-3">
                    <button
                      onClick={() => { onClose?.(); navigate(`/profile/${u._id}`); }}
                      className="flex items-center gap-3"
                      title={`@${u?.username}`}
                    >
                      <img src={avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                      <div className="text-left">
                        {fullName && <div className="font-medium leading-4">{fullName}</div>}
                        <div className="text-sm text-gray-600">@{u?.username}</div>
                        {when && <div className="text-xs text-gray-500">{when}</div>}
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