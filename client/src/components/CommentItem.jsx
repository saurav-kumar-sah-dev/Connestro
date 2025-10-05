import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { buildFileUrl } from "../../utils/url";
import { ThumbsUp, Heart, Laugh, Flame, ChevronDown } from "lucide-react";

export default function CommentItem({ comment, handleReact }) {
  const navigate = useNavigate();
  const [showAllReactions, setShowAllReactions] = useState(false);

  const commentUser =
    comment.user || { username: "Unknown", _id: null, profileImage: "/default-avatar.png" };

  const profileImageUrl = commentUser.profileImage
    ? buildFileUrl(commentUser.profileImage)
    : "/default-avatar.png";

  const reactionButtons = [
    { emoji: "👍", icon: ThumbsUp, label: "Like" },
    { emoji: "❤️", icon: Heart, label: "Love" },
    { emoji: "😂", icon: Laugh, label: "Laugh" },
    { emoji: "🔥", icon: Flame, label: "Fire" }
  ];

  return (
    <div className="group flex items-start gap-3 mb-4 p-4 rounded-2xl hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50/30 dark:hover:from-gray-800/50 dark:hover:to-blue-900/20 transition-all duration-300">
      {/* Avatar */}
      <div className="relative shrink-0">
        <img
          src={profileImageUrl}
          alt={commentUser.username}
          className="w-10 h-10 rounded-full object-cover cursor-pointer ring-2 ring-gray-200 dark:ring-gray-700 shadow-md hover:ring-blue-400 dark:hover:ring-blue-500 hover:scale-110 transition-all duration-200"
          onClick={() => commentUser._id && navigate(`/profile/${commentUser._id}`)}
        />
        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></div>
      </div>

      <div className="flex-1 min-w-0">
        {/* Comment text */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 shadow-sm border border-gray-200 dark:border-gray-700 group-hover:border-blue-300 dark:group-hover:border-blue-600 transition-colors">
          <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed break-words">
            <span
              className="font-bold cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              onClick={() => commentUser._id && navigate(`/profile/${commentUser._id}`)}
            >
              {commentUser.username}
            </span>
            <span className="text-gray-600 dark:text-gray-400 mx-1">·</span>
            <span>{comment.text}</span>
          </p>
        </div>

        {/* Reaction buttons */}
        <div className="flex items-center gap-1 mt-2 ml-2">
          {reactionButtons.map(({ emoji, icon: Icon, label }) => (
            <button
              key={emoji}
              onClick={() => handleReact(comment._id, emoji)}
              className="group/btn flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-sm hover:bg-gradient-to-r hover:from-blue-100 hover:to-purple-100 dark:hover:from-blue-900/30 dark:hover:to-purple-900/30 transition-all transform hover:scale-110 active:scale-95"
              aria-label={label}
              title={label}
              type="button"
            >
              <span className="text-base group-hover/btn:scale-125 transition-transform">
                {emoji}
              </span>
            </button>
          ))}
        </div>

        {/* Show comment reactions */}
        {Array.isArray(comment.reactions) && comment.reactions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-3 ml-2">
            {(showAllReactions ? comment.reactions : comment.reactions.slice(0, 3)).map((r, i) => (
              <div
                key={`${r.emoji}-${i}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-1.5 shadow-sm hover:shadow-md hover:scale-105 transition-all"
                title={r.emoji}
              >
                <span className="text-base">{r.emoji}</span>
                {typeof r.count === "number" && (
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    {r.count}
                  </span>
                )}
              </div>
            ))}

            {comment.reactions.length > 3 && !showAllReactions && (
              <button
                onClick={() => setShowAllReactions(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 font-semibold text-xs transition-all hover:scale-105"
                type="button"
              >
                <ChevronDown className="w-3 h-3" />
                +{comment.reactions.length - 3} more
              </button>
            )}

            {showAllReactions && comment.reactions.length > 3 && (
              <button
                onClick={() => setShowAllReactions(false)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 font-semibold text-xs transition-all"
                type="button"
              >
                Show less
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}