import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  MessageSquare,
  Search,
  Plus,
  Users,
  MoreVertical,
  LogOut,
  Phone,
  Video,
  Info,
  Send,
  Loader2,
  Check,
  X,
  FileText
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ChatService, ChatGroup } from '@/services/chat.service';
import { useAuth } from '@/context/auth-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import apiClient from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DriveRequestList } from './DriveRequestList';
import { driveService } from '@/services/drive.service';

// Add type safety for User if not defined globally yet in this file scope
interface User {
    id: string | number;
    name: string;
    profile_photo_url?: string;
    role: string;
    branch?: string;
}

interface ChatSidebarProps {
  // groups: any[]; // Removed as fetched internally
  selectedGroupId: number | null;
  onSelectGroup: (group: any) => void;
  onSelectUser?: (user: any) => void;
  // onCreateGroup: () => void; // Handled internally
}

interface Template {
  id: number;
  name: string;
  type: 'WHATSAPP' | 'EMAIL';
  content: string;
}

// Helper for short relative time
const formatRelativeTime = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return format(date, 'MMM d');
};

export function ChatSidebar({ selectedGroupId, onSelectGroup, onSelectUser }: Omit<ChatSidebarProps, 'groups' | 'onCreateGroup'>) {
  const { user: authUser } = useAuth();
  const user = authUser as unknown as User; // Temporary cast until User type is unified
  const [groups, setGroups] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewGroupOpen, setIsNewGroupOpen] = useState(false);
  const [potentialUsers, setPotentialUsers] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [newGroupName, setNewGroupName] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsubscribe = ChatService.onOnlineUsersChange((users) => {
        setOnlineUsers(new Set(users));
    });
    return unsubscribe;
  }, []);

  // Broadcast State
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [broadcastChannels, setBroadcastChannels] = useState<string[]>(['email']);
  const [broadcastSubject, setBroadcastSubject] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [isBroadcastLoading, setIsBroadcastLoading] = useState(false);
  
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('none');
  const [targetGroup, setTargetGroup] = useState('all_students');

  // New Broadcast filters
  const [targetBatch, setTargetBatch] = useState('all');
  const [targetDept, setTargetDept] = useState('all');
  const [targetRollNos, setTargetRollNos] = useState('');
  const [targetNames, setTargetNames] = useState('');

  // Requests state
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [driveRequestsCount, setDriveRequestsCount] = useState(0); 

  // Fetch templates and requests
  useEffect(() => {
    if (isBroadcastOpen) {
        const fetchTemplates = async () => {
            try {
                const res = await apiClient.get('/admin/broadcast/template');
                setTemplates(res.data || []);
            } catch (err) {
                console.error("Failed to load templates", err);
            }
        };
        fetchTemplates();
    }
  }, [isBroadcastOpen]);

  const fetchRequestsCount = async () => {
    try {
        const res = await apiClient.get('/v1/admin/requests');
        setPendingRequestsCount(res.data?.length || 0);
        
        // Also fetch drive requests count
        const dr = await driveService.getDriveRequests();
        setDriveRequestsCount(dr?.length || 0);

    } catch (err: any) {
        if (!err.handled) {
             console.error("Failed to load requests count", err);
        }
    }
  };

  useEffect(() => {
    fetchRequestsCount();
    // Poll every 10s for updates
    const interval = setInterval(fetchRequestsCount, 10000);
    return () => clearInterval(interval);
  }, []);


  // Update message when template selected
  useEffect(() => {
    if (selectedTemplateId && selectedTemplateId !== 'none') {
      const tmpl = templates.find(t => t.id.toString() === selectedTemplateId);
      if (tmpl) setBroadcastMessage(tmpl.content);
    }
  }, [selectedTemplateId, templates]);

  const handleSendBroadcast = async () => {
      if (!broadcastMessage || broadcastChannels.length === 0) return;
      
      setIsBroadcastLoading(true);
      try {
          // Send for each selected channel
          for (const channel of broadcastChannels) {
            await apiClient.post('/admin/broadcast/send', {
                type: channel.toUpperCase(), // WHATSAPP or EMAIL
                target_group: targetGroup,
                batch: targetBatch !== 'all' ? targetBatch : undefined,
                department: targetDept !== 'all' ? targetDept : undefined,
                roll_nos: targetRollNos ? targetRollNos.split(',').map(s => s.trim()) : undefined,
                names: targetNames ? targetNames.split(',').map(s => s.trim()) : undefined,
                subject: channel === 'email' ? broadcastSubject : undefined,
                message: broadcastMessage,
            });
          }
          
          setIsBroadcastOpen(false);
          setBroadcastMessage('');
          setSelectedTemplateId('none');
          // toast.success("Broadcast sent successfully");
          console.log("Broadcast sent successfully");
      } catch (error) {
          console.error("Failed to send broadcast", error);
          // toast.error("Failed to send broadcast");
      } finally {
        setIsBroadcastLoading(false);
      }
  };

  const fetchGroups = async () => {
      if (user?.id) {
          try {
            const data = await ChatService.getGroups(Number(user.id));
            setGroups(data || []);
          } catch (error) {
            console.error("Failed to fetch groups", error);
          }
      }
  };

  useEffect(() => {
    fetchGroups();
    
    // Subscribe to new messages to update sidebar ordering/unread count
    const unsubscribe = ChatService.onMessage(() => {
        fetchGroups();
    });

    // Poll for updates (optional, for MVP)
    const interval = setInterval(fetchGroups, 10000); 
    return () => {
        clearInterval(interval);
        unsubscribe();
    };
  }, [user?.id]);

  // Auto-select group from URL if available and groups are loaded
  const hasCheckedUrl = useRef(false);

  useEffect(() => {
      if (groups.length > 0 && !selectedGroupId && !hasCheckedUrl.current) {
          const params = new URLSearchParams(window.location.search);
          const groupIdParam = params.get('groupId');
          if (groupIdParam) {
              const group = groups.find(g => String(g.id) === groupIdParam);
              if (group) {
                  onSelectGroup(group);
              }
          }
          hasCheckedUrl.current = true;
      } else if (groups.length > 0 && selectedGroupId) {
          // If we already have a selection, mark as checked so we don't overwrite if selection clears transiently
          hasCheckedUrl.current = true;
      }
  }, [groups, selectedGroupId]);

  const handleOpenNewGroup = async () => {
      if (user?.id) {
        setIsLoading(true);
        try {
            const users = await ChatService.getChatUsers(Number(user.id));
            setPotentialUsers(users || []);
            setIsNewGroupOpen(true);
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setIsLoading(false);
        }
      }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName && selectedUserIds.length > 1) { // Group needs name
         return; 
    }
    
    // Auto-name DM if not provided
    let name = newGroupName;
    let type: 'group' | 'direct' = 'group';

    if (selectedUserIds.length === 1) {
        type = 'direct';
        const u = potentialUsers.find(u => u.id === selectedUserIds[0]);
        name = u ? u.name : 'Chat'; 
    }
    
    if (user?.id) {
        try {
            const res = await ChatService.createGroup(name, type, selectedUserIds, Number(user.id));
            setIsNewGroupOpen(false);
            setNewGroupName('');
            setSelectedUserIds([]);
            fetchGroups(); // Refresh list
            onSelectGroup(res);
        } catch (error) {
            console.error("Failed to create group", error);
        }
    }
  };
  
  useEffect(() => {
    // Fetch potential users on mount to populate suggestions
    const loadUsers = async () => {
        if (user?.id) {
             try {
                const users = await ChatService.getChatUsers(Number(user.id));
                setPotentialUsers(users || []);
             } catch (error) {
                console.error("Failed to fetch users", error);
             }
        }
    };
    loadUsers();
  }, [user?.id]);

  const toggleUserSelection = (userId: number) => {
      setSelectedUserIds(prev => 
        prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
      );
  };

  const filteredGroups = groups.filter(group => 
    group.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter users who are NOT already in a DM group
  const searchUsers = potentialUsers.filter(u => {
      // 1. Matches search
      const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase());
      // 2. Not already in a DM
      const alreadyHasDM = groups.some(g => g.type === 'direct' && g.other_user_id === u.id);
      return matchesSearch && !alreadyHasDM;
  });

  return (
    <div className="w-[350px] border-r h-full flex flex-col bg-white">
      {/* Header */}
      <div className="h-16 px-4 bg-gray-50 flex items-center justify-between border-b shrink-0">
        <div className="flex items-center gap-3">
             <Avatar className="cursor-pointer hover:opacity-80 transition-opacity">
                <AvatarImage src={user?.profile_photo_url} />
                <AvatarFallback>{user?.name?.substring(0, 2).toUpperCase() || "ME"}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
                 <span className="font-semibold text-sm text-gray-900 truncate max-w-[150px]">{user?.name}</span>
                 <span className="text-xs text-muted-foreground capitalize">{user?.role?.replace('_', ' ')}</span>
            </div>
        </div>

        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="rounded-full h-9 w-9">
                    <Plus className="h-5 w-5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleOpenNewGroup}>
                    <Users className="mr-2 h-4 w-4" /> New Group
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Search & Actions */}
      <div className="p-3 border-b bg-white shrink-0 space-y-2">
        <div className="relative flex items-center">
            <div className="absolute left-3 text-gray-400">
                <Search className="h-4 w-4" />
            </div>
            <Input
                placeholder="Search or start new chat"
                className="pl-10 bg-gray-100 border-none focus-visible:ring-0 focus-visible:ring-offset-0 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>
        
            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-9 text-xs gap-1.5"
                    onClick={() => setIsBroadcastOpen(true)}
                >
                    <Send className="h-3.5 w-3.5" />
                    Broadcast
                </Button>
                
                <Button 
                    variant={selectedGroupId === -1 ? "secondary" : "outline"}
                    size="sm" 
                    className="h-9 text-xs gap-1.5 relative"
                    onClick={() => onSelectGroup({ id: -1, name: 'Student Requests', type: 'system' })}
                >
                    <FileText className="h-3.5 w-3.5" />
                    Requests
                    {(pendingRequestsCount + driveRequestsCount) > 0 && (
                        <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full text-[10px] flex items-center justify-center">
                            {pendingRequestsCount + driveRequestsCount}
                        </Badge>
                    )}
                </Button>
            </div>
        </div>

      <ScrollArea className="flex-1 bg-white">
        <div className="flex flex-col">
          {filteredGroups.map((group) => {
            const isUnread = (group.unread_count || 0) > 0;
            return (
                <div
                key={group.id}
                className={cn(
                    "flex items-center gap-3 p-3 px-4 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-50/50",
                    selectedGroupId === group.id && "bg-gray-100 hover:bg-gray-100"
                )}
                onClick={() => onSelectGroup(group)}
                >
                <div className="relative">
                    <Avatar className="h-12 w-12 shrink-0">
                        <AvatarImage src={group.image || `https://api.dicebear.com/7.x/initials/svg?seed=${group.name}`} />
                        <AvatarFallback>{group.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    {group.type === 'direct' && group.other_user_id && onlineUsers.has(String(group.other_user_id)) && (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white"></span>
                    )}
                </div>
                
                <div className="flex-1 overflow-hidden min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                            <span className="font-semibold text-sm text-gray-900 truncate">{group.name}</span>
                            {group.type === 'group' && <Users className="h-3 w-3 text-muted-foreground shrink-0" />}
                            {group.role && (group.role === 'admin' || group.role === 'coordinator' || group.role === 'super_admin') && (
                                <Badge variant="secondary" className="text-[10px] px-1 h-4 rounded-sm shrink-0">
                                    {group.role === 'super_admin' ? 'Admin' : group.role}
                                </Badge>
                            )}
                            {group.role === 'coordinator' && group.branch && (
                                <Badge variant="outline" className="text-[10px] px-1 h-4 rounded-sm border-gray-300 text-gray-500 font-bold shrink-0">
                                    {group.branch}
                                </Badge>
                            )}
                        </div>
                        {group.last_message_at && (
                            <span className={cn("text-[11px] whitespace-nowrap shrink-0 ml-2", isUnread ? "text-primary font-medium" : "text-gray-400")}>
                                {format(new Date(group.last_message_at), 'h:mm a')}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                        <p className={cn("text-sm truncate min-w-0", isUnread ? "text-gray-900 font-medium" : "text-gray-500")}>
                            {group.last_message_type === 'image' ? (
                                <span className="flex items-center gap-1"><span className="text-xs">📷</span> Image</span>
                            ) : group.last_message_type === 'file' ? (
                                <span className="flex items-center gap-1"><span className="text-xs">📄</span> {group.last_message_metadata?.name || "Attachment"}</span>
                            ) : (
                                group.last_message || "No messages yet"
                            )}
                        </p>
                        <div className="flex items-center gap-1.5 shrink-0">
                            {/* Last Seen for Offline DM Users */}
                            {group.type === 'direct' && !onlineUsers.has(String(group.other_user_id)) && group.last_seen && (
                                <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                    {formatRelativeTime(new Date(group.last_seen))}
                                </span>
                            )}
                            {isUnread && (
                                <div className="h-5 min-w-[20px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                                    {group.unread_count}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                </div>
            );
          })}
          {filteredGroups.length === 0 && searchUsers.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No chats found
            </div>
          )}
          
          {/* Suggested Contacts (Only if searching or if list is short) */}
          {(filteredGroups.length < 5 || searchQuery) && searchUsers.length > 0 && (
             <>
                <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider border-y border-gray-100 mt-2">
                    Suggested Contacts
                </div>
                {searchUsers.map(u => (
                    <div
                        key={u.id}
                        className="flex items-center gap-3 p-3 px-4 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-50/50"
                        onClick={() => onSelectUser && onSelectUser(u)}
                    >
                        <div className="relative">
                            <Avatar className="h-10 w-10 shrink-0">
                                <AvatarImage src={u.profile_photo_url} />
                                <AvatarFallback>{u.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            {onlineUsers.has(String(u.id)) && (
                                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white"></span>
                            )}
                        </div>
                        <div className="flex-1 overflow-hidden">
                             <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-900 truncate text-sm">{u.name}</span>
                                <Badge variant="outline" className="text-[10px] px-1 h-4 rounded-sm">{u.role}</Badge>
                                {u.role === 'coordinator' && u.branch && (
                                    <Badge variant="outline" className="text-[10px] px-1 h-4 rounded-sm border-gray-300 text-gray-500 font-bold">
                                        {u.branch}
                                    </Badge>
                                )}
                             </div>
                             <p className="text-xs text-gray-400 truncate">Start a conversation</p>
                        </div>
                    </div>
                ))}
             </>
          )}

        </div>
      </ScrollArea>

      {/* New Group Dialog */}
      <Dialog open={isNewGroupOpen} onOpenChange={setIsNewGroupOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
            <DialogTitle>New Chat / Group</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="flex items-center space-x-2">
                    <div className="grid flex-1 gap-2">
                         <Input 
                            placeholder="Group Name (Optional for 1-on-1)" 
                            value={newGroupName}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewGroupName(e.target.value)}
                         />
                    </div>
                </div>
                <div className="text-sm font-medium">Select Members:</div>
                <ScrollArea className="h-[200px] border rounded-md p-2">
                    {potentialUsers.map(u => (
                        <div key={u.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded-lg">
                            <Checkbox 
                                id={`user-${u.id}`} 
                                checked={selectedUserIds.includes(u.id)}
                                onCheckedChange={() => toggleUserSelection(u.id)}
                            />
                            <label
                                htmlFor={`user-${u.id}`}
                                className="flex-1 flex items-center gap-3 cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={u.profile_photo_url} />
                                    <AvatarFallback>{u.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                    <span>{u.name}</span>
                                    <div className="flex items-center gap-1">
                                        <Badge variant="outline" className="w-fit text-[10px] h-4 mt-0.5">{u.role}</Badge>
                                        {u.role === 'coordinator' && u.branch && (
                                            <Badge variant="outline" className="w-fit text-[10px] h-4 mt-0.5 border-gray-300 text-gray-500 font-bold">
                                                {u.branch}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </label>
                        </div>
                    ))}
                    {potentialUsers.length === 0 && <div className="text-center text-gray-500 p-4">No users found</div>}
                </ScrollArea>
                {selectedUserIds.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                        {selectedUserIds.map(id => {
                            const u = potentialUsers.find(u => u.id === id);
                            return (
                                <Badge key={id} variant="secondary" className="text-xs">
                                    {u?.name} <span className="ml-1 cursor-pointer hover:text-red-500" onClick={() => toggleUserSelection(id)}>×</span>
                                </Badge>
                            )
                        })}
                    </div>
                )}
            </div>
            <DialogFooter className="sm:justify-between">
                <div className="text-xs text-muted-foreground self-center">
                    {selectedUserIds.length} members selected
                </div>
                <Button type="button" onClick={handleCreateGroup} disabled={selectedUserIds.length === 0}>
                    {selectedUserIds.length > 1 ? 'Create Group' : 'Start Chat'}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Broadcast Dialog Enhanced */}
      <Dialog open={isBroadcastOpen} onOpenChange={setIsBroadcastOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>New Broadcast</DialogTitle>
                <div className="text-sm text-muted-foreground">
                    Send mass communications to students.
                </div>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                    {/* Target Group */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Target Audience</label>
                        <Select value={targetGroup} onValueChange={setTargetGroup}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all_students">All Students</SelectItem>
                                <SelectItem value="placed_students">Placed Students</SelectItem>
                                <SelectItem value="unplaced_students">Unplaced Students</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Batch */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Batch</label>
                        <Select value={targetBatch} onValueChange={setTargetBatch}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Batches</SelectItem>
                                <SelectItem value="2021-2025">2021-2025</SelectItem>
                                <SelectItem value="2020-2024">2020-2024</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Department */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Department</label>
                        <Select value={targetDept} onValueChange={setTargetDept}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Departments</SelectItem>
                                <SelectItem value="CSE">CSE</SelectItem>
                                <SelectItem value="IT">IT</SelectItem>
                                <SelectItem value="ECE">ECE</SelectItem>
                                <SelectItem value="EEE">EEE</SelectItem>
                                <SelectItem value="MECH">MECH</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Template */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Template</label>
                        <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Optional" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {templates.map(t => (
                                    <SelectItem key={t.id} value={t.id.toString()}>
                                        [{t.type}] {t.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Specific Roll Nos</label>
                        <Input 
                            placeholder="e.g. 21CS001, 21CS002"
                            value={targetRollNos}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTargetRollNos(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Specific Names</label>
                        <Input 
                            placeholder="e.g. John, Sarah"
                            value={targetNames}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTargetNames(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex gap-4 p-3 bg-gray-50 rounded-lg border">
                    <div className="flex items-center space-x-2">
                        <Checkbox id="check-email" checked={broadcastChannels.includes('email')} 
                            onCheckedChange={(c) => setBroadcastChannels(prev => c ? [...prev, 'email'] : prev.filter(x => x !== 'email'))} 
                        />
                        <label htmlFor="check-email" className="text-sm cursor-pointer">Email</label>
                    </div>
                    <div className="flex items-center space-x-2 opacity-50 cursor-not-allowed">
                        <Checkbox id="check-whatsapp" checked={false} disabled />
                        <label htmlFor="check-whatsapp" className="text-sm cursor-not-allowed">WhatsApp (Coming Soon)</label>
                    </div>
                </div>

                {broadcastChannels.includes('email') && (
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Subject (Email Only)</label>
                        <Input 
                            placeholder="Enter email subject"
                            value={broadcastSubject}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBroadcastSubject(e.target.value)}
                        />
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-sm font-medium">Message</label>
                    <Textarea 
                        className="min-h-[120px]"
                        placeholder="Type your message..."
                        value={broadcastMessage}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBroadcastMessage(e.target.value)}
                    />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsBroadcastOpen(false)}>Cancel</Button>
                <Button onClick={handleSendBroadcast} disabled={broadcastChannels.length === 0 || !broadcastMessage || isBroadcastLoading}>
                    {isBroadcastLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send to {targetGroup.replace('_', ' ')}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
