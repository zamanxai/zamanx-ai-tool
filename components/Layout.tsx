import React, { useState, useEffect, useRef } from 'react';
import { View, AIProvider, ToolConfig, Currency, SupportTicket, Notification } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useToolContext } from '../contexts/ToolContext';
import { setDynamicApiKey } from '../services/geminiService';
import { db } from '../firebaseConfig';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { createSupportTicket, replyToTicket, markNotificationRead } from '../services/adminService';
import { 
  Menu, X, MessageSquare, Image as ImageIcon, 
  Type, Mic, Code, Home, Phone, BarChart, Smile,
  Eye, Calculator, Moon, GraduationCap, Shield, LogOut, Key, Server, Check,
  Share2, FileText, Scale, Dumbbell, Ticket, Lock, CheckCircle, Globe, User, Workflow, Megaphone, Zap, AlertTriangle, WifiOff, Activity, Send, Bell, Loader2
} from 'lucide-react';
import Button from './Button';
import { Input } from './Input';
import PaymentModal from './PaymentModal';

interface LayoutProps {
  children: React.ReactNode;
  currentView: View;
  onChangeView: (view: View) => void;
}

// Background Component for Branding
const BrandedBackground = () => {
    return (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none">
            <div className="absolute top-[10%] left-[5%] text-xs opacity-10 animate-float font-mono text-white">ZAMANX AI</div>
        </div>
    );
};

const BootSequence = ({ onComplete, username }: { onComplete: () => void, username: string }) => {
  const [lines, setLines] = useState<string[]>([]);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const sequence = [
      "INITIALIZING ZAMANX CORE...",
      "LOADING NEURAL MODULES...",
      "ESTABLISHING SECURE CONNECTION...",
      `WELCOME, ${username.toUpperCase()}.`,
      "ACCESS GRANTED."
    ];
    let timer: any;
    if (step < sequence.length) {
       timer = setTimeout(() => {
         setLines(prev => [...prev, sequence[step]]);
         setStep(prev => prev + 1);
       }, 600);
    } else {
       timer = setTimeout(onComplete, 800);
    }
    return () => clearTimeout(timer);
  }, [step]);

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center font-mono text-cyan-500 p-8 text-center select-none">
       {lines.map((l, i) => (
           <div key={i} className="animate-fade-in mb-2 text-sm sm:text-base tracking-widest">{l}</div>
       ))}
       <div className="mt-8 relative w-16 h-16">
          <div className="absolute inset-0 border-t-2 border-cyan-500 rounded-full animate-spin"></div>
          <div className="absolute inset-2 border-r-2 border-blue-500 rounded-full animate-spin" style={{ animationDirection: 'reverse' }}></div>
       </div>
    </div>
  )
}

