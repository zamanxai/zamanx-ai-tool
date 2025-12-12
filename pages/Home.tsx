import React, { useEffect, useState } from 'react';
import { View, ToolConfig } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useToolContext } from '../contexts/ToolContext';
import { markNotificationRead } from '../services/adminService';
import { 
  MessageSquare, Image, Type, Mic, ArrowRight, Zap, Shield, 
  Globe, Smile, BarChart, Eye, Calculator, Moon, GraduationCap, Scale, Dumbbell, Lock, FileText, Code, Video, Share2, Calendar, Phone, CheckCircle, Workflow, Megaphone, X
} from 'lucide-react';
import Button from '../components/Button';
import PaymentModal from '../components/PaymentModal';

interface HomeProps {
  onChangeView: (view: View) => void;
}

const Home: React.FC<HomeProps> = ({ onChangeView }) => {
  const { tools, rates, notifications } = useToolContext();
  const { userProfile, currentUser } = useAuth();
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [userCurrency, setUserCurrency] = useState('USD');
  const [selectedToolForPurchase, setSelectedToolForPurchase] = useState<ToolConfig | null>(null);

  const iconMap: any = {
      'CHAT': <MessageSquare className="w-6 h-6" />,
      'IMAGE': <Image className="w-6 h-6" />,
      'CODE': <Code className="w-6 h-6" />,
      'VISION': <Eye className="w-6 h-6" />,
      'VIDEO': <Video className="w-6 h-6" />,
      'VOICE': <Mic className="w-6 h-6" />,
      'PLANNER': <Calendar className="w-6 h-6" />,
      'WHATSAPP': <Phone className="w-6 h-6" />,
      'AD_CREATOR': <Megaphone className="w-6 h-6" />, // New
      'RESUME': <FileText className="w-6 h-6" />,
      'LEGAL': <Scale className="w-6 h-6" />,
      'FITNESS': <Dumbbell className="w-6 h-6" />,
      'STUDY': <GraduationCap className="w-6 h-6" />,
      'MATH': <Calculator className="w-6 h-6" />,
      'DREAM': <Moon className="w-6 h-6" />,
      'ANALYZER': <BarChart className="w-6 h-6" />,
      'AVATAR': <Smile className="w-6 h-6" />,
      'AUTOMATION': <Workflow className="w-6 h-6" />,
      'CONTACT': <Globe className="w-6 h-6" />
  };

  useEffect(() => {
      if(userProfile?.currency) {
          setUserCurrency(userProfile.currency);
          if(userProfile.currency === 'PKR') setCurrencySymbol('₨');
          else if(userProfile.currency === 'INR') setCurrencySymbol('₹');
          else if(userProfile.currency === 'AED') setCurrencySymbol('AED');
          else setCurrencySymbol('$');
      }
  }, [userProfile]);

  const convertPrice = (usdPrice: number) => {
      const rate = rates[userCurrency as keyof typeof rates] || 1;
      return Math.ceil(usdPrice * rate);
  };

  const isLocked = (tool: ToolConfig) => {
      if(tool.access === 'Free') return false;
      const userPlan = userProfile?.plan || 'Free';
      const levels = { 'Free': 0, 'Basic': 1, 'Pro': 2, 'Ultra': 3 };
      const userLevel = levels[userPlan];
      const toolLevel = levels[tool.access];

      // If user plan is lower, check if purchased individually
      if(userLevel < toolLevel) {
          if(userProfile?.purchasedTools?.includes(tool.id)) return false;
          return true;
      }
      return false;
  };

  const handleDismissNotification = async (id: string) => {
      if (currentUser) {
          await markNotificationRead(id, currentUser.uid);
      }
  };

  const visibleTools = tools.filter(t => t.visibility === 'visible' && t.id !== 'CONTACT');
  
  // Filter notifications to show only unread ones in the banner
  const unreadNotifications = notifications.filter(n => 
      (!n.seenBy || !n.seenBy.includes(currentUser?.uid || '')) && 
      (n.type === 'global' || n.target === currentUser?.uid)
  );

  return (
    <div className="space-y-12 animate-fade-in pb-12">
      {/* Notifications Banner */}
      {unreadNotifications.length > 0 && (
          <div className="space-y-2">
              {unreadNotifications.slice(0,1).map(n => (
                  <div key={n.id} className="bg-gradient-to-r from-blue-900/40 to-cyan-900/40 border border-cyan-500/30 p-4 rounded-xl flex items-center justify-between backdrop-blur-sm shadow-lg relative group">
                      <div className="flex items-center gap-3">
                          <div className="p-2 bg-cyan-500/20 rounded-full"><Zap size={16} className="text-cyan-400"/></div>
                          <div>
                            <h4 className="font-bold text-white text-sm">{n.title}</h4>
                            <p className="text-cyan-100/80 text-xs">{n.message}</p>
                          </div>
                      </div>
                      <div className="flex items-center gap-3">
                          <span className="text-xs text-cyan-500 font-mono hidden sm:block">{new Date(n.timestamp).toLocaleTimeString()}</span>
                          <button 
                            onClick={() => handleDismissNotification(n.id)}
                            className="p-1 text-cyan-400 hover:text-white hover:bg-cyan-500/20 rounded-full transition-all"
                            title="Mark as Read"
                          >
                              <X size={16} />
                          </button>
                      </div>
                  </div>
              ))}
          </div>
      )}

      {/* Hero */}
      <div className="text-center space-y-8 py-12 lg:py-16 relative overflow-hidden rounded-[3rem] border border-white/5 bg-gray-950/50 backdrop-blur-md shadow-2xl">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-cyan-600/20 to-purple-600/20 blur-[120px] rounded-full pointer-events-none animate-pulse-slow" />
        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/80 border border-slate-700 text-xs font-bold tracking-wider text-cyan-400 mb-2 animate-fade-in shadow-[0_0_15px_rgba(34,211,238,0.2)] backdrop-blur">
             <span className="relative flex h-2 w-2">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
             </span>
             NEXT-GEN AI ECOSYSTEM
          </div>
          <h1 className="text-5xl lg:text-7xl font-black tracking-tighter text-white drop-shadow-2xl px-4">
            EMPOWERING YOUR <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 animate-gradient-xy">DIGITAL EVOLUTION</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto px-4">
              Access the world's most powerful AI tools in one unified dashboard. From creative generation to complex automation, ZamanX is your engine for the future.
          </p>
          {userProfile && (
              <div className="flex flex-wrap justify-center gap-4 text-sm font-mono text-gray-400">
                  <span className="bg-gray-900 px-3 py-1 rounded border border-gray-800 flex items-center gap-2">Plan: <span className="text-white font-bold">{userProfile.plan}</span></span>
                  <span className="bg-gray-900 px-3 py-1 rounded border border-gray-800 flex items-center gap-2">Credits: <span className="text-yellow-400 font-bold">{userProfile.credits || 0}</span></span>
              </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row justify-center gap-6 relative z-10 pt-4 px-4">
          <Button onClick={() => onChangeView(View.CHAT)} className="px-10 py-4 text-lg shadow-[0_0_30px_rgba(6,182,212,0.4)]">Launch Chatbot</Button>
          <Button variant="secondary" onClick={() => onChangeView(View.CONTACT)} className="px-10 py-4 text-lg">Connect Us</Button>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleTools.map((tool) => {
          const locked = isLocked(tool);
          const icon = iconMap[tool.id] || <Zap className="w-6 h-6"/>;
          
          return (
            <div 
              key={tool.id}
              onClick={() => {
                  if(tool.status === 'inactive') return;
                  // Allow access if free OR unlocked OR (Locked but Demo available)
                  if(!locked || tool.demoAvailable) {
                      onChangeView(tool.id as View);
                  } else {
                      setSelectedToolForPurchase(tool);
                  }
              }}
              className={`group relative overflow-hidden rounded-2xl border bg-slate-900/40 p-6 transition-all duration-300 hover:bg-slate-800/60 cursor-pointer hover:-translate-y-2 hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] backdrop-blur-sm ${locked && !tool.demoAvailable ? 'border-red-900/30 opacity-75' : 'border-white/5 hover:border-cyan-500/50'}`}
            >
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-5">
                    <div className={`w-14 h-14 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg ${locked ? 'text-gray-600' : 'text-cyan-400'}`}>
                        {icon}
                    </div>
                    {locked ? (
                        <div className="flex flex-col items-end gap-1">
                             <div className="flex items-center gap-1 bg-red-900/40 px-2 py-1 rounded text-xs text-red-300 font-bold border border-red-500/30 shadow-[0_0_10px_rgba(220,38,38,0.2)]">
                                <Lock size={12} /> {tool.access.toUpperCase()}
                             </div>
                             {tool.demoAvailable && (
                                 <span className="text-[10px] text-green-400 font-bold uppercase tracking-wide bg-green-900/20 px-2 rounded">Demo Mode</span>
                             )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 bg-green-900/30 px-2 py-1 rounded text-xs text-green-400 font-bold border border-green-500/30">
                            <CheckCircle size={12} /> UNLOCKED
                        </div>
                    )}
                </div>

                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">{tool.name}</h3>
                <p className="text-sm text-gray-400 mb-6 flex-1 leading-relaxed">{tool.description}</p>
                
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                  <span className={`${locked ? 'text-gray-500' : 'text-slate-500 group-hover:text-white transition-colors'}`}>
                    {locked ? `Unlock Full Access: ${currencySymbol}${convertPrice(tool.basePriceUSD)}` : 'Launch Tool'}
                  </span>
                  {!locked && tool.status !== 'inactive' && <ArrowRight size={14} className="ml-2 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-cyan-400" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedToolForPurchase && (
          <PaymentModal 
              toolId={selectedToolForPurchase.id}
              toolName={selectedToolForPurchase.name}
              price={convertPrice(selectedToolForPurchase.basePriceUSD)}
              currency={userCurrency}
              onClose={() => setSelectedToolForPurchase(null)}
              onSuccess={() => {
                  window.location.reload();
              }}
          />
      )}
    </div>
  );
};

export default Home;