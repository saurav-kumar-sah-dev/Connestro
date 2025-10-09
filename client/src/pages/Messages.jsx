import { useContext, useEffect } from "react";
import { useParams } from "react-router-dom";
import clsx from "clsx";

import { ChatContext } from "../context/ChatContext";
import { useTheme } from "../context/ThemeContext";
import ChatSidebar from "../components/chat/ChatSidebar";
import ChatWindow from "../components/chat/ChatWindow";
import { IoChatbubbles } from "react-icons/io5";

const styles = {
  page: "h-screen w-screen overflow-hidden flex flex-col", // Fixed height for mobile
  
  container: "flex-1 container mx-auto px-2 sm:px-4 md:px-6 py-2 sm:py-4 md:py-6 overflow-hidden",

  shell:
    "h-full flex rounded-none sm:rounded-2xl overflow-hidden shadow-none sm:shadow-2xl transition-all duration-300 border-0 sm:border-2",
  shellLight: "bg-white sm:border-gray-200",
  shellDark: "bg-gray-900 sm:border-gray-800",

  sidebar: "w-full md:w-[360px] lg:w-[400px] xl:w-[420px] border-r transition-colors duration-300 h-full overflow-hidden",
  sidebarLight: "bg-gradient-to-b from-gray-50 to-white border-gray-200",
  sidebarDark: "bg-gradient-to-b from-gray-900 to-gray-950 border-gray-800",

  chat: "flex-1 min-w-0 transition-colors duration-300 h-full overflow-hidden",
  chatLight: "bg-white",
  chatDark: "bg-gray-900",

  placeholder: "hidden md:flex flex-1 items-center justify-center px-6 text-center h-full",
  placeholderLight: "bg-gradient-to-br from-gray-50 to-gray-100",
  placeholderDark: "bg-gradient-to-br from-gray-950 to-gray-900",
};

export default function Messages() {
  const { conversations, openConversation } = useContext(ChatContext);
  const { id } = useParams();
  const { darkMode } = useTheme();

  useEffect(() => {
    if (id) openConversation(id);
  }, [id]);

  const selected = conversations.find((c) => c._id === id);
  const hasId = !!id;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div
          className={clsx(
            styles.shell,
            darkMode ? styles.shellDark : styles.shellLight
          )}
        >
          <div
            className={clsx(
              hasId ? "hidden md:block" : "block",
              styles.sidebar,
              darkMode ? styles.sidebarDark : styles.sidebarLight
            )}
          >
            <ChatSidebar />
          </div>

          <div
            className={clsx(
              hasId ? "flex" : "hidden md:flex",
              styles.chat,
              darkMode ? styles.chatDark : styles.chatLight
            )}
          >
            {id ? (
              <ChatWindow conversationId={id} conversation={selected} />
            ) : (
              <div
                className={clsx(
                  styles.placeholder,
                  darkMode ? styles.placeholderDark : styles.placeholderLight
                )}
              >
                <div className="flex flex-col items-center gap-4">
                  <div className={`p-6 rounded-full ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-xl`}>
                    <IoChatbubbles className={`text-6xl ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                  <div>
                    <h3 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                      Your Messages
                    </h3>
                    <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Select a conversation to start chatting
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}