'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  MessageSquare, 
  Lightbulb, 
  X, 
  Maximize2, 
  Minimize2, 
  Search, 
  FileText, 
  Monitor,
  Send,
  BrainCircuit,
  StickyNote,
  Loader2,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function Home() {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [isBrainstormMode, setIsBrainstormMode] = useState(false);
  const [isLocalMode, setIsLocalMode] = useState(process.env.NEXT_PUBLIC_USE_OLLAMA === 'true');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: 'Hello! I am your AI brain. How can I help you today?' }
  ]);
  const [notes, setNotes] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleVoiceInput(audioBlob);
      };

      mediaRecorder.start();
      setIsListening(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleSendMessage = async (e?: React.FormEvent, textOverride?: string) => {
    e?.preventDefault();
    const text = textOverride || inputValue;
    if (!text.trim()) return;

    const newUserMessage = { role: 'user' as const, content: text };
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setInputValue('');
    setIsProcessing(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: updatedMessages, 
          isBrainstormMode 
        }),
      });

      const { content, ideas, error } = await response.json();
      if (error) throw new Error(error);

      const assistantMsg = { role: 'assistant' as const, content };
      setMessages(prev => [...prev, assistantMsg]);

      if (ideas && ideas.length > 0) {
        setNotes(prev => [...prev, ...ideas]);
      }

      // Speak the response
      await speakText(content);

    } catch (err) {
      console.error("Chat processing error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVoiceInput = async (blob: Blob) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', blob, 'audio.webm');

      const sttResponse = await fetch('/api/voice/stt', {
        method: 'POST',
        body: formData,
      });
      const { text, error: sttError } = await sttResponse.json();
      
      if (sttError) throw new Error(sttError);
      if (!text) return;

      // Use the unified chat handler
      await handleSendMessage(undefined, text);

    } catch (err) {
      console.error("Voice processing error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const speakText = async (text: string) => {
    try {
      const response = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      await audio.play();
    } catch (err) {
      console.error("TTS error:", err);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const toggleOverlay = () => setIsOverlayOpen(!isOverlayOpen);
  const toggleBrainstorm = () => setIsBrainstormMode(!isBrainstormMode);

  const toggleLocalMode = () => {
    setIsLocalMode(!isLocalMode);
    // In a real app, you might want to persist this or update a global state
  };

  const captureScreen = async () => {
    setIsAnalyzing(true);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      
      const image = canvas.toDataURL('image/png');
      stream.getTracks().forEach(track => track.stop());

      const response = await fetch('/api/analyze/screen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image }),
      });

      const { summary, error } = await response.json();
      if (error) throw new Error(error);

      // Send the summary to the chat context
      await handleSendMessage(undefined, `I've just captured my screen. Here is what's on it: ${summary}. Can you help me with this?`);

    } catch (err) {
      console.error("Screen capture error:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    try {
      const text = await file.text();
      const response = await fetch('/api/analyze/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, content: text, mode: 'summary' }),
      });

      const { result, error } = await response.json();
      if (error) throw new Error(error);

      // Send the file summary to the chat context
      await handleSendMessage(undefined, `I've uploaded a file named "${file.name}". Summary: ${result}. Please explain it further if needed.`);

    } catch (err) {
      console.error("File upload error:", err);
    } finally {
      setIsAnalyzing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-transparent font-sans text-slate-900 overflow-hidden">
      {/* Main Voice Interaction Hub (Floating Bubble) */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-4">
        <AnimatePresence>
          {(isListening || isProcessing || isAnalyzing) && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-full border border-slate-200 shadow-lg text-sm font-medium text-slate-600 flex items-center gap-2"
            >
              {isProcessing || isAnalyzing ? (
                <>
                  <Loader2 size={16} className="animate-spin text-indigo-600" />
                  {isAnalyzing ? "Analyzing..." : "Processing..."}
                </>
              ) : (
                "Listening..."
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-4">
          <button
            onClick={toggleLocalMode}
            className={cn(
              "p-3 rounded-full transition-all duration-300 shadow-md text-xs font-bold",
              isLocalMode ? "bg-green-500 text-white" : "bg-white text-slate-400 hover:bg-slate-50"
            )}
            title={isLocalMode ? "Using Local Ollama" : "Using OpenAI Cloud"}
          >
            {isLocalMode ? "LOCAL" : "CLOUD"}
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-3 bg-white text-slate-600 rounded-full shadow-md hover:bg-slate-50 transition-all"
            title="Upload File"
          >
            <Upload size={24} />
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
              accept=".txt,.md,.js,.ts,.tsx,.json"
            />
          </button>

          <button
            onClick={captureScreen}
            className="p-3 bg-white text-slate-600 rounded-full shadow-md hover:bg-slate-50 transition-all"
            title="Read Screen"
          >
            <Monitor size={24} />
          </button>

          <button
            onClick={toggleBrainstorm}
            className={cn(
              "p-3 rounded-full transition-all duration-300 shadow-md",
              isBrainstormMode ? "bg-amber-500 text-white scale-110" : "bg-white text-slate-600 hover:bg-slate-50"
            )}
            title="Brainstorm Mode"
          >
            <BrainCircuit size={24} />
          </button>

          <button
            onClick={toggleListening}
            className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl relative overflow-hidden",
              isListening ? "bg-red-500 scale-110" : "bg-indigo-600 hover:bg-indigo-700"
            )}
          >
            {isListening && (
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0.2, 0.5] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute inset-0 bg-white rounded-full"
              />
            )}
            {isListening ? <MicOff size={32} className="text-white relative z-10" /> : <Mic size={32} className="text-white relative z-10" />}
          </button>

          <button
            onClick={toggleOverlay}
            className={cn(
              "p-3 rounded-full transition-all duration-300 shadow-md",
              isOverlayOpen ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
            )}
            title="Toggle Chat Overlay"
          >
            <MessageSquare size={24} />
          </button>
        </div>
      </div>

      {/* Side Chat Overlay */}
      <AnimatePresence>
        {isOverlayOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-96 bg-white/90 backdrop-blur-xl border-l border-slate-200 shadow-2xl z-40 flex flex-col"
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <h2 className="font-semibold">AI Assistant</h2>
              </div>
              <button onClick={toggleOverlay} className="hover:bg-white/20 p-1 rounded">
                <X size={20} />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[85%] p-3 rounded-2xl text-sm shadow-sm",
                    msg.role === 'user' 
                      ? "bg-indigo-600 text-white rounded-tr-none" 
                      : "bg-slate-100 text-slate-800 rounded-tl-none"
                  )}>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 bg-slate-50">
              <div className="relative">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Type a message..."
                  className="w-full pl-4 pr-12 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                />
                <button 
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  <Send size={18} />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Brainstorming Notepad (Left Side) */}
      <AnimatePresence>
        {isBrainstormMode && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            className="fixed top-10 left-10 w-80 max-h-[70vh] bg-amber-50 border border-amber-200 shadow-xl rounded-lg z-30 flex flex-col rotate-[-1deg]"
          >
            <div className="p-3 border-b border-amber-200 flex items-center gap-2 text-amber-800 font-bold">
              <StickyNote size={18} />
              <span>Brainstorming Notes</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {notes.length === 0 ? (
                <p className="text-amber-600/60 italic text-sm">Ideas will appear here as we talk...</p>
              ) : (
                notes.map((note, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={i} 
                    className="p-2 bg-white/50 border-b border-amber-100 text-sm text-amber-900"
                  >
                    • {note}
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Actions / Status Bar */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 flex items-center gap-6 px-6 py-3 bg-white/40 backdrop-blur-md rounded-full border border-white/20 shadow-sm">
        <div className="flex items-center gap-2 text-slate-600 text-xs font-medium uppercase tracking-wider">
          <Monitor size={14} />
          <span>Screen Reading: Active</span>
        </div>
        <div className="w-px h-4 bg-slate-300" />
        <div className="flex items-center gap-2 text-slate-600 text-xs font-medium uppercase tracking-wider">
          <FileText size={14} />
          <span>Drive Access: Ready</span>
        </div>
      </div>
    </div>
  );
}
