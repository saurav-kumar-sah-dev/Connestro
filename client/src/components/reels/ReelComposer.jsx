import { useRef, useState } from "react";
import { createReel } from "../../api/reels";
import { Loader2 } from "lucide-react";

export default function ReelComposer({ onClose, onUploaded }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState("public"); // used for publish
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
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
      setUploadProgress(asDraft ? "Saving draft..." : "Uploading video...");
      
      const res = await createReel(file, {
        caption,
        visibility: asDraft ? "public" : visibility, // visibility ignored for drafts on server side
        draft: !!asDraft,
      }, {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(asDraft ? `Saving ${percentCompleted}%...` : `Uploading ${percentCompleted}%...`);
          }
        },
      });
      
      setUploadProgress(asDraft ? "Processing draft..." : "Processing video...");
      const r = res.data?.reel;
      onUploaded?.(r || null);
      reset();
    } catch (e) {
      // Error("createReel failed", e);
      alert(e.response?.data?.msg || "Failed to upload reel");
    } finally {
      setUploading(false);
      setUploadProgress("");
      onClose?.();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={uploading ? undefined : onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-md p-4 w-full max-w-md relative" onClick={(e) => e.stopPropagation()}>
        {/* Uploading overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-md z-50 flex flex-col items-center justify-center gap-4">
            <div className="relative">
              <Loader2 className="w-12 h-12 text-blue-600 dark:text-blue-400 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                {uploadProgress || "Uploading..."}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {file ? `Processing ${file.name}...` : "Please wait while we upload your reel..."}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Upload Reel</h3>
          <button 
            onClick={onClose} 
            disabled={uploading}
            className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ✕
          </button>
        </div>

        <div className="mb-3">
          {previewUrl ? (
            <video src={previewUrl} className="max-w-full max-h-64 rounded" controls />
          ) : (
            <div className="text-sm text-gray-600 dark:text-gray-400 px-2 py-4 text-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
              Pick a video (up to 60s)
            </div>
          )}
        </div>

        <div className="space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            onChange={onPick}
            disabled={uploading}
            className="w-full text-sm text-gray-700 dark:text-gray-300 file:mr-4 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:font-semibold hover:file:bg-blue-700 file:cursor-pointer file:transition-all file:disabled:opacity-50 file:disabled:cursor-not-allowed border-2 border-gray-300 dark:border-gray-700 rounded-lg p-2 bg-white dark:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          />

          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Caption (optional)"
            maxLength={200}
            disabled={uploading}
            className="w-full border-2 border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          />

          {/* Visibility for publish */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400 font-medium">Visibility:</label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              disabled={uploading}
              className="border-2 border-gray-300 dark:border-gray-700 rounded-lg px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="public">Public</option>
              <option value="followers">Followers</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-3">
          <button 
            onClick={onClose} 
            disabled={uploading}
            className="px-3 py-1 rounded-lg border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={() => doUpload({ asDraft: true })}
            disabled={!file || uploading}
            className="px-3 py-1 rounded-lg bg-yellow-600 dark:bg-yellow-500 text-white hover:bg-yellow-700 dark:hover:bg-yellow-600 transition-all disabled:opacity-60 disabled:cursor-not-allowed font-medium"
            title="Save as Draft (only you can see)"
          >
            {uploading ? "Saving…" : "Save Draft"}
          </button>
          <button
            onClick={() => doUpload({ asDraft: false })}
            disabled={!file || uploading}
            className="px-3 py-1 rounded-lg bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 transition-all disabled:opacity-60 disabled:cursor-not-allowed font-medium"
            title="Publish now"
          >
            {uploading ? "Uploading…" : "Publish"}
          </button>
        </div>
      </div>
    </div>
  );
}