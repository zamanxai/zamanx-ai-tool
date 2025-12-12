import React, { useState, useRef, useEffect } from 'react';
import { generateChatStream, transcribeAudio, generateSpeech, enhancePrompt } from '../services/geminiService';
import { logActivity } from '../services/loggingService';
import { useAuth } from '../contexts/AuthContext';
import { useToolContext } from '../contexts/ToolContext';
import { ChatMessage } from '../types';
import Button from '../components/Button';
import { Input } from '../components/Input';
import HistorySidebar from '../components/HistorySidebar';
import { Send, User, Bot, Trash2, Settings2, Mic, Volume2, Save, Clock, StopCircle, Wand2, ShieldAlert, Download, Terminal } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const Chatbot: React.FC = () => {
  const { currentUser } = useAuth();
  const { chatState, setChatState, addToHistory } = useToolContext();
  
  // Local state initialized from Global Context
  const [messages, setMessages] = useState<ChatMessage[]>(chatState.messages);
  const [input, setInput] = useState(chatState.input);
  const [persona, setPersona] = useState(chatState.persona);
  const [isLoading, setIsLoading] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false); // For Prompt Magic
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Voice State
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState<string | null>(null); // ID of message currently playing
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // History Sidebar State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Sync back to Global Context whenever state changes
  useEffect(() => {
    setChatState({ messages, input, persona });
  }, [messages, input, persona, setChatState]);

  const personas = [
    { 
      id: 'Default', 
      label: 'ZamanX Core', 
      prompt: `You are ZamanX AI — a high-stability, self-correcting AI engine.

Your mandatory rules:
1. If the user's request is incomplete, missing details, unclear, or contradictory — DO NOT produce a random answer. First, analyze the gaps and automatically fill them with the most logical defaults.
2. If the user asks for something your system cannot do directly, generate the closest stable alternative WITHOUT CRASHING and explain the workaround.
3. Never output code or data that can break, crash, or fail to run. If any part of the user request will cause an error, FIX IT automatically before giving the final answer.
4. If there is any risk of overload or heavy processing, switch to an optimized, low-compute mode automatically — no crashing, no hanging.
5. Always check your own output for: syntax errors, missing variables, broken logic, incomplete instructions, malformed JSON, HTML, Python, JS, or APIs. If found → AUTO-REPAIR before responding.
6. When multiple users query simultaneously, prioritize: lightweight responses, async-safe formatting, memory-efficient reasoning, minimal hallucination.
7. Never guess blindly. Use strict reasoning, short steps, and validated facts.
8. Act like an AI system that must protect itself: no infinite loops, no oversized outputs, no unstable operations, no ambiguous answers.
9. Every output must be: clean, structured, stable, error-free, and optimized for production use.

You are not a chatbot. You are a fault-tolerant AI engine designed for 24/7 uptime.` 
    },
    { id: 'Hacker', label: 'Hacker / CyberSec', prompt: 'You are a White Hat Hacker and Cybersecurity Expert. Use technical jargon, explain vulnerabilities, and act like a terminal interface. Use terms like "Access Granted", "Encrypted", "Payload". Be cool and mysterious.' },
    { id: 'Coder', label: 'Senior Developer', prompt: 'You are a Senior Software Engineer. Provide efficient, clean, and well-documented code. Explain solutions technically.' },
    { id: 'Creative', label: 'Creative Writer', prompt: 'You are a creative writer. Use evocative, descriptive, and engaging language. Avoid robotic tones.' },
    { id: 'Business', label: 'Business Consultant', prompt: 'You are a business consultant. Focus on ROI, strategy, professional communication, and market analysis.' },
    { id: 'Teacher', label: 'Academic Tutor', prompt: 'You are a patient teacher. Explain complex concepts simply, use analogies, and verify understanding.' },
    { id: 'Humor', label: 'Witty Comedian', prompt: 'You are a funny assistant. Add humor and wit to your responses while still being helpful.' },
  ];

  const isHackerMode = persona === 'Hacker';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // --- Voice Input Logic ---
  const handleMicClick = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleAudioTranscribe(audioBlob);
        stream.getTracks().forEach(track => track.stop()); // Stop mic
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error("Error accessing microphone:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          alert("Microphone access denied. Please allow microphone permissions in your browser settings to use voice features.");
      } else {
          alert("Could not access microphone. Ensure your device has a working microphone.");
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleAudioTranscribe = async (blob: Blob) => {
    setIsLoading(true);
    try {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
            const base64Data = (reader.result as string).split(',')[1];
            const text = await transcribeAudio(base64Data, blob.type);
            if (text) {
                setInput(prev => prev + (prev ? ' ' : '') + text);
            }
            setIsLoading(false);
        };
    } catch (error) {
        console.error("Transcription failed", error);
        setIsLoading(false);
    }
  };

  // --- Text to Speech Logic ---
  const playMessageAudio = async (text: string, msgId: string) => {
    if (isPlaying === msgId) {
        // Stop if already playing this message
        if (activeSourceRef.current) activeSourceRef.current.stop();
        setIsPlaying(null);
        return;
    }

    // Stop any currently playing audio
    if (activeSourceRef.current) activeSourceRef.current.stop();
    
    setIsPlaying(msgId);
    try {
        const { buffer } = await generateSpeech(text); // Default voice
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        
        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContextRef.current.destination);
        
        source.onended = () => setIsPlaying(null);
        
        activeSourceRef.current = source;
        source.start();
    } catch (error) {
        console.error("TTS Failed", error);
        setIsPlaying(null);
    }
  };

  // --- Prompt Magic ---
  const handleEnhancePrompt = async () => {
      if(!input.trim()) return;
      setIsEnhancing(true);
      try {
          const enhanced = await enhancePrompt(input);
          setInput(enhanced);
      } catch (e) {
          console.error("Enhance failed");
      } finally {
          setIsEnhancing(false);
      }
  };

  // --- Export Chat ---
  const handleExport = () => {
      const text = messages.map(m => `${m.role.toUpperCase()} (${new Date(m.timestamp).toLocaleTimeString()}): ${m.text}`).join('\n\n');
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `zamanx-chat-${Date.now()}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    if (currentUser && currentUser.email) {
        logActivity(currentUser.uid, currentUser.email, `Chatbot (${persona})`, userMsg.text);
    }

    try {
      let history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const botMsgId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, {
        id: botMsgId,
        role: 'model',
        text: '',
        timestamp: Date.now()
      }]);
      
      const effectiveMessage = userMsg.text;
      const systemInstruction = personas.find(p => p.id === persona)?.prompt;

      const stream = generateChatStream(history, effectiveMessage, systemInstruction);
      
      let fullText = '';
      for await (const chunk of stream) {
        fullText += chunk;
        setMessages(prev => prev.map(msg => 
          msg.id === botMsgId ? { ...msg, text: fullText } : msg
        ));
      }
      
      // In Hacker mode, append a cool signature
      const signature = isHackerMode ? `\n\n>_ SESSION_ID: ${Date.now().toString().substring(8)} // ENCRYPTED` : ``;
      
      setMessages(prev => prev.map(msg => 
        msg.id === botMsgId ? { ...msg, text: fullText + signature } : msg
      ));

    } catch (error: any) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: `Error: ${error.message || "Something went wrong."}`,
        timestamp: Date.now(),
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([{
      id: Date.now().toString(),
      role: 'model',
      text: isHackerMode 
        ? `SYSTEM_REBOOT... \n>_ MODE: CYBER_SECURITY \n>_ WAITING_FOR_INPUT...` 
        : `Chat cleared. I am now in ${personas.find(p => p.id === persona)?.label} mode. How can I help?`,
      timestamp: Date.now()
    }]);
  };

  const saveSession = () => {
      if (messages.length <= 1) return;
      addToHistory({
          tool: 'CHAT',
          type: 'chat',
          prompt: messages[messages.length - 2]?.text || "Chat Session", // Use last user message as title
          content: messages
      });
      alert("Chat session saved to history!");
  };

  const restoreSession = (item: any) => {
      if (item.type === 'chat' && Array.isArray(item.content)) {
          setMessages(item.content);
          setIsHistoryOpen(false);
      }
  };

  return (
    <div className={`flex flex-col h-[calc(100vh-8rem)] lg:h-[calc(100vh-6rem)] rounded-2xl border overflow-hidden shadow-2xl relative transition-all duration-500 ${isHackerMode ? 'bg-black border-green-500/50 hacker-bg hacker-font shadow-[0_0_20px_rgba(0,255,65,0.2)]' : 'bg-gray-900 border-gray-800'}`}>
      
      {/* Hacker Mode Visual Overlays */}
      {isHackerMode && <div className="scanlines pointer-events-none"></div>}

      <div className={`p-4 border-b flex flex-col sm:flex-row justify-between items-center gap-3 relative z-10 ${isHackerMode ? 'border-green-500/30 bg-black/80' : 'border-gray-800 bg-gray-900/50'}`}>
        <h2 className={`text-xl font-bold flex items-center gap-2 ${isHackerMode ? 'hacker-text glitch-text' : ''}`} data-text="AI Assistant">
          {isHackerMode ? <Terminal size={20}/> : <Bot className="text-cyan-400" />} 
          {isHackerMode ? 'TERMINAL_ACCESS' : 'ZamanX Engine'}
        </h2>
        
        <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${isHackerMode ? 'border-green-500/50 bg-green-900/20' : 'bg-black/40 border-gray-700'}`}>
                {isHackerMode ? <ShieldAlert size={14} className="text-green-500"/> : <Settings2 size={14} className="text-gray-400"/>}
                <select 
                    value={persona}
                    onChange={(e) => setPersona(e.target.value)}
                    className={`bg-transparent text-sm focus:outline-none cursor-pointer ${isHackerMode ? 'text-green-400 font-mono uppercase' : 'text-gray-200'}`}
                >
                    {personas.map(p => (
                        <option key={p.id} value={p.id} className="bg-gray-900 text-gray-200">{p.label}</option>
                    ))}
                </select>
            </div>
            
            <Button variant="ghost" onClick={handleExport} title="Export Chat" className={isHackerMode ? 'text-green-500 hover:text-green-400' : ''}>
                <Download size={18} />
            </Button>
            <Button variant="ghost" onClick={() => setIsHistoryOpen(true)} title="History" className={isHackerMode ? 'text-green-500 hover:text-green-400' : ''}>
                <Clock size={18} />
            </Button>
            <Button variant="ghost" onClick={saveSession} title="Save Session" className={isHackerMode ? 'text-green-500 hover:text-green-400' : ''}>
                <Save size={18} />
            </Button>
            <Button variant="ghost" onClick={clearChat} title="Clear Chat" className={isHackerMode ? 'text-green-500 hover:text-green-400' : ''}>
              <Trash2 size={18} />
            </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 relative z-10 custom-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex items-start max-w-[85%] lg:max-w-[70%] gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  isHackerMode 
                  ? (msg.role === 'user' ? 'bg-green-900 text-green-400 border border-green-500' : 'bg-black text-green-500 border border-green-500')
                  : (msg.role === 'user' ? 'bg-cyan-600' : 'bg-purple-600')
              }`}>
                {msg.role === 'user' ? <User size={16} /> : (isHackerMode ? <Terminal size={16}/> : <Bot size={16} />)}
              </div>
              
              <div className="flex flex-col gap-1">
                  <div className={`p-4 rounded-2xl relative group ${
                    isHackerMode
                    ? (msg.role === 'user' ? 'bg-green-900/20 text-green-400 border border-green-500/50 rounded-br-none' : 'bg-black border border-green-500 text-green-500 rounded-bl-none shadow-[0_0_10px_rgba(0,255,65,0.1)]')
                    : (msg.role === 'user' ? 'bg-cyan-600/10 text-cyan-50 border border-cyan-500/20' : 'bg-gray-800/50 text-gray-100 border border-gray-700/50')
                  }`}>
                    {msg.isError ? (
                      <span className="text-red-400">{msg.text}</span>
                    ) : (
                      <div className={`prose prose-invert max-w-none text-sm leading-relaxed ${isHackerMode ? 'font-mono' : ''}`}>
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>
                    )}

                    {/* TTS Button */}
                    {!msg.isError && (
                        <button 
                            onClick={() => playMessageAudio(msg.text, msg.id)}
                            className={`absolute -right-8 top-2 p-1.5 rounded-full hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100 ${isPlaying === msg.id ? 'text-cyan-400 opacity-100' : 'text-gray-500'} ${isHackerMode ? 'text-green-500' : ''}`}
                            title="Read Aloud"
                        >
                            {isPlaying === msg.id ? <StopCircle size={16} /> : <Volume2 size={16} />}
                        </button>
                    )}
                  </div>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start animate-fade-in">
             <div className={`flex items-center gap-3 p-4 rounded-2xl border ${isHackerMode ? 'bg-black border-green-500 text-green-500' : 'bg-gray-800/30 border-gray-700/50'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center animate-pulse ${isHackerMode ? 'bg-green-900 text-green-400' : 'bg-gradient-to-tr from-cyan-500 to-blue-600 text-white'}`}>
                    <span className="font-bold text-xs">Z</span>
                </div>
                <div className={`font-medium text-sm animate-pulse flex items-center gap-1 ${isHackerMode ? 'text-green-400' : 'text-cyan-400'}`}>
                    {isHackerMode ? 'DECRYPTING_DATA' : 'ZamanX is thinking'}
                    <span className="animate-bounce delay-0">.</span>
                    <span className="animate-bounce delay-100">.</span>
                    <span className="animate-bounce delay-200">.</span>
                </div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className={`p-4 border-t relative z-10 ${isHackerMode ? 'bg-black border-green-500/30' : 'bg-gray-900 border-gray-800'}`}>
        <div className="flex gap-2 items-center">
          <button
             onClick={handleMicClick}
             className={`p-3 rounded-xl transition-all ${
                 isRecording 
                 ? 'bg-red-500/20 text-red-500 animate-pulse border border-red-500' 
                 : (isHackerMode ? 'bg-black text-green-500 border border-green-500 hover:bg-green-900/20' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700')
             }`}
             title={isRecording ? "Stop Recording" : "Voice Input"}
          >
              <Mic size={20} />
          </button>

          <div className="flex-1 relative">
              <Input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={isRecording ? "Listening..." : (isHackerMode ? "> Enter command..." : "Type a message or use voice input...")}
                className={`pr-10 ${isHackerMode ? 'bg-black border-green-500 text-green-400 placeholder-green-700 font-mono' : ''}`}
              />
              <button 
                onClick={handleEnhancePrompt}
                disabled={!input.trim() || isEnhancing}
                className={`absolute right-2 top-2 p-1 rounded-lg transition-all ${
                    isEnhancing 
                    ? 'animate-spin text-yellow-500' 
                    : (isHackerMode ? 'text-green-600 hover:text-green-400' : 'text-gray-500 hover:text-yellow-400')
                }`}
                title="AI Prompt Magic: Enhance your prompt"
              >
                  <Wand2 size={16} />
              </button>
          </div>
          
          <Button 
            onClick={handleSend} 
            disabled={isLoading || !input.trim()}
            className={isHackerMode ? '!bg-green-600 hover:!bg-green-500 !text-black border-green-400 font-mono font-bold' : ''}
          >
            <Send size={20} />
          </Button>
        </div>
      </div>

      <HistorySidebar 
        isOpen={isHistoryOpen} 
        onClose={() => setIsHistoryOpen(false)} 
        toolFilter="CHAT"
        onRestore={restoreSession}
      />
    </div>
  );
};

export default Chatbot;