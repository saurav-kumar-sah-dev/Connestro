// src/routes/StartChatRoute.jsx
import { useEffect, useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChatContext } from "../context/ChatContext";

export default function StartChatRoute() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { openConversationWithUser } = useContext(ChatContext);

  useEffect(() => {
    if (userId) openConversationWithUser(userId, navigate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return null;
}