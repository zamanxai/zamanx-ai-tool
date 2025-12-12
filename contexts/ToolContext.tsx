import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { ChatMessage, HistoryItem, ToolConfig, ConversionRates, Notification, ContactDetails } from '../types';
import { db } from '../firebaseConfig';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { setDynamicApiKey } from '../services/geminiService';

interface ToolContextType {
  tools: ToolConfig[];
  rates: ConversionRates;
  notifications: Notification[];
  contactDetails: ContactDetails;
  
  // API Key State
  globalApiKey: string;
  setGlobalApiKey: (key: string) => void;
  keyStatus: { status: 'active' | 'missing' | 'expired'; usage: number; limit: number };

  // State Containers
  chatState: any; setChatState: (s:any)=>void;
  imageState: any; setImageState: (s:any)=>void;
  textState: any; setTextState: (s:any)=>void;
  codeState: any; setCodeState: (s:any)=>void;
  voiceState: any; setVoiceState: (s:any)=>void;
  dataState: any; setDataState: (s:any)=>void;
  visionState: any; setVisionState: (s:any)=>void;
  mathState: any; setMathState: (s:any)=>void;
  dreamState: any; setDreamState: (s:any)=>void;
  studyState: any; setStudyState: (s:any)=>void;
  socialState: any; setSocialState: (s:any)=>void;
  resumeState: any; setResumeState: (s:any)=>void;
  avatarState: any; setAvatarState: (s:any)=>void;
  legalState: any; setLegalState: (s:any)=>void;
  fitnessState: any; setFitnessState: (s:any)=>void;
  automationState: any; setAutomationState: (s:any)=>void;
  whatsappState: any; setWhatsappState: (s:any)=>void;
  adCreatorState: any; setAdCreatorState: (s:any)=>void;

  history: HistoryItem[];
  addToHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
  deleteFromHistory: (id: string) => void;
  clearHistory: (tool?: string) => void;
}

const ToolContext = createContext<ToolContextType>({} as ToolContextType);

export const useToolContext = () => useContext(ToolContext);

