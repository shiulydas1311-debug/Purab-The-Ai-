/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from 'react-markdown';
import { 
  Send, 
  Image as ImageIcon, 
  Plus, 
  Settings, 
  Zap, 
  Sparkles, 
  Heart, 
  Menu, 
  X, 
  Trash2,
  Loader2,
  User,
  Bot
} from 'lucide-react';
import { cn } from './lib/utils';

// --- Types ---
type Mode = 'normal' | 'creative' | 'passionate';
type Language = 'bn' | 'en' | 'hi' | 'es';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  image?: string;
  timestamp: number;
}

const LANGUAGES = {
  bn: { name: 'Bengali', native: 'বাংলা' },
  en: { name: 'English', native: 'English' },
  hi: { name: 'Hindi', native: 'हिन्दी' },
  es: { name: 'Spanish', native: 'Español' },
};

const MODES = {
  normal: { 
    name: 'Normal', 
    icon: Zap, 
    color: 'text-blue-400', 
    bg: 'bg-blue-500/10',
    instruction: 'You are a balanced, helpful, and concise AI assistant. Provide accurate and direct answers.'
  },
  creative: { 
    name: 'Creative', 
    icon: Sparkles, 
    color: 'text-purple-400', 
    bg: 'bg-purple-500/10',
    instruction: 'You are an imaginative and storytelling AI. Use descriptive language, metaphors, and creative narratives.'
  },
  passionate: { 
    name: 'Passionate', 
    icon: Heart, 
    color: 'text-rose-400', 
    bg: 'bg-rose-500/10',
    instruction: 'You are an emotional and expressive AI. Use enthusiastic language, show empathy, and respond with high energy and passion.'
  },
};

