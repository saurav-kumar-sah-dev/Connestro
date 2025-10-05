import { useState, useContext } from "react";
import API from "../api/axios";
import { AppContext } from "../context/AppContext";
import { 
  Type, 
  Image as ImageIcon, 
  Video, 
  FileText, 
  Link2, 
  Globe2, 
  Users, 
  Lock,
  Send,
  Save
} from "lucide-react";

export default function PostForm({ currentUser }) {
  const { setPosts, drafts, setDrafts } = useContext(AppContext);
  const [content, setContent] = useState("");
  const [media, setMedia] = useState([]);
  const [link, setLink] = useState("");
  const [type, setType] = useState("text");
  const [visibility, setVisibility] = useState("public");

  const handleFileChange = (e) => {
    if (type === "image" || type === "video" || type === "document") {
      setMedia([...e.target.files]);
    }
  };

  const send = async (asDraft = false) => {
    if (!content.trim() && !media.length && !link.trim()) return;

    try {
      const formData = new FormData();
      formData.append("content", content);
      formData.append("visibility", visibility);
      formData.append("draft", asDraft ? "true" : "false");

      if (type === "link" && link.trim()) formData.append("links", link);
      if ((type === "image" || type === "video" || type === "document") && media.length) {
        media.forEach((file) => formData.append("media", file));
      }

      const res = await API.post("/posts", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setContent("");
      setLink("");
      setMedia([]);
      setType("text");
      setVisibility("public");

      if (asDraft) {
        setDrafts((prev) => [res.data, ...prev]);
      } else {
        setPosts((prev) => [res.data, ...prev]);
      }
      return res.data;
    } catch (err) {
      console.error("Failed to post:", err);
      alert("Failed to post. Please try again.");
    }
  };

  const typeBtn = (t, label, Icon) => (
    <button
      type="button"
      key={t}
      aria-pressed={type === t}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all transform hover:scale-105 ${
        type === t
          ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white border-transparent shadow-lg"
          : "bg-white text-gray-700 border-gray-300 hover:border-blue-400 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 dark:hover:border-blue-500"
      }`}
      onClick={() => {
        setType(t);
        setMedia([]);
        setLink("");
      }}
      title={label}
    >
      <Icon className="w-4 h-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );

  const AudienceIcon = 
    visibility === "private" ? Lock : 
    visibility === "followers" ? Users : 
    Globe2;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send(false);
      }}
      className="relative rounded-2xl border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg hover:shadow-xl transition-all duration-300 p-5 md:p-6 mb-8"
    >
      {/* Gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-purple-500 to-pink-500 rounded-t-2xl" />

      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          Create a Post
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Share your thoughts, media, or links with your community
        </p>
      </div>

      {/* Post type selector */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Post Type
        </label>
        <div className="flex flex-wrap gap-2">
          {typeBtn("text", "Text", Type)}
          {typeBtn("image", "Image", ImageIcon)}
          {typeBtn("video", "Video", Video)}
          {typeBtn("document", "Document", FileText)}
          {typeBtn("link", "Link", Link2)}
        </div>
      </div>

      {/* Audience selector */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Audience
        </label>
        <div className="relative">
          <span className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
            <AudienceIcon className="w-5 h-5" />
          </span>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
            className="w-full border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl pl-12 pr-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          >
            <option value="public">🌍 Public - Everyone can see</option>
            <option value="followers">👥 Followers Only</option>
            <option value="private">🔒 Private - Only me</option>
          </select>
        </div>
      </div>

      {/* Text content */}
      <div className="mb-6">
        <label htmlFor="pf-content" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          What's on your mind?
        </label>
        <textarea
          id="pf-content"
          rows="4"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share an update, thought, or media…"
          className="w-full border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl p-4 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder-gray-400 dark:placeholder-gray-500"
        />
      </div>

      {/* Media upload */}
      {(type === "image" || type === "video" || type === "document") && (
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            {type === "image" ? "📷 Upload Images" : type === "video" ? "🎥 Upload Videos" : "📄 Upload Documents"}
          </label>
          <div className="relative">
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              accept={
                type === "image"
                  ? "image/*"
                  : type === "video"
                  ? "video/*"
                  : ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt"
              }
              className="block w-full text-sm text-gray-700 dark:text-gray-300 file:mr-4 file:px-6 file:py-3 file:rounded-xl file:border-0 file:bg-gradient-to-r file:from-blue-600 file:to-purple-600 file:text-white file:font-semibold hover:file:from-blue-700 hover:file:to-purple-700 file:cursor-pointer file:shadow-md file:transition-all border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-4 hover:border-blue-400 dark:hover:border-blue-500 transition-all"
            />
          </div>
          {media.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {Array.from(media).map((file, idx) => (
                <div key={idx} className="px-3 py-1.5 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-medium">
                  📎 {file.name}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Link input */}
      {type === "link" && (
        <div className="mb-6">
          <label htmlFor="pf-link" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            🔗 Link URL
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
              <Link2 className="w-5 h-5" />
            </span>
            <input
              id="pf-link"
              type="text"
              placeholder="https://example.com"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="w-full border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
        <button
          type="button"
          onClick={() => send(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 transition-all transform hover:scale-105 shadow-md"
        >
          <Save className="w-5 h-5" />
          Save Draft
        </button>
        <button
          type="submit"
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg"
        >
          <Send className="w-5 h-5" />
          Post Now
        </button>
      </div>
    </form>
  );
}