export const ToolProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tools, setTools] = useState<ToolConfig[]>([]);
  const [rates, setRates] = useState<ConversionRates>({ USD: 1, PKR: 278, INR: 83, AED: 3.67 });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [contactDetails, setContactDetails] = useState<ContactDetails>({
      phone: '0343 3498450',
      email: 'contact@zamanx.ai',
      whatsappLink: 'https://wa.me/923433498450',
      address: 'Islamabad, Pakistan',
      supportHours: '9 AM - 6 PM PKT'
  });

  // --- Global API Key Logic ---
  const [globalApiKey, setGlobalApiKeyState] = useState('');
  const [keyStatus, setKeyStatus] = useState<{ status: 'active' | 'missing' | 'expired'; usage: number; limit: number }>({ 
      status: 'missing', usage: 0, limit: 1000 
  });

  // Initialize and Sync Key
  useEffect(() => {
    const loadKey = () => {
        const storedKey = localStorage.getItem('zamanx_api_key');
        const storedUsage = localStorage.getItem('zamanx_key_usage');
        
        if (storedKey) {
            setGlobalApiKeyState(storedKey);
            setKeyStatus({ 
                status: 'active', 
                usage: storedUsage ? parseInt(storedUsage) : 0, 
                limit: 1000 
            });
            // Ensure service is synced
            setDynamicApiKey(storedKey);
        } else {
            setGlobalApiKeyState('');
            setKeyStatus({ status: 'missing', usage: 0, limit: 0 });
            setDynamicApiKey('');
        }
    };

    loadKey();

    // Listen for storage events (cross-tab sync)
    const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'zamanx_api_key' || e.key === 'zamanx_key_usage') {
            loadKey();
        }
    };

    // Custom event for same-tab updates
    const handleLocalKeyUpdate = () => loadKey();

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('zamanx-key-update', handleLocalKeyUpdate);

    return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('zamanx-key-update', handleLocalKeyUpdate);
    };
  }, []);

  const setGlobalApiKey = (key: string) => {
      if (key) {
          localStorage.setItem('zamanx_api_key', key);
          localStorage.setItem('zamanx_key_created', Date.now().toString());
          if (!localStorage.getItem('zamanx_key_usage')) {
              localStorage.setItem('zamanx_key_usage', '0');
          }
      } else {
          localStorage.removeItem('zamanx_api_key');
          localStorage.removeItem('zamanx_key_usage');
          localStorage.removeItem('zamanx_key_created');
      }
      
      // Dispatch custom event to trigger update in same tab
      window.dispatchEvent(new Event('zamanx-key-update'));
  };

  // --- Firestore Listeners ---
  useEffect(() => {
     const unsubscribeTools = onSnapshot(collection(db, "tools"), (snapshot) => {
         const seedTools: ToolConfig[] = [
             { id: 'CHAT', name: 'AI Chatbot', description: 'Intelligent conversation', category: 'Text', status: 'active', visibility: 'visible', access: 'Free', basePriceUSD: 0, demoAvailable: false },
             { id: 'IMAGE', name: 'Image Generator', description: 'Create stunning art', category: 'Image', status: 'active', visibility: 'visible', access: 'Basic', basePriceUSD: 5, demoAvailable: true },
             { id: 'AD_CREATOR', name: 'Ad Creator 360', description: 'Generate business ads & visuals', category: 'Marketing', status: 'active', visibility: 'visible', access: 'Pro', basePriceUSD: 10, demoAvailable: true },
             { id: 'WHATSAPP', name: 'WhatsApp Growth Suite', description: 'Campaigns & Store Builder', category: 'Marketing', status: 'active', visibility: 'visible', access: 'Pro', basePriceUSD: 15, demoAvailable: true },
             { id: 'PLANNER', name: 'Viral Content Planner', description: '30-Day Content Calendar', category: 'Marketing', status: 'active', visibility: 'visible', access: 'Pro', basePriceUSD: 12, demoAvailable: true },
             { id: 'CODE', name: 'Code Architect', description: 'Generate & Debug code', category: 'Dev', status: 'active', visibility: 'visible', access: 'Pro', basePriceUSD: 10, demoAvailable: false },
             { id: 'AUTOMATION', name: 'AI Automation', description: 'Workflow & Script Bots', category: 'Productivity', status: 'active', visibility: 'visible', access: 'Pro', basePriceUSD: 12, demoAvailable: true },
             { id: 'VISION', name: 'AI Vision', description: 'Analyze images', category: 'Image', status: 'active', visibility: 'visible', access: 'Pro', basePriceUSD: 8, demoAvailable: false },
             { id: 'VIDEO', name: 'Video Creator', description: 'Text to Video', category: 'Video', status: 'active', visibility: 'visible', access: 'Ultra', basePriceUSD: 20, demoAvailable: false },
             { id: 'VOICE', name: 'Voice Tools', description: 'TTS & STT', category: 'Audio', status: 'active', visibility: 'visible', access: 'Basic', basePriceUSD: 5, demoAvailable: false },
             { id: 'RESUME', name: 'Resume Builder', description: 'Optimize your CV', category: 'Career', status: 'active', visibility: 'visible', access: 'Free', basePriceUSD: 0, demoAvailable: false },
             { id: 'LEGAL', name: 'Legal Advisor', description: 'Legal guidance', category: 'Professional', status: 'active', visibility: 'visible', access: 'Pro', basePriceUSD: 15, demoAvailable: false },
             { id: 'FITNESS', name: 'Fitness Coach', description: 'Workout plans', category: 'Lifestyle', status: 'active', visibility: 'visible', access: 'Free', basePriceUSD: 0, demoAvailable: false },
             { id: 'STUDY', name: 'Study Helper', description: 'Academic assistance', category: 'Education', status: 'active', visibility: 'visible', access: 'Free', basePriceUSD: 0, demoAvailable: false },
             { id: 'MATH', name: 'Math Genius', description: 'Complex solving', category: 'Education', status: 'active', visibility: 'visible', access: 'Basic', basePriceUSD: 3, demoAvailable: false },
             { id: 'DREAM', name: 'Dream Interpreter', description: 'Symbolism analysis', category: 'Lifestyle', status: 'active', visibility: 'visible', access: 'Free', basePriceUSD: 0, demoAvailable: false },
             { id: 'ANALYZER', name: 'Data Lab', description: 'Data analysis', category: 'Business', status: 'active', visibility: 'visible', access: 'Pro', basePriceUSD: 12, demoAvailable: false },
             { id: 'AVATAR', name: 'Avatar Studio', description: 'Profile pics', category: 'Image', status: 'active', visibility: 'visible', access: 'Basic', basePriceUSD: 4, demoAvailable: true },
             { id: 'SOCIAL', name: 'Social Manager', description: 'Viral posts generator', category: 'Marketing', status: 'active', visibility: 'visible', access: 'Free', basePriceUSD: 0, demoAvailable: false },
             { id: 'CONTACT', name: 'Contact Us', description: 'Support', category: 'System', status: 'active', visibility: 'visible', access: 'Free', basePriceUSD: 0, demoAvailable: false },
         ];

         if (snapshot.empty) {
             seedTools.forEach(t => setDoc(doc(db, "tools", t.id), t));
         } else {
             const dbTools = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ToolConfig));
             seedTools.forEach(seed => {
                 if (!dbTools.find(d => d.id === seed.id)) {
                     setDoc(doc(db, "tools", seed.id), seed);
                 }
             });
             setTools(dbTools);
         }
     });

     const unsubscribeRates = onSnapshot(doc(db, "admin_settings", "currency_rates"), (doc) => {
         if (doc.exists()) setRates(doc.data() as ConversionRates);
     });

     const unsubscribeNotes = onSnapshot(collection(db, "notifications"), (snap) => {
         setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification)));
     });
     
     const unsubscribeContact = onSnapshot(doc(db, "admin_settings", "contact_info"), (doc) => {
         if (doc.exists()) setContactDetails(doc.data() as ContactDetails);
     });

     return () => {
         unsubscribeTools();
         unsubscribeRates();
         unsubscribeNotes();
         unsubscribeContact();
     };
  }, []);

  // Tool States
  const [chatState, setChatState] = useState({ messages: [], input: '', persona: 'Default' });
  const [imageState, setImageState] = useState({ prompt: '', results: [], style: 'None', aspectRatio: '1:1', count: 1, negativePrompt: '' });
  const [textState, setTextState] = useState({ input: '', output: '', activeTab: 'summarizer', extraInput: '' });
  const [codeState, setCodeState] = useState({ prompt: '', code: '', output: '', language: 'JavaScript', action: 'Generate' });
  const [voiceState, setVoiceState] = useState({ activeTab: 'tts', textInput: '', transcription: '', selectedVoice: 'Kore' });
  const [dataState, setDataState] = useState({ dataInput: '', query: '', result: '' });
  const [visionState, setVisionState] = useState({ image: null, prompt: '', result: '', mimeType: '' });
  const [mathState, setMathState] = useState({ problem: '', solution: '' });
  const [dreamState, setDreamState] = useState({ dream: '', interpretation: '' });
  const [studyState, setStudyState] = useState({ activeTab: 'text', inputText: '', result: '', fileData: null });
  const [socialState, setSocialState] = useState({ topic: '', platform: 'Twitter', tone: 'Viral', result: '' });
  const [resumeState, setResumeState] = useState({ currentResume: '', jobDesc: '', goal: 'Improve', result: '' });
  const [avatarState, setAvatarState] = useState({ description: '', style: '3D Render', result: null });
  const [legalState, setLegalState] = useState({ query: '', result: '' });
  const [fitnessState, setFitnessState] = useState({ stats: '', goal: 'Build Muscle', plan: '' });
  const [automationState, setAutomationState] = useState({ activeTab: 'workflow', input: '', output: '' });
  const [whatsappState, setWhatsappState] = useState({ isConnected: false, logs: [], settings: { aiEnabled: false, groupsAllowed: false, smartReply: true }, activeTab: 'connect' });
  const [adCreatorState, setAdCreatorState] = useState({ businessName: '', productDesc: '', audience: '', platform: 'Facebook', tone: 'Professional', generatedCopy: '', generatedImage: null as string | null });

  // History
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('zamanx_global_history');
        return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('zamanx_global_history', JSON.stringify(history));
    }
  }, [history]);

  const addToHistory = (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    const newItem: HistoryItem = { ...item, id: Date.now().toString(), timestamp: Date.now() };
    setHistory(prev => [newItem, ...prev].slice(0, 50));
  };
  const deleteFromHistory = (id: string) => setHistory(prev => prev.filter(item => item.id !== id));
  const clearHistory = (tool?: string) => tool ? setHistory(prev => prev.filter(item => item.tool !== tool)) : setHistory([]);

  const value = {
    tools, rates, notifications, contactDetails,
    globalApiKey, setGlobalApiKey, keyStatus,
    chatState, setChatState,
    imageState, setImageState,
    textState, setTextState,
    codeState, setCodeState,
    voiceState, setVoiceState,
    dataState, setDataState,
    visionState, setVisionState,
    mathState, setMathState,
    dreamState, setDreamState,
    studyState, setStudyState,
    socialState, setSocialState,
    resumeState, setResumeState,
    avatarState, setAvatarState,
    legalState, setLegalState,
    fitnessState, setFitnessState,
    automationState, setAutomationState,
    whatsappState, setWhatsappState,
    adCreatorState, setAdCreatorState,
    history, addToHistory, deleteFromHistory, clearHistory
  };

  return <ToolContext.Provider value={value}>{children}</ToolContext.Provider>;
};