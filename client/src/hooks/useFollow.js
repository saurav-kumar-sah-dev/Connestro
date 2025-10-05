import { useContext } from "react";
import API from "../api/axios";
import { AppContext } from "../context/AppContext";

export default function useFollow(currentUserId) {
  const { users, setUsers, socket, updateFollow } = useContext(AppContext);

  const toggleFollow = async (targetUser) => {
    if (!currentUserId || !targetUser?._id) return;

    try {
      // Normalize followers to IDs
      const followers = Array.isArray(targetUser.followers)
        ? targetUser.followers.map((f) => (f?._id ? f._id : f))
        : [];
      const isFollowing = followers.includes(currentUserId);

      const endpoint = isFollowing ? "unfollow" : "follow";
      const res = await API.put(`/users/${targetUser._id}/${endpoint}`);
      const updatedUser = res.data.user;

      // Update local users state
      setUsers((prev) => ({ ...prev, [updatedUser._id]: updatedUser }));

      // Emit socket event
      socket?.emit("updateFollow", {
        userId: updatedUser._id,
        currentUserId,
        follow: !isFollowing,
      });

      return updatedUser;
    } catch (err) {
      console.error("Follow/unfollow error:", err);
    }
  };

  return { toggleFollow };
}
