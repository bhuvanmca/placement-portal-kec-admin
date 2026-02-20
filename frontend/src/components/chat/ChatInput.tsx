import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip, Smile, Mic, X, Play, Pause, Trash2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChatService } from '@/services/chat.service';

// Dynamically import EmojiPicker to avoid SSR issues
const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

import { EMOJIS } from '@/constants/emojis';

interface ChatInputProps {
  onSend: (content: string, type: 'text' | 'image' | 'file' | 'student_card', metadata?: any) => void;
  onTyping?: (isTyping: boolean) => void;
  groupId?: number | null;
}

export default function ChatInput({ onSend, onTyping, groupId }: ChatInputProps) {
  // ... (state declarations remain same)
  const [message, setMessage] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [analyserData, setAnalyserData] = useState<number[]>(new Array(32).fill(3));
  
  // Emoji shortcode state
  const [emojiQuery, setEmojiQuery] = useState('');
  const [showEmojiSuggestions, setShowEmojiSuggestions] = useState(false);
  const [selectedEmojiIndex, setSelectedEmojiIndex] = useState(0);

  // Emoji hover control
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const closeEmojiTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleEmojiMouseEnter = () => {
    if (closeEmojiTimeoutRef.current) {
        clearTimeout(closeEmojiTimeoutRef.current);
        closeEmojiTimeoutRef.current = null;
    }
    setIsEmojiPickerOpen(true);
  };

  const handleEmojiMouseLeave = () => {
    closeEmojiTimeoutRef.current = setTimeout(() => {
        setIsEmojiPickerOpen(false);
    }, 300); // Small delay to allow moving between trigger and content
  };

  // Recording preview state
  const [recordingPreview, setRecordingPreview] = useState<{ blob: Blob; url: string } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number>(0);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Mock students for now - replace with API call
  const students = [
    { id: 1, name: "Harikrishnan N", register_number: "24MCR029", batch_year: 2024, department: "MCA", profile_photo_url: "https://github.com/shadcn.png" },
    { id: 2, name: "Kavin K", register_number: "24MCR030", batch_year: 2024, department: "MCA", profile_photo_url: "" },
    { id: 3, name: "Suresh R", register_number: "24ECR001", batch_year: 2024, department: "ECE", profile_photo_url: "" },
  ];

  // --- Emoji shortcode matching ---
  const emojiSuggestions = useMemo(() => {
    if (!emojiQuery && emojiQuery !== '') return [];
    
    const q = emojiQuery.toLowerCase();
    
    if (q === '') {
        return EMOJIS.slice(0, 10).map(e => ({ ...e, isFirstInCategory: false })); 
    }

    return EMOJIS
        .filter(e => e.shortcode.toLowerCase().includes(q))
        .slice(0, 20)
        .map(e => ({ ...e, isFirstInCategory: false }));

  }, [emojiQuery]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setMessage(val);

    // Typing Indicator Logic
    if (onTyping) {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        onTyping(true);
        typingTimeoutRef.current = setTimeout(() => {
            onTyping(false);
        }, 2000);
    }
    
    const cursorPos = e.target.selectionStart;
    setCursorPosition(cursorPos);

    // Check for :: emoji shortcode
    const textBefore = val.substring(0, cursorPos);
    const colonMatch = textBefore.match(/::([\w]*)$/);
    if (colonMatch) {
      setEmojiQuery(colonMatch[1]);
      setShowEmojiSuggestions(true);
      setSelectedEmojiIndex(0);
      // Don't check for @ if we're in an emoji shortcode
      setShowMentions(false);
      return;
    } else {
      setShowEmojiSuggestions(false);
      setEmojiQuery('');
    }
    
    // Check for @ mention
    const lastAtPos = val.lastIndexOf('@', cursorPos - 1);
    if (lastAtPos !== -1) {
      const query = val.substring(lastAtPos + 1, cursorPos);
      if (!query.includes(' ')) {
        setShowMentions(true);
        setMentionQuery(query);
        return;
      }
    }
    setShowMentions(false);
  };

  const insertEmojiShortcode = (emoji: string) => {
    const textBefore = message.substring(0, cursorPosition);
    const colonPos = textBefore.lastIndexOf('::');
    if (colonPos === -1) return;
    
    const newMessage = message.substring(0, colonPos) + emoji + message.substring(cursorPosition);
    setMessage(newMessage);
    setShowEmojiSuggestions(false);
    setEmojiQuery('');
    
    // Focus back and set cursor after inserted emoji
    setTimeout(() => {
      if (textareaRef.current) {
        const newPos = colonPos + emoji.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  const handleSelectStudent = (student: any) => {
    const lastAtPos = message.lastIndexOf('@', cursorPosition - 1);
    const newMessage = message.substring(0, lastAtPos) + `@${student.register_number} ` + message.substring(cursorPosition);
    setMessage(newMessage);
    setShowMentions(false);
    textareaRef.current?.focus();
  };

  const handleEmojiClick = (emojiData: any) => {
    setMessage((prev) => prev + emojiData.emoji);
  };

  // --- Hover to focus textarea ---
  const handleTextareaHover = () => {
    if (textareaRef.current && document.activeElement !== textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // --- Multi-file upload ---
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const MAX_SIZE = 50 * 1024 * 1024; // 50MB
    const fileArray = Array.from(files);

    for (const file of fileArray) {
      if (file.size > MAX_SIZE) {
        toast.error(`"${file.name}" exceeds 50MB limit`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
    }

    setIsUploading(true);
    let successCount = 0;
    
    for (const file of fileArray) {
      try {
        const result = await ChatService.uploadAttachment(file, groupId ? Number(groupId) : undefined);
        const type = file.type.startsWith('image/') ? 'image' : 'file';
        onSend(result.url, type, { 
          name: file.name, 
          size: file.size, 
          mimeType: file.type 
        });
        successCount++;
      } catch (err: any) {
        console.error(`Upload failed for ${file.name}`, err);
        toast.error(`Failed to upload "${file.name}"`);
      }
    }

    if (successCount > 0 && fileArray.length > 1) {
      toast.success(`${successCount} file${successCount > 1 ? 's' : ''} uploaded`);
    }

    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- Audio recording with smooth waveform ---
  const prevDataRef = useRef<number[]>(new Array(32).fill(2));

  const updateWaveform = useCallback(() => {
    if (!analyserRef.current) return;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const bars = 32;
    const binCount = dataArray.length;
    const binsPerBar = Math.floor(binCount / bars);
    const prev = prevDataRef.current;
    const newData: number[] = [];
    const maxBarHeight = 26; // px, fits within h-7 container
    const minBarHeight = 2;  // px, visible silence floor

    for (let i = 0; i < bars; i++) {
      // Average all frequency bins in this bar's range
      let sum = 0;
      const start = i * binsPerBar;
      const end = Math.min(start + binsPerBar, binCount);
      for (let j = start; j < end; j++) {
        sum += dataArray[j];
      }
      const avg = sum / (end - start);
      
      // Normalize to 0-1, apply power curve for better dynamic range
      const normalized = avg / 255;
      const scaled = Math.pow(normalized, 0.6); // sqrt-ish curve: quiet sounds still visible, loud sounds go big
      const targetHeight = minBarHeight + scaled * (maxBarHeight - minBarHeight);
      
      // Smooth with previous frame (fast attack, slower decay)
      const prevHeight = prev[i] || minBarHeight;
      const smoothed = targetHeight > prevHeight 
        ? prevHeight + (targetHeight - prevHeight) * 0.7  // fast attack
        : prevHeight + (targetHeight - prevHeight) * 0.4; // slower decay
      
      newData.push(Math.max(minBarHeight, smoothed));
    }
    prevDataRef.current = newData;
    setAnalyserData(newData);
    animFrameRef.current = requestAnimationFrame(updateWaveform);
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;  // 256 bins — more frequency resolution
      analyser.smoothingTimeConstant = 0.3; // low = fast response to volume changes
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;
      source.connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      prevDataRef.current = new Array(32).fill(2); // reset smoothing buffer

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        if (audioBlob.size > 50 * 1024 * 1024) {
          toast.error("Audio message too large");
          return;
        }

        // Create preview URL instead of sending immediately
        const previewUrl = URL.createObjectURL(audioBlob);
        setRecordingPreview({ blob: audioBlob, url: previewUrl });
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setRecordingPreview(null);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      animFrameRef.current = requestAnimationFrame(updateWaveform);

    } catch (err) {
      console.error("Failed to start recording", err);
      toast.error("Could not access microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setAnalyserData(new Array(32).fill(3));
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setAnalyserData(new Array(32).fill(3));
    
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    toast.info('Recording cancelled');
  };

  // --- Preview controls ---
  const discardPreview = () => {
    if (recordingPreview) {
      URL.revokeObjectURL(recordingPreview.url);
      setRecordingPreview(null);
    }
    setIsPlaying(false);
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
  };

  const togglePlayPreview = () => {
    if (!recordingPreview) return;

    if (isPlaying && previewAudioRef.current) {
      previewAudioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (!previewAudioRef.current) {
        previewAudioRef.current = new Audio(recordingPreview.url);
        previewAudioRef.current.onended = () => setIsPlaying(false);
      }
      previewAudioRef.current.play();
      setIsPlaying(true);
    }
  };

  const sendRecordingPreview = async () => {
    if (!recordingPreview) return;
    
    const audioFile = new File([recordingPreview.blob], "voice_message.webm", { type: 'audio/webm' });

    setIsUploading(true);
    try {
      const result = await ChatService.uploadAttachment(audioFile, groupId ? Number(groupId) : undefined);
      onSend(result.url, 'file', { 
        name: "Voice Message", 
        size: audioFile.size,
        mimeType: 'audio/webm',
        isVoice: true
      });
      toast.success('Voice message sent');
    } catch (err) {
      console.error("Voice upload failed", err);
      toast.error('Failed to send voice message');
    } finally {
      setIsUploading(false);
      discardPreview();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
      if (recordingPreview) URL.revokeObjectURL(recordingPreview.url);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleSend = () => {
    if (!message.trim()) return;
    if (onTyping) {
        onTyping(false);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }
    onSend(message, 'text');
    setMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Emoji shortcode navigation
    if (showEmojiSuggestions && emojiSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedEmojiIndex(prev => Math.min(prev + 1, emojiSuggestions.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedEmojiIndex(prev => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        insertEmojiShortcode(emojiSuggestions[selectedEmojiIndex].char);
        return;
      }
      if (e.key === 'Escape') {
        setShowEmojiSuggestions(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // --- CSS keyframes for smooth waveform ---
  const waveformStyles = `
    @keyframes waveGlow {
      0%, 100% { opacity: 0.7; }
      50% { opacity: 1; }
    }
    .wave-bar {
      transition: height 120ms cubic-bezier(0.4, 0, 0.2, 1);
      will-change: height;
    }
    .recording-dot {
      animation: recordPulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    @keyframes recordPulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.85); }
    }
  `;

  // ============================================================
  // RECORDING PREVIEW UI — after recording, before sending
  // ============================================================
  if (recordingPreview) {
    return (
      <div className="p-3 bg-white border-t">
        <style>{waveformStyles}</style>
        <div className="flex items-center gap-3 max-w-3xl mx-auto w-full pb-4">
          {/* Discard */}
          <Button 
            onClick={discardPreview}
            size="icon"
            variant="ghost"
            className="shrink-0 h-10 w-10 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="h-4.5 w-4.5" />
          </Button>

          {/* Preview player */}
          <div className="flex-1 flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-2.5 border border-gray-100">
            {/* Play/Pause */}
            <button 
              onClick={togglePlayPreview}
              className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors shrink-0"
            >
              {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
            </button>
            
            {/* Audio waveform placeholder (static bars for preview) */}
            <div className="flex items-center gap-[2px] flex-1 h-7">
              {Array.from({ length: 32 }, (_, i) => {
                const h = 4 + Math.sin(i * 0.5) * 8 + Math.random() * 6;
                return (
                  <div
                    key={i}
                    className="bg-primary/40 rounded-full"
                    style={{ width: '2.5px', height: `${h}px`, flexShrink: 0 }}
                  />
                );
              })}
            </div>
            
            <span className="text-xs font-mono text-gray-500 shrink-0">{formatTime(recordingTime)}</span>
          </div>

          {/* Send */}
          <Button 
            onClick={sendRecordingPreview}
            size="icon"
            className="shrink-0 h-11 w-11 rounded-full shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground transition-all"
            disabled={isUploading}
          >
            {isUploading ? (
              <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    );
  }

  // ============================================================
  // RECORDING UI — while actively recording
  // ============================================================
  if (isRecording) {
    return (
      <div className="p-3 bg-white border-t">
        <style>{waveformStyles}</style>
        <div className="flex items-center gap-3 max-w-3xl mx-auto w-full pb-4">
          {/* Cancel */}
          <Button 
            onClick={cancelRecording}
            size="icon"
            variant="ghost"
            className="shrink-0 h-10 w-10 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Waveform + timer */}
          <div className="flex-1 flex items-center gap-3 bg-red-50/60 rounded-2xl px-4 py-2.5 border border-red-100/50 backdrop-blur-sm">
            {/* Pulsing red dot */}
            <div className="recording-dot h-2 w-2 rounded-full bg-red-500 shrink-0" />
            
            {/* Timer */}
            <span className="text-sm font-mono text-red-500 shrink-0 w-10 tabular-nums">{formatTime(recordingTime)}</span>
            
            {/* Animated recording label */}
            <span className="text-sm text-red-400 truncate">recording<span style={{ display: 'inline-block', width: '1.2em', textAlign: 'left' }} className="animate-recording-dots" /></span>
            <style>{`
              @keyframes recordingDots {
                0%, 20% { content: '.'; }
                40% { content: '..'; }
                60%, 100% { content: '...'; }
              }
              .animate-recording-dots::after {
                content: '.';
                animation: recordingDots 1.4s infinite steps(1);
              }
            `}</style>
          </div>

          {/* Stop — goes to preview */}
          <Button 
            onClick={stopRecording}
            size="icon"
            className="shrink-0 h-11 w-11 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-sm transition-all"
          >
            <div className="h-3.5 w-3.5 rounded-sm bg-white" />
          </Button>
        </div>
      </div>
    );
  }

  // ============================================================
  // DEFAULT INPUT UI
  // ============================================================
  return (
    <div className="p-3 bg-white border-t">
      <div className="flex items-end gap-2 max-w-3xl mx-auto w-full relative pb-4">
        {/* @ Mentions popover */}
        <Popover open={showMentions} onOpenChange={setShowMentions}>
            <PopoverTrigger asChild>
                <div className="absolute left-0 bottom-full w-full mb-2" />
            </PopoverTrigger>
            <PopoverContent className="p-0 w-64" side="top" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                <Command>
                    <CommandInput placeholder="Search student..." value={mentionQuery} onValueChange={setMentionQuery} />
                    <CommandList>
                        <CommandEmpty>No student found.</CommandEmpty>
                        <CommandGroup heading="Students">
                            {students.map((student) => (
                                <CommandItem key={student.id} onSelect={() => handleSelectStudent(student)} className="flex items-center gap-2 cursor-pointer">
                                    <Avatar className="h-6 w-6">
                                        <AvatarImage src={student.profile_photo_url} />
                                        <AvatarFallback>{student.name.substring(0, 2)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium">{student.name}</span>
                                        <span className="text-xs text-muted-foreground">{student.register_number}</span>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>

        {/* Emoji shortcode suggestions popup */}
        {showEmojiSuggestions && emojiSuggestions.length > 0 && (
          <div className="absolute left-0 bottom-full w-72 mb-2 z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 max-h-80 overflow-auto scrollbar-thin scrollbar-thumb-gray-200">
            {emojiSuggestions.map((emoji, idx) => (
              <div key={`${emoji.shortcode}-${idx}`}>
                <button
                  onClick={() => insertEmojiShortcode(emoji.char)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
                    idx === selectedEmojiIndex ? 'bg-primary/10 text-primary' : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <span className="text-xl">{emoji.char}</span>
                  <span className="font-mono text-xs text-gray-400">::{emoji.shortcode}</span>
                </button>
              </div>
            ))}
          </div>
        )}





        {/* Emoji Picker — Hover to open via Popover */}
        <Popover open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen}>
          <PopoverTrigger asChild>
            <Button 
                size="icon" 
                variant="ghost" 
                className="text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full h-10 w-10 shrink-0"
                onMouseEnter={handleEmojiMouseEnter}
                onMouseLeave={handleEmojiMouseLeave}
            >
              <Smile className="h-6 w-6" />
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="p-0 border-none bg-transparent shadow-none w-auto" 
            side="top" 
            align="start"
            onMouseEnter={handleEmojiMouseEnter}
            onMouseLeave={handleEmojiMouseLeave}
          >
            <EmojiPicker 
              onEmojiClick={handleEmojiClick} 
              skinTonesDisabled={true}
              searchDisabled={false}
              autoFocusSearch={true}
            />
          </PopoverContent>
        </Popover>

        {/* File Upload — multi-select */}
        <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileSelect}
            multiple
        />
        <Button 
            size="icon" 
            variant="ghost" 
            onClick={() => fileInputRef.current?.click()}
            className="text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full h-10 w-10 shrink-0"
            disabled={isUploading}
        >
            {isUploading ? (
              <span className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
            ) : (
              <Paperclip className="h-5 w-5" />
            )}
        </Button>
        
        {/* Message input — hover to focus */}
        <div 
          className="flex-1 bg-gray-100 dark:bg-zinc-800 rounded-2xl border-transparent focus-within:border-gray-200 focus-within:bg-white focus-within:ring-1 focus-within:ring-ring transition-all"
          onMouseEnter={handleTextareaHover}
        >
            <Textarea
                ref={textareaRef}
                value={message}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type a message"
                className="min-h-[44px] max-h-[120px] w-full resize-none border-none focus-visible:ring-0 focus-visible:ring-offset-0 py-3 px-4 bg-transparent"
                rows={1}
            />
        </div>
        
        {/* Send / Mic */}
        {message.trim() ? (
            <Button 
                onClick={handleSend} 
                size="icon"
                className="shrink-0 h-11 w-11 rounded-full shadow-sm transition-all bg-primary hover:bg-primary/90 text-primary-foreground"
            >
                <Send className="h-5 w-5" />
            </Button>
        ) : (
            <Button 
                onClick={startRecording}
                size="icon"
                className="shrink-0 h-11 w-11 rounded-full shadow-sm transition-all bg-muted text-muted-foreground hover:bg-muted/80"
                disabled={isUploading}
            >
                <Mic className="h-5 w-5" />
            </Button>
        )}
      </div>
    </div>
  );
}
