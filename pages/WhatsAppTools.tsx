
import React, { useState, useRef } from 'react';
import { generateWhatsAppCampaign, generateStoreStructure, generateWhatsAppBotConfig, generateWhatsAppPythonScript, analyzeWhatsAppChat } from '../services/geminiService';
import { useToolContext } from '../contexts/ToolContext';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import { TextArea, Input } from '../components/Input';
import { Phone, ShoppingBag, MessageSquare, Lock, Code, Download, Smartphone, Bot, Terminal, Zap, FileSearch, Upload, QrCode, Wifi, ExternalLink, Link as LinkIcon, Send, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import PaymentModal from '../components/PaymentModal';

const WhatsAppTools: React.FC = () => {
  const { tools, rates, whatsappState, setWhatsappState } = useToolContext();
  const { userProfile } = useAuth();
  
  // Destructure with fallbacks
  const { activeTab } = whatsappState || { activeTab: 'connect' };

  // Helper for safe state updates
  const updateWhatsappState = (updates: any) => {
      setWhatsappState((prev: any) => ({ ...prev, ...updates }));
  };

  const setActiveTab = (tab: string) => updateWhatsappState({ activeTab: tab });

  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  
  // Direct Connect Inputs (Real Tools)
  const [directPhone, setDirectPhone] = useState('');
  const [directMessage, setDirectMessage] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [showQr, setShowQr] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Generator Inputs
  const [product, setProduct] = useState('');
  const [audience, setAudience] = useState('');
  const [goal, setGoal] = useState('');
  const [storeName, setStoreName] = useState('');
  const [storeProducts, setStoreProducts] = useState('');
  const [botBusiness, setBotBusiness] = useState('');
  const [botGoal, setBotGoal] = useState('Customer Support');
  const [botTone, setBotTone] = useState('Professional');
  const [scriptTask, setScriptTask] = useState('');
  const [scriptPreset, setScriptPreset] = useState('');
  const [chatData, setChatData] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  // Check Access
  const toolConfig = tools.find(t => t.id === 'WHATSAPP');
  const isPurchased = userProfile?.purchasedTools?.includes('WHATSAPP');
  const isAccessLocked = toolConfig && toolConfig.access !== 'Free' && userProfile?.role !== 'superadmin' && userProfile?.plan !== 'Pro' && userProfile?.plan !== 'Ultra' && !isPurchased;
  const showDemo = isAccessLocked && toolConfig?.demoAvailable;
  const currency = userProfile?.currency || 'USD';
  const price = Math.ceil((toolConfig?.basePriceUSD || 15) * (rates[currency as keyof typeof rates] || 1));

  // --- Real WhatsApp Logic ---
  const handleOpenWhatsApp = (mode: 'web' | 'app') => {
      // Remove non-numeric chars for the API
      const cleanPhone = directPhone.replace(/\D/g, '');
      const encodedMsg = encodeURIComponent(directMessage);
      
      let url = '';
      if (mode === 'web') {
          url = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}`;
      } else {
          url = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
      }
      
      window.open(url, '_blank');
  };

  const handleGenerateLink = () => {
      const cleanPhone = directPhone.replace(/\D/g, '');
      const encodedMsg = encodeURIComponent(directMessage);
      const link = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
      setGeneratedLink(link);
      setShowQr(true);
  };

  const handleCopyLink = () => {
      navigator.clipboard.writeText(generatedLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
  };

  // --- Generators ---
  const handleCampaignGen = async () => {
      if(!product || !audience) return;
      setIsLoading(true);
      setResult('');
      try {
          const res = await generateWhatsAppCampaign(product, audience, goal, showDemo || false);
          setResult(res);
      } catch(e) { setResult("Error generating campaign."); }
      finally { setIsLoading(false); }
  };

  const handleStoreGen = async () => {
      if(!storeName || !storeProducts) return;
      setIsLoading(true);
      setResult('');
      try {
          const res = await generateStoreStructure(storeName, storeProducts, showDemo || false);
          setResult(res);
      } catch(e) { setResult("Error generating store."); }
      finally { setIsLoading(false); }
  };

  const handleBotGen = async () => {
      if(!botBusiness) return;
      setIsLoading(true);
      setResult('');
      try {
          const res = await generateWhatsAppBotConfig(botBusiness, botGoal, botTone);
          setResult(res);
      } catch(e) { setResult("Error generating bot config."); }
      finally { setIsLoading(false); }
  };

  const handleScriptGen = async () => {
      const task = scriptPreset || scriptTask;
      if(!task) return;
      setIsLoading(true);
      setResult('');
      try {
          const res = await generateWhatsAppPythonScript(task);
          setResult(res);
      } catch(e) { setResult("Error generating script."); }
      finally { setIsLoading(false); }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
          setChatData(e.target?.result as string);
      };
      reader.readAsText(file);
  };

  const handleAnalyzeChat = async () => {
      if (!chatData.trim()) return;
      setIsLoading(true);
      setResult('');
      try {
          const res = await analyzeWhatsAppChat(chatData);
          setResult(res);
      } catch(e) { setResult("Error analyzing chat."); }
      finally { setIsLoading(false); }
  };

  const loadDemoChat = () => {
      const demo = `[24/05/2024, 10:15:30] John: Hey, are we still on for the project meeting?
[24/05/2024, 10:16:00] Sarah: Yes! I'm almost done with the slides.
[24/05/2024, 10:20:15] John: Great. Remember to include the Q2 stats.
[24/05/2024, 10:21:00] Sarah: Already did. They look promising.
[24/05/2024, 11:00:00] Boss: Meeting in 5 mins.
[24/05/2024, 11:01:00] John: Joining now.`;
      setChatData(demo);
  };

  const handleDownloadCode = () => {
      if (isAccessLocked) {
          setShowPayment(true);
          return;
      }
      const blob = new Blob([result], { type: activeTab === 'store' ? 'text/html' : 'text/plain' });
      const url = URL.createObjectURL(blob);
      const ext = activeTab === 'store' ? 'html' : (activeTab === 'automation' ? 'py' : 'txt');
      const link = document.createElement('a');
      link.href = url;
      link.download = `zamanx-${activeTab}-${Date.now()}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-20">
        <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-2">
                <Phone className="text-green-500" /> WhatsApp Growth Suite
            </h2>
            <p className="text-gray-400">Real WhatsApp Tools, Marketing Campaigns, and Automation Scripts.</p>
            {isAccessLocked && (
                <div className="mt-4 inline-flex items-center gap-2 bg-yellow-900/30 text-yellow-400 px-4 py-2 rounded-full text-xs font-bold border border-yellow-500/30">
                    <Lock size={12}/> Demo Mode Active - Purchase to Unlock Source Code & Full Features
                </div>
            )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Input Section */}
            <div className="lg:col-span-1 bg-gray-900 p-6 rounded-2xl border border-gray-800 space-y-6 h-fit shadow-xl">
                <div className="flex flex-wrap gap-2 p-1 bg-gray-950 rounded-xl border border-gray-800">
                    <button onClick={() => {setActiveTab('connect');}} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'connect' ? 'bg-green-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>Direct</button>
                    <button onClick={() => {setActiveTab('campaign'); setResult('');}} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'campaign' ? 'bg-green-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>Ads</button>
                    <button onClick={() => {setActiveTab('store'); setResult('');}} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'store' ? 'bg-green-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>Store</button>
                    <button onClick={() => {setActiveTab('agent'); setResult('');}} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'agent' ? 'bg-green-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>Agent</button>
                    <button onClick={() => {setActiveTab('automation'); setResult('');}} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'automation' ? 'bg-green-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>Auto</button>
                    <button onClick={() => {setActiveTab('analyzer'); setResult('');}} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'analyzer' ? 'bg-green-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>Scan</button>
                </div>

                {activeTab === 'connect' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="space-y-4">
                            <h3 className="text-white font-bold flex items-center gap-2">
                                <Wifi size={18} className="text-green-500"/> Direct Chat & Link
                            </h3>
                            <Input 
                                label="Phone Number (w/ Country Code)" 
                                placeholder="e.g. 923001234567" 
                                value={directPhone} 
                                onChange={e => setDirectPhone(e.target.value)} 
                            />
                            <TextArea 
                                label="Pre-filled Message" 
                                placeholder="Hello, I am interested in your services..." 
                                value={directMessage}
                                onChange={e => setDirectMessage(e.target.value)}
                                rows={3}
                            />
                            
                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <Button 
                                    onClick={() => handleOpenWhatsApp('web')} 
                                    disabled={!directPhone} 
                                    className="!bg-gray-800 border border-gray-600 hover:!bg-gray-700 text-xs"
                                    icon={<ExternalLink size={14}/>}
                                >
                                    Open Web
                                </Button>
                                <Button 
                                    onClick={() => handleOpenWhatsApp('app')} 
                                    disabled={!directPhone} 
                                    className="!bg-green-600 hover:!bg-green-500 text-xs"
                                    icon={<Send size={14}/>}
                                >
                                    Open App
                                </Button>
                            </div>
                            
                            <Button 
                                onClick={handleGenerateLink}
                                disabled={!directPhone}
                                className="w-full !bg-blue-600 hover:!bg-blue-500"
                                icon={<LinkIcon size={16}/>}
                            >
                                Generate Link & QR
                            </Button>
                        </div>
                        
                        <div className="bg-black/30 p-4 rounded-xl border border-gray-800 text-xs text-gray-400 leading-relaxed">
                            <p className="flex items-start gap-2">
                                <Smartphone size={14} className="mt-0.5 text-green-500 shrink-0"/>
                                <span>Use this tool to start a chat without saving the number to your contacts. This uses official WhatsApp APIs.</span>
                            </p>
                        </div>
                    </div>
                )}

                {activeTab === 'campaign' && (
                    <div className="space-y-4 animate-fade-in">
                        <Input label="Product Name" value={product} onChange={e=>setProduct(e.target.value)} placeholder="e.g. Smart Watch Ultra" />
                        <Input label="Target Audience" value={audience} onChange={e=>setAudience(e.target.value)} placeholder="e.g. Fitness enthusiasts" />
                        <Input label="Campaign Goal" value={goal} onChange={e=>setGoal(e.target.value)} placeholder="e.g. Drive 50 sales" />
                        <Button onClick={handleCampaignGen} disabled={isLoading || !product} className="w-full !bg-green-600" icon={<MessageSquare size={18}/>}>
                            {isLoading ? 'Generating...' : (showDemo ? 'Generate Demo' : 'Generate Full Campaign')}
                        </Button>
                    </div>
                )}

                {activeTab === 'store' && (
                    <div className="space-y-4 animate-fade-in">
                        <Input label="Store Name" value={storeName} onChange={e=>setStoreName(e.target.value)} placeholder="e.g. TechZone PK" />
                        <TextArea label="Products & Prices" value={storeProducts} onChange={e=>setStoreProducts(e.target.value)} placeholder="E.g. AirPods Pro ($20), Smart Watch ($30)..." rows={4} />
                        <Button onClick={handleStoreGen} disabled={isLoading || !storeName} className="w-full !bg-green-600" icon={<ShoppingBag size={18}/>}>
                            {isLoading ? 'Building...' : (showDemo ? 'Build Demo Store' : 'Build Complete Store')}
                        </Button>
                    </div>
                )}

                {activeTab === 'agent' && (
                    <div className="space-y-4 animate-fade-in">
                        <Input label="Business Name" value={botBusiness} onChange={e=>setBotBusiness(e.target.value)} placeholder="e.g. Real Estate Agency" />
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Bot Goal</label>
                            <select value={botGoal} onChange={e=>setBotGoal(e.target.value)} className="w-full bg-black/40 border border-gray-700 rounded-lg p-2 text-white">
                                <option>Customer Support</option>
                                <option>Sales & Closing</option>
                                <option>Appointment Booking</option>
                                <option>Lead Qualification</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Tone</label>
                            <select value={botTone} onChange={e=>setBotTone(e.target.value)} className="w-full bg-black/40 border border-gray-700 rounded-lg p-2 text-white">
                                <option>Professional</option>
                                <option>Friendly & Casual</option>
                                <option>Urgent / Salesy</option>
                                <option>Empathetic</option>
                            </select>
                        </div>
                        <Button onClick={handleBotGen} disabled={isLoading || !botBusiness} className="w-full !bg-green-600" icon={<Bot size={18}/>}>
                            {isLoading ? 'Architecting...' : 'Design AI Agent'}
                        </Button>
                    </div>
                )}

                {activeTab === 'automation' && (
                    <div className="space-y-4 animate-fade-in">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Quick Scripts</label>
                            <select value={scriptPreset} onChange={e=>{setScriptPreset(e.target.value); setScriptTask('');}} className="w-full bg-black/40 border border-gray-700 rounded-lg p-2 text-white">
                                <option value="">-- Select Automation --</option>
                                <option value="Bulk Message Sender from CSV">Bulk Message Sender (CSV)</option>
                                <option value="Extract Group Contacts">Extract Group Contacts</option>
                                <option value="Auto-Reply to Unknown Numbers">Auto-Reply to Unknowns</option>
                                <option value="Send Image to Multiple Contacts">Send Image to Bulk</option>
                            </select>
                        </div>
                        <TextArea label="Custom Task Description" value={scriptTask} onChange={e=>{setScriptTask(e.target.value); setScriptPreset('');}} placeholder="Or describe a custom automation task..." rows={3} />
                        <Button onClick={handleScriptGen} disabled={isLoading || (!scriptTask && !scriptPreset)} className="w-full !bg-green-600" icon={<Terminal size={18}/>}>
                            {isLoading ? 'Coding...' : 'Generate Script'}
                        </Button>
                    </div>
                )}

                {activeTab === 'analyzer' && (
                    <div className="space-y-4 animate-fade-in">
                        <div 
                            className="border-2 border-dashed border-gray-700 hover:border-green-500 bg-black/40 rounded-xl h-32 flex flex-col items-center justify-center cursor-pointer transition-all"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload size={24} className="text-gray-500 mb-2"/>
                            <p className="text-xs text-gray-400">Upload _chat.txt</p>
                            <input type="file" ref={fileInputRef} className="hidden" accept=".txt" onChange={handleFileUpload} />
                        </div>
                        
                        <div className="flex justify-between items-center text-xs text-gray-500">
                            <span>{chatData ? "File Loaded" : "No file selected"}</span>
                            <button onClick={loadDemoChat} className="text-green-400 hover:underline">Use Demo Data</button>
                        </div>

                        <Button onClick={handleAnalyzeChat} disabled={isLoading || !chatData} className="w-full !bg-green-600" icon={<FileSearch size={18}/>}>
                            {isLoading ? 'Analyzing...' : 'Investigate Chat'}
                        </Button>
                        <p className="text-[10px] text-gray-500 text-center">AI analyzes relationships, sentiment, and activity patterns.</p>
                    </div>
                )}
            </div>

            {/* Output Section */}
            <div className="lg:col-span-2 bg-gray-900 rounded-2xl border border-gray-800 flex flex-col overflow-hidden min-h-[600px] relative shadow-xl">
                <div className="bg-gray-800 px-4 py-3 border-b border-gray-700 flex justify-between items-center">
                    <div className="flex gap-2">
                         {activeTab === 'store' ? (
                             <>
                                <button onClick={()=>setViewMode('preview')} className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded ${viewMode==='preview'?'bg-gray-700 text-white':'text-gray-400'}`}><Smartphone size={14}/> Preview</button>
                                <button onClick={()=>{if(isAccessLocked) setShowPayment(true); else setViewMode('code');}} className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded ${viewMode==='code'?'bg-gray-700 text-white':'text-gray-400'} ${isAccessLocked ? 'opacity-75':''}`}>{isAccessLocked?<Lock size={12}/>:<Code size={14}/>} Code</button>
                             </>
                         ) : activeTab === 'connect' ? (
                             <span className="text-green-400 text-sm font-bold flex items-center gap-2"><Wifi size={16}/> Direct Connect</span>
                         ) : (
                             <span className="text-gray-400 text-sm font-bold flex items-center gap-2"><Zap size={16}/> {activeTab === 'agent' ? 'System Instruction' : activeTab === 'analyzer' ? 'Forensic Report' : (activeTab === 'automation' ? 'Python Code' : 'Campaign Output')}</span>
                         )}
                    </div>
                    {activeTab !== 'connect' && (
                        <button 
                            onClick={handleDownloadCode} 
                            className={`flex items-center gap-2 text-xs font-bold px-4 py-1.5 rounded transition-all ${isAccessLocked && activeTab !== 'campaign' ? 'bg-yellow-600 hover:bg-yellow-500 text-white' : 'bg-green-600 hover:bg-green-500 text-white'}`}
                        >
                            {isAccessLocked && activeTab !== 'campaign' ? <Lock size={14}/> : <Download size={14}/>}
                            {isAccessLocked && activeTab !== 'campaign' ? `Unlock (${currency} ${price})` : 'Download'}
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-hidden bg-gray-950 relative">
                    {activeTab === 'connect' ? (
                        <div className="absolute inset-0 bg-black flex flex-col items-center justify-center p-8 space-y-8">
                            {!generatedLink ? (
                                <div className="text-center text-gray-500 opacity-60">
                                    <Smartphone size={64} className="mx-auto mb-4"/>
                                    <p className="text-sm">Enter a phone number to generate a direct link or QR code.</p>
                                </div>
                            ) : (
                                <div className="bg-white p-6 rounded-2xl shadow-2xl animate-fade-in flex flex-col items-center gap-6 max-w-sm w-full">
                                    <h3 className="text-black font-bold text-lg">Scan to Chat</h3>
                                    {showQr && (
                                        <div className="border-4 border-green-500/20 p-2 rounded-xl">
                                            <img 
                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(generatedLink)}`} 
                                                alt="WhatsApp QR Code" 
                                                className="w-48 h-48 object-contain"
                                            />
                                        </div>
                                    )}
                                    <div className="w-full space-y-3">
                                        <div className="flex items-center gap-2 bg-gray-100 p-3 rounded-lg border border-gray-200">
                                            <span className="text-gray-600 text-xs font-mono truncate flex-1">{generatedLink}</span>
                                            <button onClick={handleCopyLink} className="text-green-600 hover:text-green-700">
                                                {copiedLink ? <Check size={16}/> : <Copy size={16}/>}
                                            </button>
                                        </div>
                                        <Button onClick={() => window.open(generatedLink, '_blank')} className="w-full !bg-green-600 hover:!bg-green-500">
                                            Open Link
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : !result ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600">
                             <div className="p-4 bg-gray-900/50 rounded-full mb-4">
                                {activeTab === 'store' ? <ShoppingBag size={48}/> : activeTab === 'agent' ? <Bot size={48}/> : activeTab === 'automation' ? <Terminal size={48}/> : activeTab === 'analyzer' ? <FileSearch size={48}/> : <MessageSquare size={48}/>}
                             </div>
                             <p>Output will appear here</p>
                        </div>
                    ) : (
                        activeTab === 'store' && viewMode === 'preview' ? (
                            <iframe 
                                srcDoc={result} 
                                title="Store Preview" 
                                className="w-full h-full border-0 bg-white"
                                sandbox="allow-scripts"
                                onContextMenu={(e) => { if(isAccessLocked) e.preventDefault(); }}
                            />
                        ) : activeTab === 'automation' ? (
                            <div className="relative h-full">
                                <pre className="p-6 overflow-y-auto h-full text-xs font-mono text-green-400 bg-black custom-scrollbar">
                                    {result}
                                </pre>
                            </div>
                        ) : (
                            <div className="p-6 overflow-y-auto h-full text-gray-300 custom-scrollbar">
                                 <ReactMarkdown className="prose prose-invert prose-green max-w-none">
                                     {result}
                                 </ReactMarkdown>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>

        {showPayment && toolConfig && (
            <PaymentModal 
                toolId={toolConfig.id}
                toolName={toolConfig.name}
                price={price}
                currency={currency}
                onClose={() => setShowPayment(false)}
                onSuccess={() => {
                    window.location.reload();
                }}
            />
        )}
    </div>
  );
};

export default WhatsAppTools;
