
import React, { useState, useEffect } from 'react';
import { View, AIProvider, ToolConfig, Currency } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useToolContext } from '../contexts/ToolContext';
import { setDynamicApiKey, removeDynamicApiKey } from '../services/geminiService';
import { 
  Menu, X, MessageSquare, Image as ImageIcon, 
  Type, Mic, Code, Home, Phone, BarChart, Smile,
  Eye, Calculator, Moon, GraduationCap, Shield, LogOut, Key, Server, Check,
  Share2, FileText, Scale, Dumbbell, Ticket, Lock, CheckCircle, Globe, User, Workflow, Megaphone
} from 'lucide-react';
import Button from './Button';
import { Input } from './Input';
import PaymentModal from './PaymentModal';
import { createSupportTicket } from '../services/adminService';

interface LayoutProps {
  children: React.ReactNode;
  currentView: View;
  onChangeView: (view: View) => void;
}

// Background Component for Branding
const BrandedBackground = () => {
    // Generate static positions to avoid re-render flicker
    const items = [
        { top: '10%', left: '5%', delay: '0s', duration: '20s', size: 'text-xs', opacity: 'opacity-10' },
        { top: '30%', left: '80%', delay: '5s', duration: '25s', size: 'text-sm', opacity: 'opacity-5' },
        { top: '70%', left: '15%', delay: '2s', duration: '22s', size: 'text-xs', opacity: 'opacity-10' },
        { top: '50%', left: '50%', delay: '10s', duration: '30s', size: 'text-lg', opacity: 'opacity-[0.03]' },
        { top: '85%', left: '90%', delay: '8s', duration: '18s', size: 'text-xs', opacity: 'opacity-10' },
        { top: '5%', left: '60%', delay: '15s', duration: '28s', size: 'text-sm', opacity: 'opacity-5' },
        { top: '90%', left: '30%', delay: '1s', duration: '24s', size: 'text-xs', opacity: 'opacity-5' },
    ];

    return (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none">
            {items.map((item, index) => (
                <div 
                    key={index}
                    className={`absolute font-black text-white ${item.size} ${item.opacity} animate-float`}
                    style={{ 
                        top: item.top, 
                        left: item.left, 
                        animationDelay: item.delay,
                        animationDuration: item.duration,
                        fontFamily: 'monospace'
                    }}
                >
                    ZAMANX AI
                </div>
            ))}
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
  const { tools, rates } = useToolContext();
  
  // Local Key Modal State
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [localKey, setLocalKey] = useState('');
  const [localProvider, setLocalProvider] = useState<AIProvider>('GOOGLE');

  const [showBoot, setShowBoot] = useState(false);
  const [showChatDialog, setShowChatDialog] = useState(false);
  const [chatMessage, setChatMessage] = useState('');

  // Payment Modal State for Sidebar
  const [selectedToolForPurchase, setSelectedToolForPurchase] = useState<ToolConfig | null>(null);

  const currencies: Currency[] = ['USD', 'PKR', 'INR', 'AED'];

  // Initialize state from local storage on mount
  useEffect(() => {
      const storedKey = localStorage.getItem('zamanx_api_key');
      const storedProvider = localStorage.getItem('zamanx_provider') as AIProvider;
      if (storedKey) setLocalKey(storedKey);
      if (storedProvider) setLocalProvider(storedProvider);
      
      // Trigger boot sequence only once per session
      if (currentUser && !sessionStorage.getItem('boot_shown')) {
          setShowBoot(true);
          sessionStorage.setItem('boot_shown', 'true');
      }
  }, [currentUser]);

  // Global Click Effect Logic
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
        const el = document.createElement('div');
        el.className = 'click-effect';
        el.innerText = 'ZamanX AI';
        el.style.left = `${e.clientX}px`;
        el.style.top = `${e.clientY}px`;
        document.body.appendChild(el);
        setTimeout(() => {
            if (document.body.contains(el)) document.body.removeChild(el);
        }, 1000);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Helper: Check if tool is locked based on plan/purchase
  const isToolLocked = (tool: ToolConfig | undefined) => {
      if (!tool) return true;
      if (tool.access === 'Free') return false;
      if (userProfile?.role === 'superadmin') return false;
      if (userProfile?.purchasedTools?.includes(tool.id)) return false;
      
      const userPlan = userProfile?.plan || 'Free';
      const levels: Record<string, number> = { 'Free': 0, 'Basic': 1, 'Pro': 2, 'Ultra': 3 };
      const userLevel = levels[userPlan] || 0;
      const toolLevel = levels[tool.access] || 0;
      
      return userLevel < toolLevel;
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
      
      // Critical Fix: If tools are not yet loaded, hide tool items to prevent unauthorized access race condition
      if (tools.length === 0) return false;

      const tool = tools.find(t => t.id === item.id);
      return tool ? tool.visibility === 'visible' : false;
  });

  if (isAdmin) {
    navItems.push({ id: View.ADMIN_DASHBOARD, label: 'Admin Panel', icon: <Shield size={20} /> });
  }

  const handleNavClick = (view: View) => {
    // Standard views always accessible
    if (view === View.HOME || view === View.CONTACT || view === View.ADMIN_DASHBOARD) {
        onChangeView(view);
        setIsSidebarOpen(false);
        return;
    }

    const tool = tools.find(t => t.id === view);
    
    // Check if tool is locked
    if (tool) {
        const locked = isToolLocked(tool);
        
        // Block access if tool is locked AND demo is NOT available
        // If demo is available, we allow access (Tool page handles demo limitations)
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

  const handleSaveLocalKey = () => {
      if (!localKey.trim()) {
          alert("Please enter a valid API Key.");
          return;
      }
      setDynamicApiKey(localKey, localProvider);
      setShowKeyModal(false);
      window.location.reload(); 
  };

  const handleClearLocalKey = () => {
      removeDynamicApiKey();
      setLocalKey('');
      setShowKeyModal(false);
      window.location.reload(); 
  };

  const handleLiveChatSubmit = async () => {
      if(userProfile && chatMessage) {
          await createSupportTicket(userProfile.uid, userProfile.email, "Live Chat Request", chatMessage);
          alert("Request sent! Admin will respond shortly.");
          setShowChatDialog(false);
          setChatMessage('');
      }
  };

  if (currentView === View.LOGIN || currentView === View.SIGNUP || currentView === View.ADMIN_LOGIN || currentView === View.FORGOT_PASSWORD) {
    return (
        <div className="relative">
             <BrandedBackground />
             {children}
        </div>
    );
  }

  if (showBoot) {
      return <BootSequence onComplete={() => setShowBoot(false)} username={userProfile?.username || currentUser?.email?.split('@')[0] || 'User'} />;
  }

  return (
    <div className="flex h-screen bg-black text-gray-100 font-sans relative overflow-hidden">
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-slate-950 via-black to-slate-950 animate-gradient-xy"></div>
      <div className="fixed inset-0 z-0 opacity-20 bg-grid-pattern pointer-events-none"></div>
      
      <BrandedBackground />

      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-600/10 blur-[120px] animate-float"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/10 blur-[120px] animate-float" style={{ animationDelay: '3s' }}></div>

      <div className="lg:hidden fixed top-0 w-full glass-panel z-50 flex items-center justify-between p-4 border-b border-gray-800/50">
        <div className="flex items-center gap-2 font-bold text-xl text-white">
          <div className="w-8 h-8 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.5)]">Z</div>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-cyan-200">ZamanX AI</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-gray-400 hover:text-white transition-colors">
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <aside 
        className={`fixed lg:static inset-y-0 left-0 w-72 glass-panel border-r border-gray-800/50 transform transition-transform duration-300 z-40 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}
      >
        <div className="p-6 hidden lg:flex items-center gap-3 font-bold text-2xl text-white mb-2 relative group cursor-default">
             <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
             <div className="w-10 h-10 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg relative z-10 text-xl">Z</div>
             <span className="tracking-tight relative z-10 bg-clip-text text-transparent bg-gradient-to-r from-white via-cyan-100 to-white">ZamanX AI</span>
        </div>

        {currentUser && (
            <div className="px-4 mb-2">
                <div 
                    onClick={() => { onChangeView(View.USER_PROFILE); setIsSidebarOpen(false); }}
                    className="p-3 bg-gray-800/50 rounded-xl flex items-center gap-3 border border-gray-700/50 cursor-pointer hover:bg-gray-800 hover:border-cyan-500/50 transition-all group"
                >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-xs font-bold overflow-hidden">
                        {userProfile?.photoURL ? (
                            <img src={userProfile.photoURL} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            currentUser.email?.[0].toUpperCase()
                        )}
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-bold truncate group-hover:text-cyan-400 transition-colors">{userProfile?.username || 'User'}</p>
                        <div className="flex items-center gap-2">
                           <p className="text-[10px] text-gray-400 uppercase tracking-wider">{userProfile?.plan || 'Free'} Plan</p>
                        </div>
                    </div>
                </div>
            </div>
        )}
        
        {/* Currency Changer */}
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
            {isAdmin && (
              <button 
                  onClick={() => setShowKeyModal(true)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all mb-1 text-gray-500 hover:text-gray-300 hover:bg-gray-800/50"
                  title="Configure Local API Key for Testing"
              >
                  <Key size={20} />
                  <span>{localStorage.getItem('zamanx_api_key') ? 'Manage Local Key' : 'Set Local Key'}</span>
              </button>
            )}
            
            <button 
                onClick={() => { onChangeView(View.USER_PROFILE); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all mb-1 ${currentView === View.USER_PROFILE ? 'text-cyan-400 font-bold' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'}`}
            >
                <User size={20} />
                <span>My Profile</span>
            </button>

            <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-900/10 hover:text-red-300 transition-all"
            >
                <LogOut size={20} />
                <span>Sign Out</span>
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

      {/* ... (Existing Chat & Key Modals code remains the same) ... */}
      
      {showChatDialog && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
              <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
                  <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                      <Ticket className="text-green-500"/> Live Support Chat
                  </h3>
                  <p className="text-gray-400 text-sm mb-4">Describe your issue or request. An admin will connect with you shortly.</p>
                  <Input 
                      placeholder="Type your message..." 
                      value={chatMessage} 
                      onChange={e=>setChatMessage(e.target.value)}
                      className="mb-4"
                  />
                  <div className="flex gap-3">
                      <Button onClick={handleLiveChatSubmit} className="flex-1 !bg-green-600">Send Request</Button>
                      <Button onClick={()=>setShowChatDialog(false)} variant="secondary">Cancel</Button>
                  </div>
              </div>
          </div>
      )}
      
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-30 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {/* Key Modal (truncated) */}
      {showKeyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
             {/* Key Modal Content */}
             <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-in">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                          <Server size={20} className="text-cyan-400"/> Local API Configuration
                      </h3>
                      <button onClick={() => setShowKeyModal(false)} className="text-gray-500 hover:text-white">
                          <X size={20} />
                      </button>
                  </div>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">AI Provider</label>
                          <div className="relative">
                              <select 
                                  value={localProvider}
                                  onChange={(e) => setLocalProvider(e.target.value as AIProvider)}
                                  className="w-full bg-black/40 border border-gray-700 rounded-lg py-2.5 px-4 text-white focus:border-cyan-500 appearance-none"
                              >
                                  <option value="GOOGLE">ZamanX Core (G)</option>
                                  <option value="OPENAI">ZamanX Pro (O)</option>
                                  <option value="DEEPSEEK">ZamanX Deep (D)</option>
                                  <option value="CLAUDE">ZamanX Logic (C)</option>
                              </select>
                              <div className="absolute right-4 top-3 pointer-events-none text-gray-500">▼</div>
                          </div>
                      </div>
                      <Input 
                          label="API Key"
                          placeholder="Paste your API Key here..."
                          value={localKey}
                          onChange={(e) => setLocalKey(e.target.value)}
                          type="password"
                      />
                      <div className="flex gap-3 pt-2">
                          <Button 
                              onClick={handleSaveLocalKey} 
                              className="flex-1"
                              icon={<Check size={16}/>}
                          >
                              Save & Use
                          </Button>
                          {localStorage.getItem('zamanx_api_key') && (
                              <Button 
                                  onClick={handleClearLocalKey} 
                                  variant="danger"
                                  className="flex-1"
                              >
                                  Reset to System Default
                              </Button>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {selectedToolForPurchase && (
          <PaymentModal 
              toolId={selectedToolForPurchase.id}
              toolName={selectedToolForPurchase.name}
              price={convertPrice(selectedToolForPurchase.basePriceUSD)}
              currency={userCurrency}
              onClose={() => setSelectedToolForPurchase(null)}
              onSuccess={() => {
                  setSelectedToolForPurchase(null);
                  window.location.reload();
              }}
          />
      )}
    </div>
  );
};

export default Layout;