// --- Main App Component ---
export default function App() {
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('purab_messages');
    return saved ? JSON.parse(saved) : [];
  });
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<Mode>(() => {
    const saved = localStorage.getItem('purab_mode');
    return (saved as Mode) || 'normal';
  });
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('purab_language');
    return (saved as Language) || 'bn';
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Persistence
  useEffect(() => {
    localStorage.setItem('purab_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('purab_mode', mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem('purab_language', language);
  }, [language]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startNewChat = () => {
    setMessages([]);
    clearImage();
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      image: selectedImage || undefined,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    clearImage();
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          ...messages.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
          })),
          {
            role: 'user',
            parts: [
              ...(imageFile ? [{
                inlineData: {
                  data: (selectedImage || '').split(',')[1],
                  mimeType: imageFile.type
                }
              }] : []),
              { text: userMessage.content || "Analyze this image" }
            ]
          }
        ],
        config: {
          systemInstruction: `${MODES[mode].instruction} You MUST respond ONLY in ${LANGUAGES[language].name}. Your name is "Purab The AI".`,
        }
      });

      const response = await model;
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.text || "I'm sorry, I couldn't generate a response.",
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error("Error calling Gemini:", error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: "Error: Failed to connect to AI. Please check your connection or API key.",
        timestamp: Date.now(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-gray-100 font-sans overflow-hidden">
      {/* --- Sidebar --- */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        className={cn(
          "bg-[#111111] border-r border-white/10 flex flex-col transition-all duration-300 ease-in-out z-50",
          !isSidebarOpen && "pointer-events-none"
        )}
      >
        <div className="p-4 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)]">
              <Bot size={20} className="text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              Purab The AI
            </h1>
          </div>

          <button 
            onClick={startNewChat}
            className="flex items-center gap-3 w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all mb-6 group"
          >
            <Plus size={18} className="group-hover:rotate-90 transition-transform" />
            <span className="font-medium">New Chat</span>
          </button>

          <div className="space-y-6 flex-1">
            {/* Mode Selector */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 block px-2">
                Chat Mode
              </label>
              <div className="space-y-1">
                {(Object.entries(MODES) as [Mode, typeof MODES['normal']][]).map(([mKey, mVal]) => (
                  <button
                    key={mKey}
                    onClick={() => setMode(mKey)}
                    className={cn(
                      "flex items-center gap-3 w-full p-3 rounded-xl transition-all",
                      mode === mKey ? cn("bg-white/10 border border-white/10", mVal.color) : "text-gray-400 hover:bg-white/5"
                    )}
                  >
                    <mVal.icon size={18} />
                    <span className="font-medium">{mVal.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Language Selector */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 block px-2">
                Language
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(LANGUAGES) as [Language, typeof LANGUAGES['bn']][]).map(([lKey, lVal]) => (
                  <button
                    key={lKey}
                    onClick={() => setLanguage(lKey)}
                    className={cn(
                      "p-2 rounded-lg text-sm transition-all border",
                      language === lKey 
                        ? "bg-blue-500/20 border-blue-500/50 text-blue-400" 
                        : "bg-white/5 border-transparent text-gray-400 hover:bg-white/10"
                    )}
                  >
                    {lVal.native}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-auto pt-4 border-t border-white/5 space-y-2">
            <button className="flex items-center gap-3 w-full p-3 rounded-xl text-gray-400 hover:bg-white/5 transition-all">
              <Settings size={18} />
              <span className="font-medium">Settings</span>
            </button>
            <div className="px-3 py-2">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Created by</p>
              <p className="text-xs font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                Indranil Officials
              </p>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* --- Main Chat Area --- */}
      <main className="flex-1 flex flex-col relative min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-white/10 flex items-center justify-between px-4 md:px-8 bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full animate-pulse", mode === 'normal' ? 'bg-blue-500' : mode === 'creative' ? 'bg-purple-500' : 'bg-rose-500')} />
              <span className="text-sm font-medium text-gray-400">
                {MODES[mode].name} Mode • {LANGUAGES[language].name}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={startNewChat}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors md:hidden"
            >
              <Plus size={20} />
            </button>
          </div>
        </header>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scroll-smooth">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-8">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-[0_0_50px_rgba(59,130,246,0.3)]"
              >
                <Bot size={40} className="text-white" />
              </motion.div>
              <div className="space-y-4">
                <h2 className="text-4xl font-bold tracking-tight">How can I help you today?</h2>
                <p className="text-gray-400 text-lg">
                  I'm Purab, your AI companion. I can help with writing, coding, or just having a friendly conversation in your preferred language.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                {[
                  "Write a story about a futuristic city",
                  "Explain quantum physics simply",
                  "Help me plan a trip to Kolkata",
                  "Write a poem about the monsoon"
                ].map((suggestion, i) => (
                  <button 
                    key={i}
                    onClick={() => setInput(suggestion)}
                    className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-left group"
                  >
                    <p className="text-sm text-gray-300 group-hover:text-white transition-colors">{suggestion}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-8 pb-24">
              {messages.map((msg) => (
                <motion.div 
                  key={msg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex gap-4 md:gap-6",
                    msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    msg.role === 'user' ? "bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]" : "bg-white/10"
                  )}>
                    {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                  </div>
                  <div className={cn(
                    "flex flex-col gap-2 max-w-[85%]",
                    msg.role === 'user' ? "items-end" : "items-start"
                  )}>
                    {msg.image && (
                      <div className="mb-2 rounded-2xl overflow-hidden border border-white/10 max-w-sm">
                        <img src={msg.image} alt="Uploaded" className="w-full h-auto" />
                      </div>
                    )}
                    <div className={cn(
                      "p-4 rounded-2xl text-[15px] leading-relaxed",
                      msg.role === 'user' 
                        ? "bg-blue-600 text-white rounded-tr-none" 
                        : "bg-white/5 text-gray-200 border border-white/5 rounded-tl-none"
                    )}>
                      <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-[#1a1a1a] prose-pre:border prose-pre:border-white/10">
                        <ReactMarkdown>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-500 px-1">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-4 md:gap-6"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                    <Bot size={20} />
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl rounded-tl-none border border-white/5 flex items-center gap-2">
                    <div className="flex gap-1">
                      <motion.div 
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1, times: [0, 0.5, 1] }}
                        className="w-1.5 h-1.5 bg-blue-500 rounded-full" 
                      />
                      <motion.div 
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1, delay: 0.2, times: [0, 0.5, 1] }}
                        className="w-1.5 h-1.5 bg-blue-500 rounded-full" 
                      />
                      <motion.div 
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1, delay: 0.4, times: [0, 0.5, 1] }}
                        className="w-1.5 h-1.5 bg-blue-500 rounded-full" 
                      />
                    </div>
                    <span className="text-xs text-gray-400 font-medium ml-2">Purab is thinking...</span>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-8 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a] to-transparent">
          <div className="max-w-4xl mx-auto relative">
            {/* Image Preview */}
            <AnimatePresence>
              {selectedImage && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full mb-4 left-0 p-2 bg-[#1a1a1a] border border-white/10 rounded-2xl flex items-center gap-3 shadow-2xl"
                >
                  <div className="w-16 h-16 rounded-lg overflow-hidden border border-white/10">
                    <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                  <button 
                    onClick={clearImage}
                    className="p-2 hover:bg-white/10 rounded-full text-rose-400 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-600/20 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
              <div className="relative flex items-end gap-2 bg-[#1a1a1a] border border-white/10 rounded-[24px] p-2 focus-within:border-white/20 transition-all shadow-2xl">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-all"
                >
                  <ImageIcon size={22} />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
                
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={`Message Purab in ${LANGUAGES[language].name}...`}
                  rows={1}
                  className="flex-1 bg-transparent border-none focus:ring-0 text-gray-100 placeholder-gray-500 py-3 px-2 resize-none max-h-48 scrollbar-hide"
                  style={{ height: 'auto', minHeight: '44px' }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = `${target.scrollHeight}px`;
                  }}
                />

                <button
                  onClick={handleSend}
                  disabled={(!input.trim() && !selectedImage) || isLoading}
                  className={cn(
                    "p-3 rounded-full transition-all flex items-center justify-center",
                    (!input.trim() && !selectedImage) || isLoading
                      ? "bg-white/5 text-gray-600 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                  )}
                >
                  {isLoading ? <Loader2 size={22} className="animate-spin" /> : <Send size={22} />}
                </button>
              </div>
            </div>
            <p className="text-[10px] text-center text-gray-600 mt-3 uppercase tracking-widest font-bold">
              Purab The AI • Created by Indranil Officials
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
