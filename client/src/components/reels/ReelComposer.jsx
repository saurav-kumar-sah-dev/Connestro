import { useRef, useState } from "react";
import { createReel } from "../../api/reels";

export default function ReelComposer({ onClose, onUploaded }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState("public"); // used for publish
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const onPick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("video/")) {
      alert("Please select a video file");
      e.target.value = "";
      return;
    }
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const reset = () => {
    setFile(null);
    setPreviewUrl("");
    setCaption("");
    setVisibility("public");
    if (inputRef.current) inputRef.current.value = "";
  };

  const doUpload = async ({ asDraft }) => {
    if (!file || uploading) return;
    try {
      setUploading(true);
      const res = await createReel(file, {
        caption,
        visibility: asDraft ? "public" : visibility, // visibility ignored for drafts on server side
        draft: !!asDraft,
      });
      const r = res.data?.reel;
      onUploaded?.(r || null);
      reset();
    } catch (e) {
      console.error("createReel failed", e);
      alert(e.response?.data?.msg || "Failed to upload reel");
    } finally {
      setUploading(false);
      onClose?.();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-md p-4 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Upload Reel</h3>
          <button onClick={onClose} className="px-2 py-1 rounded hover:bg-gray-100">✕</button>
        </div>

        <div className="mb-3">
          {previewUrl ? (
            <video src={previewUrl} className="max-w-full max-h-64" controls />
          ) : (
            <div className="text-sm text-gray-600">Pick a video (up to 60s)</div>
          )}
        </div>

        <div className="space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            onChange={onPick}
            className="w-full"
          />

          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Caption (optional)"
            maxLength={200}
            className="w-full border rounded px-3 py-2"
          />

          {/* Visibility for publish */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Visibility:</label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              className="border rounded px-2 py-1"
            >
              <option value="public">Public</option>
              <option value="followers">Followers</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-3">
          <button onClick={onClose} className="px-3 py-1 rounded border">Cancel</button>
          <button
            onClick={() => doUpload({ asDraft: true })}
            disabled={!file || uploading}
            className="px-3 py-1 rounded bg-yellow-600 text-white disabled:opacity-60"
            title="Save as Draft (only you can see)"
          >
            {uploading ? "Saving…" : "Save Draft"}
          </button>
          <button
            onClick={() => doUpload({ asDraft: false })}
            disabled={!file || uploading}
            className="px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-60"
            title="Publish now"
          >
            {uploading ? "Uploading…" : "Publish"}
          </button>
        </div>
      </div>
    </div>
  );
}