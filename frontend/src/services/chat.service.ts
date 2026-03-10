import axios from 'axios';
import { getAuthToken } from '@/utils/auth-token';

const CHAT_API_URL = process.env.NEXT_PUBLIC_CHAT_API_URL 
const WS_URL = process.env.NEXT_PUBLIC_CHAT_WS_URL 

export interface ChatGroup {
  id: number;
  name: string;
  type: 'direct' | 'group';
  created_by: number;
  created_at: string;
  image?: string;
  role?: string;
  branch?: string;
  other_user_id?: number;
  unread_count?: number;
  last_message?: string;
  last_message_at?: string;
  last_message_type?: string;
  last_message_metadata?: any;
  last_seen?: string;
}

export interface ChatMessage {
  id: number;
  group_id: number;
  sender_id: number;
  content: string;
  type: 'text' | 'image' | 'file' | 'student_card';
  status?: 'sent' | 'delivered' | 'seen';
  created_at: string;
  sender_name?: string;
  sender_image?: string;
  metadata?: any;
  reply_to_id?: number;
  is_pinned?: boolean;
  forwarded?: boolean;
}

class ChatServiceClass {
  private ws: WebSocket | null = null;
  private messageHandlers: ((msg: any) => void)[] = [];
  private reconnectInterval = 3000;
  private shouldReconnect = true;
  private messageQueue: any[] = [];
  private connectionStatusHandlers: ((status: 'connected' | 'disconnected' | 'connecting') => void)[] = [];
  
  // Presence State
  private onlineUsers: Set<string> = new Set();
  private onlineUsersHandlers: ((users: string[]) => void)[] = [];

  // Typing Handlers
  private typingHandlers: ((groupId: number, userId: string, isTyping: boolean, userName?: string) => void)[] = [];

