import React, { useRef, useEffect, useState } from 'react';
import { Users, MoreVertical, Reply, Trash2, Pin, Forward, FileText, Download, ExternalLink, Mic, X, CheckCircle2, CheckSquare } from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format, isValid } from "date-fns";
import { ChatMessage, ChatService, ChatGroup } from "@/services/chat.service";
import ChatInput from "./ChatInput";
import { useAuth } from '@/context/auth-context';


import { RequestsView } from './RequestsView';

interface ChatAreaProps {
  groupId: number | null;
  groupName: string;
  groupImage?: string;
  groupType: 'direct' | 'group' | 'system'; // Added system type
  selectedUser?: any; // New prop for draft state
  otherUserId?: number; // Added for presence check
  onGroupCreated?: (group: ChatGroup) => void;
}

export default function ChatArea({ groupId, groupName, groupImage, groupType, selectedUser, otherUserId, onGroupCreated }: ChatAreaProps) {
  const { user: authUser } = useAuth();
  const user = authUser as any; 
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set()); // Presence state

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Subscribe to presence updates
  useEffect(() => {
    const unsubscribe = ChatService.onOnlineUsersChange((users) => {
        setOnlineUsers(new Set(users));
    });
    return unsubscribe;
  }, []);

  // Fetch initial messages
  useEffect(() => {
    const fetchMessages = async () => {
      if (!groupId || groupId === -1) {
          setMessages([]); // Clear messages for new chat draft or system view
          return;
      }
      setIsLoading(true);
      try {
        const data = await ChatService.getHistory(groupId);
        // Handle new response format
        const history = Array.isArray(data) ? data : (data.messages || []);
        const hasOlderMessages = !Array.isArray(data) && data.has_older;
        
        // Ensure messages are sorted by date
        const sorted = (history || []).sort((a: ChatMessage, b: ChatMessage) => 
            new Date(a.created_at || Date.now()).getTime() - new Date(b.created_at || Date.now()).getTime()
        );
        setMessages(sorted);
        setHasOlder(hasOlderMessages);
      } catch (error) {
        console.error("Failed to fetch messages", error);
        setMessages([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMessages();
  }, [groupId]);

  // WebSocket Listener
  useEffect(() => {
    if (!groupId) return; // Don't listen if no group yet
    
    // Mark as read immediately on entering group
    ChatService.markAsRead(groupId);

    const unsubscribe = ChatService.onMessage((msg: any) => {
        // Handle read receipt
        if (msg.type === 'messages_read' && msg.group_id === groupId) {
            setMessages(prev => prev.map(m => {
                if (String(m.sender_id) === String(user.id)) {
                    return { ...m, status: 'seen' };
                }
                return m;
            }));
            return;
        }

        // Handle message deleted for everyone (from another user)
        if (msg.type === 'message_deleted' && (msg.group_id === groupId || Number(msg.group_id) === groupId)) {
            const deletedMsgId = Number(msg.message_id);
            setMessages(prev => prev.map(m => 
                m.id === deletedMsgId 
                    ? { ...m, type: 'text', content: '', metadata: { isDeleted: true }, is_pinned: false } 
                    : m
            ));
            return;
        }

    // Handle incoming message
        if (msg.group_id === groupId || (msg.group_id && Number(msg.group_id) === groupId)) {
            setMessages(prev => {
                // 1. Check exact ID match (dedupe)
                if (prev.some(m => m.id === msg.id)) return prev;

                // 2. Check for optimistic match (same content, same sender, isOptimistic)
                if (String(msg.sender_id) === String(user.id)) {
                    const optimisticIndex = prev.findIndex(m => 
                        (m as any).isOptimistic && 
                        m.content === msg.content && 
                        m.type === msg.type
                    );
                    if (optimisticIndex !== -1) {
                        const newMessages = [...prev];
                        newMessages[optimisticIndex] = msg; // Replace optimistic with real
                        return newMessages;
                    }
                }
                
                // 3. Mark read if not me
                if (String(msg.sender_id) !== String(user.id)) {
                     ChatService.markAsRead(groupId);
                }
                return [...prev, msg];
            });
        }
    });

    return () => {
        unsubscribe();
    };
  }, [groupId, user.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (bottomRef.current) {
        bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  // Typing state
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const typingTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  // Action states
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

  useEffect(() => {
    const unsubscribe = ChatService.onTyping((groupIdArg, userId, isTyping, userName) => {
        // ... (existing typing logic)
        if (groupIdArg !== groupId) return;
        if (userId === String(user.id)) return;

        setTypingUsers(prev => {
            const next = new Map(prev);
            if (isTyping) {
                next.set(userId, userName || "Someone");
                if (typingTimeouts.current.has(userId)) clearTimeout(typingTimeouts.current.get(userId)!);
                typingTimeouts.current.set(userId, setTimeout(() => {
                    setTypingUsers(current => {
                        const updated = new Map(current);
                        updated.delete(userId);
                        return updated;
                    });
                }, 3000));
            } else {
                next.delete(userId);
                if (typingTimeouts.current.has(userId)) clearTimeout(typingTimeouts.current.get(userId)!);
            }
            return next;
        });
    });
    return unsubscribe;
  }, [groupId, user.id]);

  const handleTyping = (isTyping: boolean) => {
      if(groupId) ChatService.sendTyping(groupId, isTyping);
  };

  const handlePin = async (msgId: number) => {
     try {
         await ChatService.pinMessage(msgId);
         // Optimistic update
         setMessages(prev => prev.map(m => m.id === msgId ? { ...m, is_pinned: !m.is_pinned } : m));
     } catch(e) { console.error("Pin failed", e); }
  };

  const handleDeleteForMe = async (msgId: number) => {
      try {
          await ChatService.deleteMessage(msgId, false);
          // Hide from local view
          setMessages(prev => prev.filter(m => m.id !== msgId));
          toast.success('Message deleted for you');
      } catch(e) { console.error('Delete failed', e); toast.error('Delete failed'); }
  }

  const handleDeleteForEveryone = async (msgId: number) => {
      try {
          // If pinned, auto-unpin first
          const msg = messages.find(m => m.id === msgId);
          if (msg?.is_pinned) {
              await ChatService.pinMessage(msgId); // toggles pin off
          }
          await ChatService.deleteMessage(msgId, true);
          setMessages(prev => prev.map(m => m.id === msgId ? { ...m, type: 'text', content: '', metadata: { isDeleted: true }, is_pinned: false } : m));
          
          // Broadcast deletion to other connected clients via WebSocket
          if (groupId) {
              ChatService.broadcastDeleteForEveryone(groupId, msgId);
          }
          toast.success('Message deleted for everyone');
      } catch(e) { console.error('Delete failed', e); toast.error('Delete failed'); }
  }

  const handleReply = (msg: ChatMessage) => {
      setReplyingTo(msg);
      // Focus input?
  }

  const handleSendMessage = async (content: string, type: 'text' | 'image' | 'file' | 'student_card' = 'text', metadata = {}) => {
      // If no group ID, we might be starting a new DM
      let currentGroupId = groupId;
      
      if (!currentGroupId) {
          if (selectedUser && user?.id) {
              try {
                  // Create DM group
                  // We need to fetch potential users or just pass IDs. 
                  // ChatService.createGroup expects array of IDs.
                  const newGroup = await ChatService.createGroup(
                      selectedUser.name, 
                      'direct', 
                      [selectedUser.id], 
                      Number(user.id)
                  );
                  currentGroupId = newGroup.id;
                  if (onGroupCreated) onGroupCreated(newGroup);
              } catch (err) {
                  console.error("Failed to create DM group", err);
                  toast.error("Failed to start conversation");
                  return;
              }
          } else {
             return;
          }
      }
      
      try {
          // Optimistic update
          const tempId = Date.now();
          const tempMsg: ChatMessage = {
              id: tempId,
              group_id: currentGroupId!,
              sender_id: Number(user?.id),
              content,
              type,
              created_at: new Date().toISOString(),
              sender_name: user?.name,
              status: 'sent',
              metadata,
              reply_to_id: replyingTo?.id // [NEW]
          };
          // Mark as optimistic for deduping
          (tempMsg as any).isOptimistic = true;
          
          setMessages(prev => [...prev, tempMsg]);
          
          // Send via WebSocket
          ChatService.sendMessage(currentGroupId!, content, type, metadata, replyingTo?.id);
          setReplyingTo(null); // Clear reply after sending
          
      } catch (error) {
          console.error("Failed to send message", error);
      }
  };

  if (!groupId && !selectedUser) {
    // ... (existing code) ...
  }

  // Helpers for render
  const pinnedMessages = messages.filter(m => m.is_pinned);
  const isSingleEmoji = (text: string) => {
      return text.length < 5 && /^\p{Emoji_Presentation}+$/u.test(text.trim());
  };

  // Helper to get display text for a message (used for pin preview & reply preview)
  const getMessagePreviewText = (msg: ChatMessage) => {
      if (msg.type === 'image') return '📷 Image';
      if (msg.type === 'file') return `📄 ${msg.metadata?.name || 'Attachment'}`;
      return msg.content || 'Attachment';
  };

  // Scroll to a message and briefly highlight it
  const scrollToMessage = (messageId: number) => {
      const el = document.getElementById(`message-${messageId}`);
      if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.add('highlight-flash');
          setTimeout(() => el.classList.remove('highlight-flash'), 2500);
      }
  };

  const [selectedMessages, setSelectedMessages] = useState<Set<number>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<number | null>(null);
  const isSelectionMode = selectedMessages.size > 0;

  const toggleSelection = (msgId: number, e?: React.MouseEvent) => {
      // Handle Shift+Click Range Selection
      if (e?.shiftKey && lastSelectedId !== null) {
          const lastIndex = messages.findIndex(m => m.id === lastSelectedId);
          const currentIndex = messages.findIndex(m => m.id === msgId);

          if (lastIndex !== -1 && currentIndex !== -1) {
              const start = Math.min(lastIndex, currentIndex);
              const end = Math.max(lastIndex, currentIndex);
              const rangeIds = messages.slice(start, end + 1).map(m => m.id);

              setSelectedMessages(prev => {
                  const next = new Set(prev);
                  // If we are selecting a range, we generally assume adding to selection
                  rangeIds.forEach(id => next.add(id));
                  return next;
              });
              // We don't necessarily update lastSelectedId to the current one in a range select, 
              // or we do? Standard OS behavior is usually: anchor remains, current updates.
              // But for simple "Shift+Click adds range from last", updating it is fine.
              // Let's NOT update it if we want to allow extending the selection? 
              // Actually, standard is: Click A, Shift+Click B (Selects A..B), Shift+Click C (Selects A..C).
              // So lastSelectedId should effectively remain the "anchor" if we implemented full anchor logic.
              // But here `lastSelectedId` is just "most recently clicked". 
              // If I click A (last=A), Shift+Click B (last=B? or A?), then Shift+Click C.
              // If I set last=B, then range is B..C. Result: A..B and B..C. (A, B, C).
              // If I keep last=A, then range is A..C. Result: A..C. (A, B, C).
              // Both work for expansion.
              // Let's just set it to msgId (current) which allows "chaining" ranges in a simple way.
              // Or better, let's just stick to simple "add range" behavior.
              return;
          }
      }

      setLastSelectedId(msgId);
      setSelectedMessages(prev => {
          const next = new Set(prev);
          if (next.has(msgId)) next.delete(msgId);
          else next.add(msgId);
          return next;
      });
  };

  const clearSelection = () => {
      setSelectedMessages(new Set());
      setLastSelectedId(null);
  };
  
  // Forward/Delete handlers
  const handleBulkDelete = async () => {
      // TODO: Implement bulk delete logic (API request)
      // For now, iterate and delete (inefficient but works for MVP) or add new endpoint
      if (!confirm(`Delete ${selectedMessages.size} messages?`)) return;
      
      const ids = Array.from(selectedMessages);
      // Optimistic visual update
      setMessages(prev => prev.filter(m => !ids.includes(m.id)));
      clearSelection();

      // Send to backend
      try {
          // If we have a bulk delete endpoint, use it. Otherwise loop (less ideal)
          // Assuming we might need to add bulk delete to service
          await Promise.all(ids.map(id => ChatService.deleteMessage(id, true))); 
          toast.success("Messages deleted");
      } catch (e) {
          console.error("Bulk delete failed", e);
          toast.error("Some messages failed to delete");
      }
  };

  const [isForwardDialogOpen, setIsForwardDialogOpen] = useState(false);

  // ... (useEffect hooks)

  // Requests View
  if (groupId === -1) {
      return <RequestsView />;
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white relative">
      {/* Highlight animation style */}
      <style>{`
        @keyframes highlightFlash {
          0% { background-color: transparent; }
          10% { background-color: rgba(0, 0, 0, 0.06); }
          70% { background-color: rgba(0, 0, 0, 0.06); }
          100% { background-color: transparent; }
        }
        .highlight-flash {
          animation: highlightFlash 2.5s ease-out;
        }
      `}</style>

      {/* Header - Conditional for Selection Mode */}
      {isSelectionMode ? (
          <div className="h-16 border-b flex items-center px-6 justify-between bg-white shrink-0 z-10 bg-blue-50/50">
               <div className="flex items-center gap-3">
                   <button onClick={clearSelection} className="p-2 hover:bg-gray-200 rounded-full">
                       <X className="h-5 w-5 text-gray-600" />
                   </button>
                   <span className="font-semibold text-gray-900">{selectedMessages.size} Selected</span>
               </div>
               <div className="flex items-center gap-2">
                   <button onClick={() => setIsForwardDialogOpen(true)} className="p-2 hover:bg-gray-200 rounded-full text-gray-600">
                       <Forward className="h-5 w-5" />
                   </button>
                   <button onClick={handleBulkDelete} className="p-2 hover:bg-red-100 rounded-full text-red-600">
                       <Trash2 className="h-5 w-5" />
                   </button>
               </div>
          </div>
      ) : (
          <div className="h-16 border-b flex items-center px-6 justify-between bg-white shrink-0 z-10">
             <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                    <AvatarImage src={groupImage || `https://api.dicebear.com/7.x/initials/svg?seed=${groupName}`} />
                    <AvatarFallback>{groupName?.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        {groupName}
                        {groupType === 'group' && <Users className="h-4 w-4 text-muted-foreground" />}
                    </h3>
                    {groupType === 'direct' && otherUserId && onlineUsers.has(String(otherUserId)) && (
                        <span className="text-xs text-green-500 flex items-center gap-1">● Online</span>
                    )}
                </div>
             </div>
          </div>
      )}

      {/* Pinned Messages Header */}
       {!isSelectionMode && pinnedMessages.length > 0 && (
          <div 
            onClick={() => scrollToMessage(pinnedMessages[pinnedMessages.length - 1].id)}
            className="bg-gray-50 border-b px-4 py-2 flex items-center gap-2 text-xs text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors"
          >
              <Pin className="h-3 w-3 fill-current" />
              <div className="flex-1 truncate">
                  <span className="font-semibold">Pinned: </span>
                  {getMessagePreviewText(pinnedMessages[pinnedMessages.length - 1])}
              </div>
          </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 px-2 py-1 bg-gray-50/30">
        <div className="flex flex-col gap-1 max-w-3xl mx-auto pb-2" ref={scrollRef}>
            {/* Start of Chat Indicator */}
            {!isLoading && !hasOlder && messages.length > 0 && (
                <div className="flex flex-col items-center justify-center py-6 text-center space-y-1">
                    <p className="text-xs font-semibold text-gray-500">You are on the top of this chat</p>
                    <p className="text-[10px] text-gray-400">
                        Chat started on {format(new Date(messages[0].created_at), 'MMMM d, yyyy')}
                    </p>
                </div>
            )}

            {isLoading ? (
                <div className="text-center text-sm text-gray-500 py-10">Loading messages...</div>
            ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                     <h3 className="text-lg font-semibold text-gray-900">No messages yet</h3>
                     <p className="text-sm text-gray-500 max-w-xs">
                        Start the conversation by sending a message below or just say click to say Hi!
                     </p>
                     <button 
                        onClick={() => handleSendMessage("Hi")}
                        className="mt-4 px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full font-medium transition-colors shadow-sm flex items-center gap-2"
                     >
                        <span>Say Hi</span> <span className="text-lg">👋</span>
                     </button>
                </div>
            ) : (
                messages.map((msg, index) => {
                    const isMe = String(msg.sender_id) === String(user?.id);
                    const isDeleted = msg.type as string === 'deleted' || msg.metadata?.isDeleted;
                    const isSelected = selectedMessages.has(msg.id); // Check selection status
                    
                    // Grouping Logic
                    const prevMsg = messages[index - 1];
                    const msgDate = new Date(msg.created_at || Date.now());
                    const prevDate = prevMsg ? new Date(prevMsg.created_at || Date.now()) : null;
                    
                    // Date Separator Check
                    const isDifferentDay = !prevDate || !isValid(prevDate) || 
                                          format(msgDate, 'yyyy-MM-dd') !== format(prevDate, 'yyyy-MM-dd');

                    const nextMsg = messages[index + 1];
                    const isNextSameSender = nextMsg && String(nextMsg.sender_id) === String(msg.sender_id);
                    const nextDate = nextMsg ? new Date(nextMsg.created_at || Date.now()) : null;
                    const isNextSameTime = nextDate && isValid(msgDate) && isValid(nextDate) && 
                                           format(msgDate, 'h:mm a') === format(nextDate, 'h:mm a');
                                           
                    const showAvatar = !isMe && (index === 0 || messages[index - 1]?.sender_id !== msg.sender_id || isDifferentDay);
                    const showTime = !isNextSameSender || !isNextSameTime || isDifferentDay;

                    // Reply lookup
                    const replyParent = msg.reply_to_id ? messages.find(m => m.id === msg.reply_to_id) : null;

                    return (
                        <React.Fragment key={msg.id || index}>
                             {/* Date Separator */}
                             {isDifferentDay && (
                                <div className="flex items-center justify-center mb-4">
                                    <div className="bg-gray-100/80 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-medium text-gray-500 border border-gray-200">
                                        {(() => {
                                            const today = new Date();
                                            const yesterday = new Date(today);
                                            yesterday.setDate(yesterday.getDate() - 1);
                                            
                                            if (format(msgDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) return 'Today';
                                            if (format(msgDate, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')) return 'Yesterday';
                                            return format(msgDate, 'MMMM d, yyyy');
                                        })()}
                                    </div>
                                </div>
                            )}
                            <div 
                                id={`message-${msg.id}`}
                                className={`grid ${isSelectionMode ? 'grid-cols-[40px_1fr]' : 'grid-cols-[0px_1fr]'} items-center transition-all duration-300 ease-in-out ${showAvatar ? 'mt-4' : 'mt-1'}`}
                            >
                                {/* Column 1: Checkbox (Left) */}
                                <div className={`${isSelectionMode ? 'opacity-100 w-full' : 'opacity-0 w-0 overflow-hidden'} flex justify-center transition-all duration-300`}>
                                     <div onClick={(e) => toggleSelection(msg.id, e)} className="cursor-pointer p-1">
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary' : 'border-gray-300 bg-white'}`}>
                                            {isSelected && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                                        </div>
                                    </div>
                                </div>

                                {/* Column 2: Message Content */}
                                <div className="min-w-0" onDoubleClick={() => { if (!isDeleted) handleReply(msg); }}>
                                    <div className={`flex gap-3 group items-center w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        
                                        {/* Action Menu (Left for Me) */}
                                        {isMe && !isDeleted && !isSelectionMode && (
                                            <div className="mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <MessageActionMenu 
                                                    isMe={true}
                                                    isPinned={!!msg.is_pinned}
                                                    onReply={() => handleReply(msg)} 
                                                    onPin={() => handlePin(msg.id)} 
                                                    onDeleteForMe={() => handleDeleteForMe(msg.id)}
                                                    onDeleteForEveryone={() => handleDeleteForEveryone(msg.id)} 
                                                    onCopy={() => {
                                                        navigator.clipboard.writeText(msg.content);
                                                        toast.success("Copied to clipboard");
                                                    }}
                                                    onForward={() => {
                                                        setSelectedMessages(new Set([msg.id]));
                                                        setIsForwardDialogOpen(true);
                                                    }}
                                                    onSelect={(e) => toggleSelection(msg.id, e)}
                                                />
                                            </div>
                                        )}

                                        {!isMe && (
                                            <div className="w-8 flex-shrink-0 mb-4">
                                                {showAvatar ? (
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={msg.sender_image} />
                                                        <AvatarFallback className="text-[10px]">{msg.sender_name?.substring(0,2).toUpperCase() || "??"}</AvatarFallback>
                                                    </Avatar>
                                                ) : <div className="w-8" />}
                                            </div>
                                        )}
                                        
                                        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[70%]`}>
                                            {!isMe && showAvatar && <span className="text-xs text-gray-500 mb-1 ml-1">{msg.sender_name || `User ${msg.sender_id}`}</span>}
                                            {isDeleted ? (
                                                <div className="italic text-gray-400 text-sm border px-3 py-2 rounded-lg bg-gray-50">
                                                    This message was deleted
                                                </div>
                                            ) : (
                                                <>
                                                {/* Reply Context */}
                                                {replyParent && (
                                                    <div onClick={() => scrollToMessage(replyParent.id)} className={`mb-1 text-xs border-l-2 pl-2 py-1 cursor-pointer hover:bg-gray-100 rounded-r ${isMe ? 'border-primary/50 text-primary/80' : 'border-gray-300 text-gray-500'}`}>
                                                        <span className="font-bold">{replyParent.sender_name}</span>: {getMessagePreviewText(replyParent).substring(0, 50)}{getMessagePreviewText(replyParent).length > 50 ? '...' : ''}
                                                    </div>
                                                )}
                                                
                                                {/* Forwarded Label */}
                                                {msg.forwarded && (
                                                    <div className="flex items-center gap-1 text-[10px] text-gray-400 mb-1 italic">
                                                        <Forward className="h-3 w-3" /> Forwarded
                                                    </div>
                                                )}

                                                <SwipeToReply 
                                                    onReply={() => handleReply(msg)} 
                                                    disabled={isDeleted || isSelectionMode} 
                                                    isMe={isMe}
                                                    isSelectionMode={isSelectionMode}
                                                    isSelected={isSelected}
                                                    onToggleSelect={(e) => toggleSelection(msg.id, e)}
                                                >
                                                    {msg.type === 'student_card' ? (
                                                        <div className={`p-3 rounded-lg border bg-white shadow-sm select-none hover:select-text ${isMe ? 'border-primary/20' : 'border-gray-200'} `}>
                                                            {/* Student Card UI */}
                                                            <p>Student Profile</p>
                                                        </div>
                                                    ) : (
                                                        <div 
                                                            className={`relative text-sm select-none hover:select-text break-words ${
                                                                (msg.type === 'image' || msg.type === 'file') ? 'bg-transparent p-0' :
                                                                isMe 
                                                                ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-sm shadow-sm px-4 py-2' 
                                                                : 'bg-white border border-border text-foreground rounded-2xl rounded-bl-sm px-4 py-2'
                                                            } ${isSingleEmoji(msg.content) && msg.type === 'text' ? '!bg-transparent !shadow-none !border-none !p-0 overflow-visible' : ''}`}
                                                        >
                                                            {msg.type === 'text' && isSingleEmoji(msg.content) ? (
                                                                <span className="text-5xl leading-none">{msg.content}</span>
                                                            ) : msg.type === 'image' || msg.type === 'file' ? (
                                                                <FilePreviewCard msg={msg} isMe={isMe} />
                                                            ) : (
                                                                <p className="whitespace-pre-wrap">{msg.content}</p>
                                                            )}
                                                        </div>
                                                    )}
                                                </SwipeToReply>
                                                </>
                                            )}
                                            
                                            <span className={`text-[10px] text-gray-400 mt-1 px-1 flex items-center gap-1 min-h-[16px] transition-all ${showTime ? 'opacity-100' : 'opacity-0 h-0 hidden'}`}>
                                                {isMe && msg.is_pinned && <Pin className="h-3 w-3" />}
                                                {isValid(new Date(msg.created_at || Date.now())) ? format(new Date(msg.created_at || Date.now()), 'h:mm a') : 'Just now'}
                                                {isMe && index === messages.map(m => String(m.sender_id) === String(user?.id)).lastIndexOf(true) && (
                                                    <span className="ml-1 text-[10px] font-medium">
                                                        {msg.status === 'seen' ? (
                                                            <span className="text-primary font-bold">Seen</span>
                                                        ) : msg.status === 'delivered' ? (
                                                            <span className="text-gray-500">Delivered</span>
                                                        ) : (
                                                            <span className="text-gray-400">Sent</span>
                                                        )}
                                                    </span>
                                                )}
                                            </span>
                                        </div>

                                        {/* Action Menu (Right for Others) */}
                                        {!isMe && !isDeleted && !isSelectionMode && (
                                            <div className="mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <MessageActionMenu 
                                                    isMe={false}
                                                    isPinned={!!msg.is_pinned}
                                                    onReply={() => handleReply(msg)} 
                                                    onPin={() => handlePin(msg.id)} 
                                                    onDeleteForMe={() => handleDeleteForMe(msg.id)}
                                                    onDeleteForEveryone={() => handleDeleteForEveryone(msg.id)} 
                                                    onCopy={() => {
                                                        navigator.clipboard.writeText(msg.content);
                                                        toast.success("Copied to clipboard");
                                                    }}
                                                    onForward={() => {
                                                        setSelectedMessages(new Set([msg.id]));
                                                        setIsForwardDialogOpen(true);
                                                    }}
                                                    onSelect={(e) => toggleSelection(msg.id, e)}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </React.Fragment>
                    )
                })
            )}
            <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Replying Preview */}
      {replyingTo && (
          <div className="border-t bg-gray-50 px-4 py-2 flex items-center justify-between">
              <div className="flex flex-col text-sm border-l-4 border-primary pl-2">
                  <span className="font-bold text-primary">{replyingTo.sender_name || 'User'}</span>
                  <span className="text-gray-500 truncate max-w-xs">{getMessagePreviewText(replyingTo)}</span>
              </div>
              <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-gray-200 rounded">
                  <X className="h-4 w-4 text-gray-500" />
              </button>
          </div>
      )}

      {/* Typing Indicator */}
      {typingUsers.size > 0 && (
          <div className="px-6 py-2 text-xs text-gray-500 bg-white/50 backdrop-blur-sm">
              <TypingIndicator names={Array.from(typingUsers.values())} />
          </div>
      )}

      {/* Input */}
      <ChatInput onSend={handleSendMessage} onTyping={handleTyping} groupId={groupId} />
    </div>
  );

}

function TypingIndicator({ names }: { names: string[] }) {
    const [dots, setDots] = useState('');
  
    useEffect(() => {
      const interval = setInterval(() => {
        setDots(prev => prev.length < 3 ? prev + '.' : '');
      }, 500);
      return () => clearInterval(interval);
    }, []);
  
    if (names.length === 0) return null;
  
    const text = names.length === 1 
      ? `${names[0]} is typing` 
      : `Multiple people are typing`;
  
    return <span>{text}{dots}</span>;
}

// Import at top
import { FileIcon, defaultStyles } from 'react-file-icon';

// Helper to get extension/style
const getFileIconProps = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    // types for react-file-icon defaultStyles
    // We cast to any because defaultStyles keys are specific strings
    const styles = (defaultStyles as any)[ext] || defaultStyles.txt; 
    return { ext, styles };
};

function FilePreviewCard({ msg, isMe }: { msg: ChatMessage, isMe: boolean }) {
    const isImage = msg.type === 'image';
    const isAudio = msg.metadata?.mimeType?.startsWith('audio/') || msg.metadata?.isVoice;
    
    if (isImage) {
        return (
            <div className={`relative aspect-video w-48 bg-gray-100 rounded-lg overflow-hidden cursor-pointer border ${isMe ? 'border-primary/20' : 'border-gray-200'}`} onClick={() => window.open(msg.content, '_blank')}>
                <img 
                    src={msg.content} 
                    alt="Attached image" 
                    className="object-cover w-full h-full hover:scale-105 transition-transform duration-300"
                />
            </div>
        );
    }

    if (isAudio) {
         return (
            <div className={`flex items-center gap-3 min-w-[220px] max-w-[300px] px-3 py-2.5 rounded-xl ${
              isMe 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-white text-gray-900 border border-gray-200'
            }`}>
                <Mic className={`h-4 w-4 shrink-0 ${isMe ? 'text-primary-foreground/70' : 'text-gray-400'}`} />
                <audio controls src={msg.content} className="h-8 w-full [&::-webkit-media-controls-panel]:bg-transparent" style={{ minWidth: 0 }} />
            </div>
        );
    }

    // Default File Card with react-file-icon
    const fileName = msg.metadata?.name || "Attachment";
    // Check if filename is "Attachment" and try to extract from URL if so
    const displayFileName = fileName === "Attachment" ? msg.content.split('/').pop()?.split('?')[0] || "Attachment" : fileName;
    
    const fileSize = msg.metadata?.size 
        ? (msg.metadata.size < 1024 * 1024 
            ? `${Math.round(msg.metadata.size/1024)} KB` 
            : `${(msg.metadata.size/(1024*1024)).toFixed(1)} MB`)
        : "";
    
    const { ext, styles } = getFileIconProps(displayFileName);

    const [isDownloaded, setIsDownloaded] = useState(false);
    const [localBlobUrl, setLocalBlobUrl] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);

    // File formats the browser can natively open
    const browserOpenable = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'txt', 'html', 'mp4', 'webm', 'mp3', 'wav', 'ogg'];
    const canOpenInBrowser = browserOpenable.includes(ext.toLowerCase());

    const handleDownload = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isDownloading) return;
        setIsDownloading(true);
        try {
            const proxyUrl = `/api/proxy/download?url=${encodeURIComponent(msg.content)}&filename=${encodeURIComponent(displayFileName)}`;
            const response = await fetch(proxyUrl);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            setLocalBlobUrl(blobUrl);

            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = displayFileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setIsDownloaded(true);
            toast.success(`Downloaded "${displayFileName}"`);
        } catch (error) {
            console.error('Download failed:', error);
            toast.error('Download failed. Please try again.');
        } finally {
            setIsDownloading(false);
        }
    };

    const [isOpening, setIsOpening] = useState(false);

    const handleOpen = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!canOpenInBrowser) return;

        // If blob is already cached, open directly
        if (localBlobUrl) {
            window.open(localBlobUrl, '_blank');
            return;
        }

        // Fetch and cache, then open
        setIsOpening(true);
        try {
            const proxyUrl = `/api/proxy/download?url=${encodeURIComponent(msg.content)}&filename=${encodeURIComponent(displayFileName)}`;
            const response = await fetch(proxyUrl);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            setLocalBlobUrl(blobUrl);
            window.open(blobUrl, '_blank');
        } catch (error) {
            console.error('Preview failed:', error);
            toast.error('Failed to open file. Please try again.');
        } finally {
            setIsOpening(false);
        }
    };

    return (
        <div 
            className={`group/file flex items-center gap-3 p-3 rounded-xl max-w-[300px] transition-all ${
                isMe 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-white text-gray-900 border border-gray-200'
            }`}
        >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isMe ? 'bg-white/20' : 'bg-gray-100'}`}>
                 <div className="w-6 h-6 flex items-center justify-center">
                    <FileIcon extension={ext} {...styles} />
                 </div>
            </div>
            
            <div className="flex-1 overflow-hidden min-w-0 text-left">
                <p className="text-sm font-medium truncate" title={displayFileName}>{displayFileName}</p>
                {fileSize && (
                    <p className={`text-xs mt-0.5 ${isMe ? 'text-primary-foreground/80' : 'text-gray-500'}`}>
                        {fileSize} • {ext.toUpperCase()}
                    </p>
                )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
                {/* Preview button — always visible for browser-openable formats */}
                {canOpenInBrowser && (
                    <button 
                        onClick={handleOpen}
                        title="Preview file"
                        disabled={isOpening}
                        className={`p-1.5 rounded-full transition-colors ${
                            isMe 
                            ? 'bg-white/20 hover:bg-white/30 text-primary-foreground' 
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                        } ${isOpening ? 'animate-pulse' : ''}`}
                    >
                        <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                )}

                {/* Download button — always visible */}
                <button 
                    onClick={handleDownload}
                    title={isDownloaded ? "Download again" : "Download"}
                    className={`p-1.5 rounded-full transition-colors ${
                        isMe 
                        ? 'bg-white/20 hover:bg-white/30 text-primary-foreground' 
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                    } ${isDownloading ? 'animate-pulse' : ''}`}
                >
                    <Download className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    );
}

function MessageActionMenu({ isMe, isPinned, onReply, onPin, onDeleteForMe, onDeleteForEveryone, onCopy, onForward, onSelect }: { 
    isMe: boolean, 
    isPinned: boolean, 
    onReply: () => void, 
    onPin: () => void, 
    onDeleteForMe: () => void, 
    onDeleteForEveryone: () => void, 
    onCopy: () => void,
    onForward: () => void,
    onSelect: (e?: React.MouseEvent) => void
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded-full">
                    <MoreVertical className="h-3 w-3 text-gray-500" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isMe ? "end" : "start"}>
                <DropdownMenuItem onClick={onReply}>
                    <Reply className="h-4 w-4 mr-2" /> Reply
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onCopy}>
                     <FileText className="h-4 w-4 mr-2" /> Copy
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onForward}>
                     <Forward className="h-4 w-4 mr-2" /> Forward
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onPin}>
                     <Pin className="h-4 w-4 mr-2" /> {isPinned ? 'Unpin Message' : 'Pin Message'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onSelect}>
                     <CheckCircle2 className="h-4 w-4 mr-2" /> Select
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDeleteForMe} className="text-red-600 focus:text-red-600">
                     <Trash2 className="h-4 w-4 mr-2" /> Delete for me
                </DropdownMenuItem>
                {isMe && (
                    <DropdownMenuItem onClick={onDeleteForEveryone} className="text-red-600 focus:text-red-600">
                         <Trash2 className="h-4 w-4 mr-2" /> Delete for everyone
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

// Helper Component for Drag-to-Reply
function SwipeToReply({ children, onReply, disabled, isMe, isSelectionMode, isSelected, onToggleSelect }: { 
    children: React.ReactNode, 
    onReply: () => void, 
    disabled?: boolean, 
    isMe: boolean,
    isSelectionMode: boolean,
    isSelected: boolean,
    onToggleSelect: (e?: React.MouseEvent) => void
}) {
    const [dragX, setDragX] = useState(0);
    const startX = useRef<number | null>(null);
    const threshold = 60;
    const isDragging = useRef(false);

    const handlePointerDown = (e: React.PointerEvent) => {
        if (disabled && !isSelectionMode) return;
        
        // Handle selection click (Shift + Click or simple click in selection mode)
        // If isSelectionMode, any click on the bubble should toggle selection
        // If not isSelectionMode, Shift+Click should toggle selection (and enter mode)
        if (e.shiftKey || isSelectionMode) {
             e.preventDefault();
             onToggleSelect(e);
             return;
        }

        startX.current = e.clientX;
        isDragging.current = false;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (startX.current === null || isSelectionMode) return;
        const currentX = e.clientX;
        const diff = currentX - startX.current!;
        
        // Direction Logic:
        // If isMe (Right side message) -> allow Drag Left (negative diff)
        // If !isMe (Left side message) -> allow Drag Right (positive diff)
        
        let validDrag = false;
        if (isMe && diff < 0) validDrag = true;
        if (!isMe && diff > 0) validDrag = true;

        if (validDrag) {
            isDragging.current = true;
            // Apply resistance
            const absDiff = Math.abs(diff);
            const resistance = absDiff > threshold ? threshold + (absDiff - threshold) * 0.15 : absDiff;
            setDragX(isMe ? -resistance : resistance);
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        // Always reset on up/cancel/leave if we were interacting
        if (startX.current === null && dragX === 0) return;
        
        // Only trigger reply if dragged past threshold
        if (Math.abs(dragX) >= threshold) {
            if (window.navigator.vibrate) window.navigator.vibrate(10);
            onReply();
        } 
        
        // Reset
        setDragX(0);
        startX.current = null;
        isDragging.current = false;
        try {
           if (e.currentTarget) (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        } catch (e) {
            // Ignore
        }
    };

    // If in selection mode, render differently (no swipe)
    // Actually, the parent handles the layout in selection mode.
    // We just need to disable swipe and render children.
    
    return (
        <div 
            className={`relative touch-pan-y w-fit ${isSelectionMode ? '' : 'cursor-grab active:cursor-grabbing'}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={handlePointerUp}
            style={{ touchAction: 'pan-y' }}
        >
             {/* Reply Icon Indicators */}
             {!isSelectionMode && !isMe && (
                 <div 
                    className="absolute left-[-40px] top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none z-0"
                    style={{ 
                        opacity: dragX > 10 ? Math.min(dragX / threshold, 1) : 0,
                        transform: `translateY(-50%) translateX(${Math.min(dragX / 2, 20)}px) scale(${Math.min(dragX / threshold, 1)})`,
                    }}
                 >
                    <div className="bg-white rounded-full p-2 shadow-sm border border-gray-100 text-primary">
                        <Reply className="w-4 h-4" />
                    </div>
                 </div>
             )}

             {!isSelectionMode && isMe && (
                 <div 
                    className="absolute right-[-40px] top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none z-0"
                    style={{ 
                        opacity: dragX < -10 ? Math.min(Math.abs(dragX) / threshold, 1) : 0,
                        transform: `translateY(-50%) translateX(${Math.max(dragX / 2, -20)}px) scale(${Math.min(Math.abs(dragX) / threshold, 1)})`,
                    }}
                 >
                    <div className="bg-white rounded-full p-2 shadow-sm border border-gray-100 text-primary">
                        <Reply className="w-4 h-4 scale-x-[-1]" />
                    </div>
                 </div>
             )}

             {/* Content Container */}
             <div 
                 onClick={(e) => {
                     if (!isDragging.current && (e.shiftKey || isSelectionMode)) {
                         e.stopPropagation();
                         onToggleSelect(e);
                     }
                 }}
                className={`transition-transform duration-200 ease-out will-change-transform ${Math.abs(dragX) > 0 ? 'select-none pointer-events-none' : ''}`}
                style={{ transform: `translateX(${dragX}px)` }}
             >
                {children}
             </div>
        </div>
    )
}

function ForwardDialog({ open, onOpenChange, onForward }: { open: boolean, onOpenChange: (open: boolean) => void, onForward: (targetIds: number[], type: 'user' | 'group') => void }) {
     const { user } = useAuth();
     const [groups, setGroups] = useState<any[]>([]);
     const [selectedTargets, setSelectedTargets] = useState<Set<number>>(new Set());
     
     useEffect(() => {
         if (open && user?.id) {
             ChatService.getGroups(Number(user.id)).then(setGroups).catch(console.error);
         }
     }, [open, user?.id]);

     const handleToggle = (id: number) => {
         setSelectedTargets(prev => {
             const next = new Set(prev);
             if (next.has(id)) next.delete(id);
             else next.add(id);
             return next;
         });
     };

     const handleSend = () => {
         onForward(Array.from(selectedTargets), 'group');
         onOpenChange(false);
         setSelectedTargets(new Set());
     };

     return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Forward to...</DialogTitle>
                </DialogHeader>
                <div className="max-h-[300px] overflow-y-auto space-y-2 py-2">
                    {groups.map(g => (
                        <div 
                            key={g.id} 
                            onClick={() => handleToggle(g.id)}
                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${selectedTargets.has(g.id) ? 'bg-primary/10' : 'hover:bg-gray-100'}`}
                        >
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedTargets.has(g.id) ? 'bg-primary border-primary' : 'border-gray-300'}`}>
                                {selectedTargets.has(g.id) && <CheckCircle2 className="w-3 h-3 text-white" />}
                            </div>
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={g.image_url || `https://api.dicebear.com/7.x/initials/svg?seed=${g.name}`} />
                                <AvatarFallback>{g.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">{g.name}</span>
                        </div>
                    ))}
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSend} disabled={selectedTargets.size === 0}>Send</Button>
                </div>
            </DialogContent>
        </Dialog>
     );
}
