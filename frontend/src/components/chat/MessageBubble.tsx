import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Check, CheckCheck } from 'lucide-react';

interface Message {
  id: number;
  sender_id: number;
  sender_name?: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'student_card';
  created_at: string;
  metadata?: any;
}

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
}

export function MessageBubble({ message, isCurrentUser }: MessageBubbleProps) {
  if (message.type === 'student_card') {
    const student = message.metadata?.student || {};
    return (
      <div className={cn("flex w-full mt-2 space-x-3 max-w-md", isCurrentUser ? "ml-auto justify-end" : "")}>
        {!isCurrentUser && (
            <Avatar className="h-8 w-8">
                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${message.sender_name}`} />
                <AvatarFallback>{message.sender_name?.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
        )}
        <Card className={cn("w-full max-w-xs overflow-hidden", isCurrentUser ? "bg-primary text-primary-foreground rounded-none" : "bg-card")}>
            <CardHeader className="p-3 bg-muted/20">
                <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10 border-2 border-white">
                        <AvatarImage src={student.profile_photo_url} />
                        <AvatarFallback>{student.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                        <CardTitle className="text-sm font-semibold">{student.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{student.register_number}</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-3 text-sm">
                <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                        <span className="font-semibold block">Batch:</span>
                        {student.batch_year}
                    </div>
                    <div>
                        <span className="font-semibold block">Dept:</span>
                        {student.department}
                    </div>
                </div>
                <div className="mt-2 text-xs text-right opacity-70">
                    {format(new Date(message.created_at), 'h:mm a')}
                </div>
            </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("flex w-full mt-2 space-x-3 max-w-md mb-2", isCurrentUser ? "ml-auto justify-end" : "")}>
        {!isCurrentUser && (
            <Avatar className="h-8 w-8 mt-1">
                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${message.sender_name}`} />
                <AvatarFallback>{message.sender_name?.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
        )}
      <div
        className={cn(
          "p-2 px-3 rounded-lg text-sm shadow-sm relative group min-w-[120px]",
          isCurrentUser ? "bg-[#d9fdd3] text-gray-900 rounded-tr-none" : "bg-white text-gray-900 rounded-tl-none"
        )}
      >
        <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>
        <div className="flex items-center justify-end gap-1 mt-1 select-none">
            <span className="text-[10px] text-gray-500">
                {format(new Date(message.created_at), 'h:mm a')}
            </span>
            {isCurrentUser && (
                <CheckCheck className="h-3 w-3 text-blue-500" />
            )}
        </div>
        
        {/* Hover arrow effect (optional, skipped for simplicity) */}
      </div>
    </div>
  );
}