const Layout: React.FC<LayoutProps> = ({ children, currentView, onChangeView }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { currentUser, userProfile, isAdmin, logout, updateProfile } = useAuth();
  const { tools, rates, globalApiKey, keyStatus } = useToolContext();
  
  const [showBoot, setShowBoot] = useState(false);
  const [showChatDialog, setShowChatDialog] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [selectedToolForPurchase, setSelectedToolForPurchase] = useState<ToolConfig | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Notification State
  const [showNotifications, setShowNotifications] = useState(false);
  const [myNotifications, setMyNotifications] = useState<Notification[]>([]);
  
  // Live Chat State
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const currencies: Currency[] = ['USD', 'PKR', 'INR', 'AED'];

  // Network Status Listener
  useEffect(() => {
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
      };
  }, []);

  // Notifications Listener (User Specific + Global)
  useEffect(() => {
      if (!currentUser) return;
      
      const q = query(collection(db, "notifications"), orderBy("timestamp", "desc"), limit(20));
      const unsubscribe = onSnapshot(q, (snapshot) => {
          const allNotes = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Notification));
          // Filter relevant notifications (Global OR Targeted to User)
          const relevant = allNotes.filter(n => n.type === 'global' || n.target === currentUser.uid);
          setMyNotifications(relevant);
      });
      return () => unsubscribe();
  }, [currentUser]);

  const handleMarkRead = async (id: string) => {
      if (currentUser) {
          await markNotificationRead(id, currentUser.uid);
      }
  };

  const unreadCount = myNotifications.filter(n => !n.seenBy?.includes(currentUser?.uid || '')).length;

  // Live Chat Listener
  useEffect(() => {
      if (currentUser && showChatDialog) {
          const q = query(
              collection(db, "support_tickets"), 
              where("userId", "==", currentUser.uid),
              where("status", "in", ["pending", "active"]),
              orderBy("lastUpdate", "desc"),
              limit(1)
          );
          
          const unsubscribe = onSnapshot(q, (snapshot) => {
              if (!snapshot.empty) {
                  const data = snapshot.docs[0].data() as SupportTicket;
                  setActiveTicket({ id: snapshot.docs[0].id, ...data });
              } else {
                  setActiveTicket(null);
              }
          });
          return () => unsubscribe();
      }
  }, [currentUser, showChatDialog]);

  useEffect(() => {
      if (showChatDialog && activeTicket) {
          chatScrollRef.current?.scrollIntoView({ behavior: "smooth" });
      }
  }, [activeTicket, showChatDialog]);

  // Initialize state from local storage on mount
  useEffect(() => {
      // Trigger boot sequence only once per session
      if (currentUser && !sessionStorage.getItem('boot_shown')) {
          setShowBoot(true);
          sessionStorage.setItem('boot_shown', 'true');
      }
  }, [currentUser]);

  const isToolLocked = (tool: ToolConfig | undefined) => {
      if (!tool) return true;
      if (tool.access === 'Free') return false;
      if (userProfile?.role === 'superadmin') return false;
      // Check direct tool grant first (this covers the "Specific User" requirement)
      if (userProfile?.purchasedTools?.includes(tool.id)) return false;
      
      const userPlan = userProfile?.plan || 'Free';
      const levels: Record<string, number> = { 'Free': 0, 'Basic': 1, 'Pro': 2, 'Ultra': 3 };
      return (levels[userPlan] || 0) < (levels[tool.access] || 0);
  };

  const userCurrency = userProfile?.currency || 'USD';
  const convertPrice = (usdPrice: number) => {
      const rate = rates[userCurrency as keyof typeof rates] || 1;
      return Math.ceil(usdPrice * rate);
  };

  const allNavItems = [
    { id: View.HOME, label: 'Dashboard', icon: <Home size={20} /> },
    { id: View.CHAT, label: 'AI Chatbot', icon: <MessageSquare size={20} /> },
    { id: View.IMAGE, label: 'Image Generator', icon: <ImageIcon size={20} /> },
    { id: View.AD_CREATOR, label: 'Ad Creator 360', icon: <Megaphone size={20} /> },
    { id: View.AUTOMATION, label: 'AI Automation', icon: <Workflow size={20} /> },
    { id: View.WHATSAPP, label: 'WhatsApp Suite', icon: <Phone size={20} /> },
    { id: View.PLANNER, label: 'Content Planner', icon: <Share2 size={20} /> }, 
    { id: View.VIDEO, label: 'Video Creator', icon: <Eye size={20} /> },
    { id: View.SOCIAL, label: 'Social Manager', icon: <Share2 size={20} /> },
    { id: View.CODE, label: 'Code Architect', icon: <Code size={20} /> },
    { id: View.RESUME, label: 'Resume Builder', icon: <FileText size={20} /> },
    { id: View.LEGAL, label: 'Legal Advisor', icon: <Scale size={20} /> },
    { id: View.FITNESS, label: 'Fitness Coach', icon: <Dumbbell size={20} /> },
    { id: View.STUDY, label: 'Study Helper', icon: <GraduationCap size={20} /> },
    { id: View.VISION, label: 'AI Vision', icon: <Eye size={20} /> },
    { id: View.AVATAR, label: 'Avatar Studio', icon: <Smile size={20} /> },
    { id: View.DREAM, label: 'Dream Interpreter', icon: <Moon size={20} /> },
    { id: View.TEXT, label: 'Text Tools', icon: <Type size={20} /> },
    { id: View.VOICE, label: 'Voice Tools', icon: <Mic size={20} /> },
    { id: View.MATH, label: 'Math Genius', icon: <Calculator size={20} /> },
    { id: View.ANALYZER, label: 'Data Lab', icon: <BarChart size={20} /> },
    { id: View.CONTACT, label: 'Contact Us', icon: <Phone size={20} /> },
  ];

  const navItems = allNavItems.filter(item => {
      if (item.id === View.HOME || item.id === View.CONTACT) return true;
      if (tools.length === 0) return false;
      const tool = tools.find(t => t.id === item.id);
      return tool ? tool.visibility === 'visible' : false;
  });

  if (isAdmin) {
    navItems.push({ id: View.ADMIN_DASHBOARD, label: 'Admin Panel', icon: <Shield size={20} /> });
  }

  const handleNavClick = (view: View) => {
    if (view === View.HOME || view === View.CONTACT || view === View.ADMIN_DASHBOARD) {
        onChangeView(view);
        setIsSidebarOpen(false);
        return;
    }
    const tool = tools.find(t => t.id === view);
    if (tool) {
        const locked = isToolLocked(tool);
        if (locked && !tool.demoAvailable) {
            setSelectedToolForPurchase(tool);
            setIsSidebarOpen(false);
            return;
        }
    }
    onChangeView(view);
    setIsSidebarOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    onChangeView(View.LOGIN);
    sessionStorage.removeItem('boot_shown'); 
  };

  const handleLiveChatSubmit = async () => {
      if(userProfile && chatMessage) {
          if (activeTicket) {
              await replyToTicket(activeTicket.id, chatMessage, false);
          } else {
              await createSupportTicket(userProfile.uid, userProfile.email, "Live Support Request", chatMessage);
          }
          setChatMessage('');
      }
  };

  if (currentView === View.LOGIN || currentView === View.SIGNUP || currentView === View.ADMIN_LOGIN || currentView === View.FORGOT_PASSWORD) {
    return <div className="relative"><BrandedBackground />{children}</div>;
  }

  if (showBoot) {
      return <BootSequence onComplete={() => setShowBoot(false)} username={userProfile?.username || currentUser?.email?.split('@')[0] || 'User'} />;
  }

  return (
    <div className="flex h-screen bg-black text-gray-100 font-sans relative overflow-hidden">
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-slate-950 via-black to-slate-950 animate-gradient-xy"></div>
      <div className="fixed inset-0 z-0 opacity-20 bg-grid-pattern pointer-events-none"></div>
      
      <BrandedBackground />

      {/* Offline Banner */}
      {!isOnline && (
          <div className="fixed top-0 left-0 right-0 bg-red-600 text-white text-xs font-bold text-center py-1 z-[100] animate-pulse">
              NO INTERNET CONNECTION DETECTED. SOME FEATURES MAY NOT WORK.
          </div>
      )}

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 w-full glass-panel z-50 flex items-center justify-between p-4 border-b border-gray-800/50">
        <div className="flex items-center gap-2 font-bold text-xl text-white">
          <div className="w-8 h-8 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.5)]">Z</div>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-cyan-200">ZamanX AI</span>
        </div>
        
        <div className="flex items-center gap-4">
            {/* Mobile Notification Bell */}
            <div className="relative">
                <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-1 text-gray-400 hover:text-white">
                    <Bell size={20} />
                    {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full animate-pulse">{unreadCount}</span>}
                </button>
                {showNotifications && (
                    <div className="absolute right-0 top-8 w-64 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-50">
                        <div className="p-3 border-b border-gray-800 font-bold text-xs uppercase tracking-wider text-gray-500">Notifications</div>
                        <div className="max-h-60 overflow-y-auto">
                            {myNotifications.length === 0 ? (
                                <div className="p-4 text-center text-xs text-gray-500">No new messages</div>
                            ) : (
                                myNotifications.map(n => (
                                    <div key={n.id} onClick={() => handleMarkRead(n.id)} className={`p-3 border-b border-gray-800/50 hover:bg-gray-800 cursor-pointer ${!n.seenBy?.includes(currentUser?.uid || '') ? 'bg-cyan-900/10' : ''}`}>
                                        <div className="text-xs font-bold text-white mb-1">{n.title}</div>
                                        <div className="text-[10px] text-gray-400">{n.message}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
            
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-gray-400 hover:text-white transition-colors">
              {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
        </div>
      </div>

      <aside className={`fixed lg:static inset-y-0 left-0 w-72 glass-panel border-r border-gray-800/50 transform transition-transform duration-300 z-40 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
        <div className="p-6 hidden lg:flex items-center gap-3 font-bold text-2xl text-white mb-2 relative group cursor-default">
             <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
             <div className="w-10 h-10 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg relative z-10 text-xl">Z</div>
             <span className="tracking-tight relative z-10 bg-clip-text text-transparent bg-gradient-to-r from-white via-cyan-100 to-white">ZamanX AI</span>
        </div>

        {/* Desktop Notification Bell (in Sidebar Top) */}
        <div className="px-4 mb-4 hidden lg:block relative">
             <button onClick={() => setShowNotifications(!showNotifications)} className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-900/50 border border-gray-700/50 hover:bg-gray-800 transition-all">
                 <div className="flex items-center gap-3 text-sm font-bold text-gray-300">
                     <Bell size={16} className={unreadCount > 0 ? 'text-yellow-400 animate-swing' : 'text-gray-500'} />
                     Notifications
                 </div>
                 {unreadCount > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{unreadCount}</span>}
             </button>
             
             {showNotifications && (
                <div className="absolute left-4 right-4 top-14 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in">
                    <div className="p-3 border-b border-gray-800 font-bold text-xs uppercase tracking-wider text-gray-500 flex justify-between items-center">
                        <span>Inbox</span>
                        <button onClick={()=>setShowNotifications(false)}><X size={14}/></button>
                    </div>
                    <div className="max-h-64 overflow-y-auto custom-scrollbar">
                        {myNotifications.length === 0 ? (
                            <div className="p-6 text-center text-xs text-gray-500">No new messages</div>
                        ) : (
                            myNotifications.map(n => (
                                <div key={n.id} onClick={() => handleMarkRead(n.id)} className={`p-3 border-b border-gray-800/50 hover:bg-gray-800 cursor-pointer transition-colors ${!n.seenBy?.includes(currentUser?.uid || '') ? 'bg-cyan-900/10 border-l-2 border-l-cyan-500' : ''}`}>
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-xs font-bold text-white">{n.title}</span>
                                        <span className="text-[10px] text-gray-600">{new Date(n.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    </div>
                                    <p className="text-[11px] text-gray-400 leading-relaxed">{n.message}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
             )}
        </div>

        {/* Global API Key Status Widget - HIDDEN FOR USERS, VISIBLE FOR ADMINS */}
        <div className="px-4 mb-2">
            {isAdmin ? (
                // Admin View: Full Details
                globalApiKey ? (
                    <div className="bg-green-900/10 border border-green-500/20 p-3 rounded-xl backdrop-blur-sm cursor-pointer hover:bg-green-900/20" onClick={() => onChangeView(View.ADMIN_DASHBOARD)}>
                       <div className="flex items-center justify-between">
                           <div className="text-[10px] font-bold text-green-500 uppercase flex items-center gap-1.5">
                               <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Active Key
                           </div>
                           <span className="text-[10px] text-green-600 font-mono">{keyStatus.usage} reqs</span>
                       </div>
                       <div className="text-xs font-mono text-gray-300 mt-1 tracking-wider">
                           sk-{globalApiKey.substring(0, 4)}...{globalApiKey.slice(-4)}
                       </div>
                    </div>
                ) : (
                    <div className="bg-red-900/10 border border-red-500/30 p-3 rounded-xl backdrop-blur-sm cursor-pointer hover:bg-red-900/20 transition-colors" onClick={() => onChangeView(View.ADMIN_DASHBOARD)}>
                       <div className="text-[10px] font-bold text-red-400 uppercase flex items-center gap-1.5 mb-1">
                           <AlertTriangle size={12}/> Admin: Add Key
                       </div>
                       <div className="text-[10px] text-gray-500">
                           System needs an API key to function.
                       </div>
                    </div>
                )
            ) : (
                // User View: Simplified Status
                <div className="bg-gray-900/50 border border-gray-700/50 p-2 rounded-xl backdrop-blur-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isOnline ? (globalApiKey ? 'bg-green-500 animate-pulse' : 'bg-yellow-500') : 'bg-red-500'}`}></span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            {isOnline ? (globalApiKey ? 'System Online' : 'Maintenance') : 'Offline'}
                        </span>
                    </div>
                    {isOnline && globalApiKey && <Activity size={12} className="text-green-500"/>}
                </div>
            )}
        </div>

        {/* Currency & User Profile */}
        <div className="px-4 mb-2">
            <div className="p-2 bg-gray-900/50 rounded-xl border border-gray-700/50">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Globe size={10} /> Live Currency
                </label>
                <div className="grid grid-cols-4 gap-1">
                    {currencies.map(c => (
                        <button
                            key={c}
                            onClick={() => updateProfile({ currency: c })}
                            className={`text-[10px] font-bold py-1 rounded transition-all ${userProfile?.currency === c ? 'bg-cyan-600 text-white shadow' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'}`}
                        >
                            {c}
                        </button>
                    ))}
                </div>
            </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const tool = tools.find(t => t.id === item.id);
            const locked = isToolLocked(tool);
            const purchased = tool && userProfile?.purchasedTools?.includes(tool.id);

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden ${
                  currentView === item.id 
                    ? 'text-cyan-400 font-bold' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {currentView === item.id && (
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent border-l-2 border-cyan-400"></div>
                )}
                <div className="flex items-center gap-3 relative z-10">
                    <span className={`transition-transform duration-300 ${currentView === item.id ? 'scale-110 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]' : 'group-hover:scale-110'}`}>{item.icon}</span>
                    <span>{item.label}</span>
                </div>
                {locked ? (
                     <span className="text-gray-600"><Lock size={14}/></span>
                ) : tool && tool.access !== 'Free' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-gray-700 text-green-500 font-bold bg-black/40">
                        {purchased ? 'OWNED' : tool?.access.toUpperCase()}
                    </span>
                )}
              </button>
            );
          })}
          
          <div className="border-t border-gray-800 mt-2 pt-2">
            <button onClick={() => { onChangeView(View.USER_PROFILE); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all mb-1 ${currentView === View.USER_PROFILE ? 'text-cyan-400 font-bold' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'}`}>
                <User size={20} /><span>My Profile</span>
            </button>
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-900/10 hover:text-red-300 transition-all">
                <LogOut size={20} /><span>Sign Out</span>
            </button>
          </div>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        <div className="flex-1 overflow-y-auto pt-16 lg:pt-0 scroll-smooth">
           <div className="max-w-7xl mx-auto p-4 lg:p-8 min-h-full">
             {children}
           </div>
        </div>
      </main>

      {/* Floating Action Button for Support */}
      <button 
          onClick={() => setShowChatDialog(true)}
          className="fixed bottom-6 right-6 z-[90] p-4 bg-gradient-to-tr from-cyan-600 to-blue-600 text-white rounded-full shadow-[0_0_20px_rgba(6,182,212,0.5)] hover:scale-110 transition-transform flex items-center gap-2 font-bold"
      >
          <Ticket size={24} />
      </button>

      {/* Live Support Modal */}
      {showChatDialog && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
              <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl flex flex-col h-[500px]">
                  <div className="p-4 border-b border-gray-800 bg-gray-950 flex justify-between items-center rounded-t-2xl">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <Ticket className="text-green-500"/> Live Support
                      </h3>
                      <button onClick={() => setShowChatDialog(false)} className="text-gray-400 hover:text-white">
                          <X size={20} />
                      </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/40 custom-scrollbar">
                      {activeTicket ? (
                          <>
                              <div className="text-center text-xs text-gray-500 mb-4">
                                  Ticket #{activeTicket.id.substring(0,6)} - {activeTicket.subject}
                              </div>
                              {activeTicket.messages.map((msg, idx) => (
                                  <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                      <div className={`max-w-[85%] p-3 rounded-xl ${msg.sender === 'user' ? 'bg-cyan-600 text-white rounded-br-none' : 'bg-gray-800 text-gray-200 rounded-bl-none'}`}>
                                          <p className="text-sm">{msg.text}</p>
                                          <p className="text-[10px] opacity-60 mt-1 text-right">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                                      </div>
                                  </div>
                              ))}
                              {activeTicket.status === 'pending' && (
                                  <div className="text-center p-4 animate-fade-in">
                                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-900/20 text-yellow-500 rounded-full text-xs font-bold border border-yellow-500/20">
                                          <Loader2 size={12} className="animate-spin"/> Waiting for an agent to join...
                                      </div>
                                  </div>
                              )}
                              <div ref={chatScrollRef} />
                          </>
                      ) : (
                          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-gray-500">
                              <Ticket size={48} className="mb-4 opacity-20"/>
                              <p className="font-bold text-gray-400">How can we help?</p>
                              <p className="text-xs">Start a chat to connect with an admin.</p>
                          </div>
                      )}
                  </div>

                  <div className="p-4 border-t border-gray-800 bg-gray-950 rounded-b-2xl">
                      <div className="flex gap-2">
                          <Input 
                              placeholder={activeTicket ? "Type your reply..." : "Describe your issue..."} 
                              value={chatMessage} 
                              onChange={e=>setChatMessage(e.target.value)} 
                              onKeyDown={e => e.key === 'Enter' && handleLiveChatSubmit()}
                              className="bg-gray-900 border-gray-700"
                              disabled={activeTicket?.status === 'pending'}
                          />
                          <Button 
                            onClick={handleLiveChatSubmit} 
                            className="!bg-green-600 px-4" 
                            icon={<Send size={18}/>}
                            disabled={activeTicket?.status === 'pending'}
                          ></Button>
                      </div>
                  </div>
              </div>
          </div>
      )}
      
      {isSidebarOpen && <div className="fixed inset-0 bg-black/80 z-30 lg:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />}
      
      {selectedToolForPurchase && (
          <PaymentModal 
              toolId={selectedToolForPurchase.id}
              toolName={selectedToolForPurchase.name}
              price={convertPrice(selectedToolForPurchase.basePriceUSD)}
              currency={userCurrency}
              onClose={() => setSelectedToolForPurchase(null)}
              onSuccess={() => { setSelectedToolForPurchase(null); window.location.reload(); }}
          />
      )}
    </div>
  );
};

export default Layout;