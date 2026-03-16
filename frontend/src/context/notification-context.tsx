"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useAuth } from "@/context/auth-context";
import { ChatService, ChatGroup } from "@/services/chat.service";
import {
  settingsService,
  StudentChangeRequest,
} from "@/services/settings.service";

interface NotificationContextType {
  unreadChatCount: number;
  pendingRequestCount: number;
  totalUnreadCount: number;
  chatGroups: ChatGroup[];
  requests: StudentChangeRequest[];
  refreshRequests: () => Promise<void>;
  refreshChats: () => Promise<void>;
  isLoading: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

export const NotificationProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { user, isAuthenticated } = useAuth();
  const [chatGroups, setChatGroups] = useState<ChatGroup[]>([]);
  const [requests, setRequests] = useState<StudentChangeRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const chatFailCountRef = React.useRef(0);
  const requestFailCountRef = React.useRef(0);

  const refreshChats = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return;
    try {
      const data = await ChatService.getGroups(Number(user.id));
      setChatGroups(data || []);
      chatFailCountRef.current = 0; // Reset on success
    } catch (error) {
      chatFailCountRef.current += 1;
      if (chatFailCountRef.current <= 3) {
        console.warn("Chat service unreachable, will retry less frequently");
      }
    }
  }, [isAuthenticated, user?.id]);

  const refreshRequests = useCallback(async () => {
    if (!isAuthenticated || user?.role === "super_admin") return;
    try {
      const data = await settingsService.getPendingRequests();
      setRequests(data || []);
      requestFailCountRef.current = 0;
    } catch (error) {
      requestFailCountRef.current += 1;
      if (requestFailCountRef.current <= 2) {
        console.warn("Failed to fetch requests for notifications, will retry");
      }
    }
  }, [isAuthenticated, user?.role]);

  // Initial load and listeners
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      setIsLoading(true);

      // Connect to ChatService
      ChatService.connect();

      // Initial fetch
      Promise.all([refreshChats(), refreshRequests()]).finally(() =>
        setIsLoading(false),
      );

      // Listen for new messages to update unread counts
      const unsubscribeMsg = ChatService.onMessage(() => {
        refreshChats();
      });

      // Poll for requests every 60 seconds
      const requestInterval = setInterval(refreshRequests, 60000);

      // Poll chats with backoff: 30s normally, backs off on repeated failures
      let chatIntervalId: ReturnType<typeof setInterval>;
      const scheduleChatPoll = () => {
        const backoffMultiplier = Math.min(chatFailCountRef.current, 5);
        const delay =
          backoffMultiplier > 0 ? 30000 * (backoffMultiplier + 1) : 30000; // 30s, 60s, 90s... max 180s
        chatIntervalId = setInterval(() => {
          refreshChats();
          if (chatFailCountRef.current > 0) {
            clearInterval(chatIntervalId);
            scheduleChatPoll(); // Re-schedule with updated backoff
          }
        }, delay);
      };
      scheduleChatPoll();

      return () => {
        unsubscribeMsg();
        clearInterval(requestInterval);
        clearInterval(chatIntervalId);
      };
    } else {
      setChatGroups([]);
      setRequests([]);
    }
  }, [isAuthenticated, user?.id, refreshChats, refreshRequests]);

  const unreadChatCount = useMemo(() => {
    return chatGroups.reduce(
      (acc, group) => acc + (group.unread_count || 0),
      0,
    );
  }, [chatGroups]);

  const pendingRequestCount = requests.length;

  const value = useMemo(
    () => ({
      unreadChatCount,
      pendingRequestCount,
      totalUnreadCount: unreadChatCount + pendingRequestCount,
      chatGroups,
      requests,
      refreshRequests,
      refreshChats,
      isLoading,
    }),
    [
      unreadChatCount,
      pendingRequestCount,
      chatGroups,
      requests,
      refreshRequests,
      refreshChats,
      isLoading,
    ],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotification must be used within a NotificationProvider",
    );
  }
  return context;
};
