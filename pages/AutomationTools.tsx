
import React, { useState, useEffect } from 'react';
import { generateText, analyzeCode } from '../services/geminiService';
import { useToolContext } from '../contexts/ToolContext';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import { TextArea } from '../components/Input';
import PaymentModal from '../components/PaymentModal';
import { Workflow, Bot, FileCode, CheckCircle, Zap, Lock, Download, Copy, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import HistorySidebar from '../components/HistorySidebar';

const AutomationTools: React.FC = () => {
  const { automationState, setAutomationState, addToHistory, tools, rates } = useToolContext();
  const { userProfile } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'workflow' | 'script'>(automationState.activeTab as any);
  const [input, setInput] = useState(automationState.input);
  const [output, setOutput] = useState(automationState.output);
  const [isLoading, setIsLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  useEffect(() => {
    setAutomationState({ activeTab, input, output });
  }, [activeTab, input, output, setAutomationState]);

  // --- Access Control ---
  const toolConfig = tools.find(t => t.id === 'AUTOMATION');
  const isPurchased = userProfile?.purchasedTools?.includes('AUTOMATION');
  const userPlanLevel = { 'Free': 0, 'Basic': 1, 'Pro': 2, 'Ultra': 3 }[userProfile?.plan || 'Free'] || 0;
  const toolAccessLevel = { 'Free': 0, 'Basic': 1, 'Pro': 2, 'Ultra': 3 }[toolConfig?.access || 'Free'] || 0;
  const isAccessLocked = toolConfig && userPlanLevel < toolAccessLevel && !isPurchased && userProfile?.role !== 'superadmin';
  const showDemo = isAccessLocked && toolConfig?.demoAvailable;
  
  const currency = userProfile?.currency || 'USD';
  const price = Math.ceil((toolConfig?.basePriceUSD || 12) * (rates[currency as keyof typeof rates] || 1));

  const handleGenerate = async () => {
    if (!input.trim()) return;
    
    if (isAccessLocked && !showDemo) {
        setShowPayment(true);
        return;
    }

    setIsLoading(true);
    setOutput('');

    try {
        let result = "";
        if (activeTab === 'workflow') {
            const prompt = `Act as an Automation Architect. Design a detailed workflow for: "${input}". 
            Break it down into steps: Trigger, Actions, Filters, and Logic.
            Suggest tools like Zapier, Make.com, or n8n.
            Format clearly. ${showDemo ? '(DEMO MODE: Provide only the first 2 steps)' : ''}`;
            result = await generateText(prompt);
        } else {
            const prompt = `Write a production-ready script (Python or Node.js) to automate: "${input}".
            Include comments, error handling, and required library imports.
            ${showDemo ? '(DEMO MODE: Provide only the boilerplate setup code, no core logic)' : ''}`;
            result = await analyzeCode(prompt);
        }
        setOutput(result);

        if (!showDemo) {
            addToHistory({
                tool: 'AUTOMATION',
                type: activeTab === 'script' ? 'code' : 'text',
                prompt: `${activeTab.toUpperCase()}: ${input.substring(0,30)}...`,
                content: result,
                metadata: { activeTab }
            });
        }

    } catch (error) {
        setOutput("Error generating automation. Please try again.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleDownload = () => {
      if (isAccessLocked) { setShowPayment(true); return; }
      const blob = new Blob([output], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `zamanx-automation-${Date.now()}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const restoreHistory = (item: any) => {
      setOutput(item.content);
      if (item.metadata?.activeTab) setActiveTab(item.metadata.activeTab);
      setIsHistoryOpen(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in h-full flex flex-col relative">
       <div className="flex items-center justify-between mb-4">
         <div className="flex items-center gap-3">
             <div className="p-3 bg-indigo-600/20 rounded-lg text-indigo-400">
               <Workflow size={24} />
             </div>
             <div>
               <h2 className="text-2xl font-bold text-white">AI Automation Hub</h2>
               <p className="text-gray-400 text-sm">Design workflows and generate scripts to automate your tasks.</p>
             </div>
         </div>
         <div className="flex gap-2">
             {isAccessLocked && (
                <div className="inline-flex items-center gap-2 bg-yellow-900/30 text-yellow-400 px-3 py-1.5 rounded-full text-xs font-bold border border-yellow-500/30 cursor-pointer" onClick={() => setShowPayment(true)}>
                    <Lock size={12}/> {showDemo ? "Demo Mode" : "Locked"}
                </div>
             )}
             <Button variant="ghost" onClick={() => setIsHistoryOpen(true)}><Clock size={20}/></Button>
         </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
          <div className="space-y-4 flex flex-col">
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 flex-1 flex flex-col gap-6">
               
               <div className="flex gap-2 p-1 bg-gray-800 rounded-lg">
                   <button 
                     onClick={() => { setActiveTab('workflow'); setOutput(''); }}
                     className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 rounded-md transition-all ${activeTab === 'workflow' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                   >
                       <Zap size={16} /> Workflow Architect
                   </button>
                   <button 
                     onClick={() => { setActiveTab('script'); setOutput(''); }}
                     className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 rounded-md transition-all ${activeTab === 'script' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                   >
                       <Bot size={16} /> Script Bot
                   </button>
               </div>

               <TextArea 
                 label={activeTab === 'workflow' ? "Describe your process" : "Describe the script task"} 
                 placeholder={activeTab === 'workflow' 
                    ? "E.g., When a new lead fills a Facebook Ad form, send them a welcome email and add them to Google Sheets..." 
                    : "E.g., Python script to scrape product prices from a URL and save to CSV..."} 
                 value={input}
                 onChange={(e) => setInput(e.target.value)}
                 className="h-64 text-lg"
               />

               <Button 
                 onClick={handleGenerate} 
                 disabled={isLoading || !input.trim()} 
                 className="!bg-indigo-600 hover:!bg-indigo-500 w-full py-4 text-lg shadow-[0_0_20px_rgba(79,70,229,0.4)]" 
                 icon={isAccessLocked && !showDemo ? <Lock size={20}/> : (activeTab === 'workflow' ? <Zap size={20} /> : <FileCode size={20} />)}
               >
                 {isLoading ? 'Processing...' : (isAccessLocked && !showDemo ? `Unlock (${currency} ${price})` : (activeTab === 'workflow' ? 'Build Workflow' : 'Generate Script'))}
               </Button>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-800 flex flex-col overflow-hidden shadow-2xl">
             <div className="bg-gray-800 px-6 py-4 border-b border-gray-700 flex justify-between items-center">
               <span className="font-bold text-gray-200 flex items-center gap-2">
                   {activeTab === 'workflow' ? <Workflow size={18} className="text-indigo-400"/> : <Bot size={18} className="text-indigo-400"/>} 
                   Generated Output
               </span>
               <div className="flex gap-2">
                   {output && (
                       <button onClick={handleDownload} className="text-gray-400 hover:text-white">
                           {isAccessLocked ? <Lock size={16}/> : <Download size={16}/>}
                       </button>
                   )}
               </div>
             </div>
             <div className="flex-1 p-6 overflow-y-auto bg-gray-950 text-gray-300 custom-scrollbar">
                {output ? (
                  <div className={`prose prose-invert prose-indigo max-w-none ${activeTab === 'script' ? 'font-mono text-xs' : ''}`}>
                    <ReactMarkdown>{output}</ReactMarkdown>
                    <div className="mt-8 pt-6 border-t border-gray-800 flex items-center justify-center gap-2 text-indigo-400/50 font-mono text-xs">
                        <CheckCircle size={12} /> {showDemo ? "Demo Output" : "Logic Validated by ZamanX"}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-4">
                    <Workflow size={64} className="opacity-10 animate-pulse" />
                    <p className="font-medium">Waiting for your input...</p>
                  </div>
                )}
             </div>
          </div>
       </div>

       <HistorySidebar 
         isOpen={isHistoryOpen} 
         onClose={() => setIsHistoryOpen(false)} 
         toolFilter="AUTOMATION"
         onRestore={restoreHistory}
       />

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

export default AutomationTools;