  // REST API Methods
  async getGroups(userId: number) {
      const token = getAuthToken();
      const response = await axios.get(`${CHAT_API_URL}/groups?user_id=${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
  }

  async getChatUsers(userId: number) {
      const token = getAuthToken();
      const response = await axios.get(`${CHAT_API_URL}/users/chat-eligible?user_id=${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
  }

  async sendBroadcast(data: { channels: string[], recipients: string[], subject?: string, message: string }) {
      const token = getAuthToken();
      const response = await axios.post(`${CHAT_API_URL}/broadcast`, data, {
          headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
  }

  async createGroup(name: string, type: 'direct' | 'group', memberIds: number[], creatorId: number) {
    const token = getAuthToken();
    const response = await axios.post(`${CHAT_API_URL}/groups?user_id=${creatorId}`, { name, type, member_ids: memberIds }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }

  async getHistory(groupId: number, days: number = 30) {
    const token = getAuthToken();
    const response = await axios.get(`${CHAT_API_URL}/groups/${groupId}/messages?days=${days}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    // Backend now returns { messages: [], has_older: bool, start_date: string }
    return response.data;
  }

  async uploadAttachment(file: File, groupId?: number) {
    const token = getAuthToken();
    const formData = new FormData();
    formData.append('file', file);
    if (groupId) {
        formData.append('group_id', String(groupId));
    }
    
    // We use the new endpoint
    // APP_CONFIG.API_BASE_URL usually ends with /api, so we optimize.
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    const response = await axios.post(`${baseUrl}/v1/chat/upload`, formData, {
        headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
        }
    });
    return response.data;
  }

  // WebSocket Methods
  connect() {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) return;

    this.shouldReconnect = true;
    this.notifyConnectionStatus('connecting');

    const token = getAuthToken();
    if (!token) {
        console.error("ChatService: No auth token found, cannot connect to chat");
        return;
    }

    const wsUrl = `${WS_URL}?token=${token}`;
    console.log(`ChatService: Connecting to ${WS_URL} with token (len=${token.length})...`);

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('Connected to Chat Service');
      this.notifyConnectionStatus('connected');
      this.flushMessageQueue();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'presence' || data.type === 'presence_sync') {
            this.handlePresenceMessage(data);
        } else if (data.type === 'typing_start' || data.type === 'typing_stop') {
            this.typingHandlers.forEach(handler => handler(data.group_id, data.sender_id, data.type === 'typing_start', data.sender_name));
        } else {
            this.messageHandlers.forEach(handler => handler(data));
        }
      } catch (e) {
        console.error('Failed to parse WS message:', event.data, e);
      }
    };

    this.ws.onclose = () => {
      console.log('Disconnected from Chat Service');
      this.ws = null;
      this.notifyConnectionStatus('disconnected');
      
      if (this.shouldReconnect) {
        setTimeout(() => {
            console.log("Attempting to reconnect...");
            this.connect();
        }, this.reconnectInterval);
      }
    };

    this.ws.onerror = (error) => {
        console.error("WebSocket Error:", error);
        this.ws?.close();
    };
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  markAsRead(groupId: number) {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
              type: 'mark_read',
              group_id: groupId
          }));
      }
  }

  // Typing Indicators
  sendTyping(groupId: number, isTyping: boolean) {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
              type: isTyping ? 'typing_start' : 'typing_stop',
              group_id: groupId
          }));
      }
  }

  onTyping(handler: (groupId: number, userId: string, isTyping: boolean, userName?: string) => void) {
      this.typingHandlers.push(handler);
      return () => {
          this.typingHandlers = this.typingHandlers.filter(h => h !== handler);
      };
  }

  sendMessage(groupId: number, content: string, type: 'text' | 'image' | 'file' | 'student_card' = 'text', metadata = {}, replyToId?: number, forwarded: boolean = false) {
    const payload = {
        group_id: groupId,
        content,
        type,
        metadata,
        reply_to_id: replyToId,
        forwarded
    };

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    } else {
      console.warn('WebSocket not connected. Queueing message.');
      this.messageQueue.push(payload);
      if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
          this.connect();
      }
    }
  }

  async pinMessage(messageId: number) {
      const token = getAuthToken();
      await axios.post(`${CHAT_API_URL}/messages/${messageId}/pin`, {}, {
          headers: { Authorization: `Bearer ${token}` }
      });
  }

  async deleteMessage(messageId: number, deleteForEveryone: boolean = false) {
      const token = getAuthToken();
      await axios.delete(`${CHAT_API_URL}/messages/${messageId}?delete_for_everyone=${deleteForEveryone}`, {
          headers: { Authorization: `Bearer ${token}` }
      });
  }

  broadcastDeleteForEveryone(groupId: number, messageId: number) {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
              type: 'message_deleted',
              group_id: groupId,
              content: String(messageId), // reuse content field for message ID
          }));
      }
  }

  async forwardMessage(groupId: number, messageId: number) {
      // For now, we can reuse sendMessage logic in the UI or backend.
      // Ideally backend handles "forward" to copy content.
      // But simpler: UI gets message content and sends as new message with forwarded: true.
      // Or we call an API. Let's assume we handle it in UI for now, 
      // but if we want a dedicated API:
      // await axios.post(`${CHAT_API_URL}/messages/${messageId}/forward`, { group_id: groupId });
      // Let's stick to the UI composing the forwarded message for now, 
      // but we need this method signature if I called it somewhere. 
      // Actually, I haven't called it yet.
  }

  private flushMessageQueue() {
      while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
          const payload = this.messageQueue.shift();
          this.ws.send(JSON.stringify(payload));
      }
  }

  onMessage(handler: (msg: any) => void) {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    };
  }

  onConnectionStatusChange(handler: (status: 'connected' | 'disconnected' | 'connecting') => void) {
      this.connectionStatusHandlers.push(handler);
      // Immediately notify current status
      if (this.ws?.readyState === WebSocket.OPEN) handler('connected');
      else if (this.ws?.readyState === WebSocket.CONNECTING) handler('connecting');
      else handler('disconnected');

      return () => {
          this.connectionStatusHandlers = this.connectionStatusHandlers.filter(h => h !== handler);
      };
  }

  private notifyConnectionStatus(status: 'connected' | 'disconnected' | 'connecting') {
      this.connectionStatusHandlers.forEach(handler => handler(status));
  }

  // Presence Methods
  onOnlineUsersChange(handler: (users: string[]) => void) {
      this.onlineUsersHandlers.push(handler);
      // Immediately notify current state
      handler(Array.from(this.onlineUsers));
      return () => {
          this.onlineUsersHandlers = this.onlineUsersHandlers.filter(h => h !== handler);
      };
  }

  private notifyOnlineUsers() {
      const users = Array.from(this.onlineUsers);
      this.onlineUsersHandlers.forEach(handler => handler(users));
  }

  private handlePresenceMessage(data: any) {
      if (data.type === 'presence_sync') {
          this.onlineUsers = new Set(data.users);
      } else if (data.type === 'presence') {
          if (data.status === 'online') {
              this.onlineUsers.add(String(data.user_id));
          } else {
              this.onlineUsers.delete(String(data.user_id));
          }
      }
      this.notifyOnlineUsers();
  }

}

export const ChatService = new ChatServiceClass();
