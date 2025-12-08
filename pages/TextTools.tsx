
import React, { useState, useEffect } from 'react';
import { generateText } from '../services/geminiService';
import { logActivity } from '../services/loggingService';
import { useAuth } from '../contexts/AuthContext';
import { useToolContext } from '../contexts/ToolContext';
import Button from '../components/Button';
import { TextArea, Input } from '../components/Input';
import HistorySidebar from '../components/HistorySidebar';
import { FileText, Languages, PenTool, Copy, Check, Clock, SpellCheck, Wand2, AlignLeft, RefreshCcw } from 'lucide-react';

const TextTools: React.FC = () => {
  const { currentUser } = useAuth();
  const { textState, setTextState, addToHistory } = useToolContext();
  
  const [activeTab, setActiveTab] = useState<'summarizer' | 'translator' | 'writer' | 'grammar' | 'tone'>(textState.activeTab as any);
  const [input, setInput] = useState(textState.input);
  const [extraInput, setExtraInput] = useState(textState.extraInput);
  const [output, setOutput] = useState(textState.output);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Text Stats
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [readTime, setReadTime] = useState(0);

  useEffect(() => {
    setTextState({ activeTab, input, extraInput, output });
  }, [activeTab, input, extraInput, output, setTextState]);

  useEffect(() => {
    const text = input.trim();
    const words = text ? text.split(/\s+/).length : 0;
    const chars = text.length;
    setWordCount(words);
    setCharCount(chars);
    setReadTime(Math.ceil(words / 200)); // approx 200 wpm
  }, [input]);

  const tools = [
    { id: 'summarizer', label: 'Summarizer', icon: <AlignLeft size={18} />, color: 'text-cyan-400' },
    { id: 'translator', label: 'Translator', icon: <Languages size={18} />, color: 'text-emerald-400' },
    { id: 'grammar', label: 'Proofreader', icon: <SpellCheck size={18} />, color: 'text-red-400' },
    { id: 'tone', label: 'Tone Changer', icon: <Wand2 size={18} />, color: 'text-orange-400' },
    { id: 'writer', label: 'Writer', icon: <PenTool size={18} />, color: 'text-purple-400' },
  ];

  const handleGenerate = async () => {
    if (!input.trim()) return;
    setIsLoading(true);
    setOutput('');
    
    let prompt = '';
    let sysInstruction = "You are ZamanX AI, an expert text processing assistant. Output only the requested text.";

    if (activeTab === 'summarizer') {
      prompt = `Summarize the following text concisely:\n\n${input}`;
    } else if (activeTab === 'translator') {
      prompt = `Translate the following text to ${extraInput || 'English'}:\n\n${input}`;
    } else if (activeTab === 'writer') {
      prompt = `Write a ${extraInput || 'blog post'} about: ${input}`;
    } else if (activeTab === 'grammar') {
      prompt = `Proofread the following text. Fix grammar, spelling, punctuation, and improve flow. Return only the corrected text:\n\n${input}`;
    } else if (activeTab === 'tone') {
      prompt = `Rewrite the following text in a ${extraInput || 'Professional'} tone:\n\n${input}`;
    }

    if (currentUser && currentUser.email) {
        logActivity(currentUser.uid, currentUser.email, `Text Tool: ${activeTab}`, prompt);
    }

    try {
      const result = await generateText(prompt, sysInstruction);
      setOutput(result);
      
      // Save to history
      addToHistory({
          tool: 'TEXT',
          type: 'text',
          prompt: activeTab.toUpperCase() + ': ' + (input.substring(0, 30) + '...'),
          content: result,
          metadata: { activeTab, extraInput, fullInput: input }
      });

    } catch (error) {
      setOutput("Error generating text. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
      setInput('');
      setOutput('');
      setExtraInput('');
  };

  const restoreText = (item: any) => {
      setOutput(item.content);
      if (item.metadata) {
          if (item.metadata.activeTab) setActiveTab(item.metadata.activeTab as any);
          if (item.metadata.fullInput) setInput(item.metadata.fullInput);
          if (item.metadata.extraInput) setExtraInput(item.metadata.extraInput);
      }
      setIsHistoryOpen(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in relative pb-12">
      <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <FileText className="text-cyan-400" /> Smart Text Studio
            </h2>
            <p className="text-gray-400 text-sm">Enhance, translate, and generate text with AI.</p>
          </div>
          <Button variant="ghost" onClick={() => setIsHistoryOpen(true)} title="History">
              <Clock size={20} />
          </Button>
      </div>

      <div className="flex flex-wrap gap-2 justify-center bg-gray-900/50 p-2 rounded-xl border border-gray-800 backdrop-blur-sm">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => { setActiveTab(tool.id as any); setOutput(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
              activeTab === tool.id 
                ? 'bg-gray-800 text-white shadow-lg ring-1 ring-gray-700' 
                : 'text-gray-500 hover:bg-gray-800 hover:text-gray-300'
            }`}
          >
            <span className={activeTab === tool.id ? tool.color : ''}>{tool.icon}</span>
            {tool.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[600px]">
        {/* Input Section */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-800 bg-gray-950/50 flex justify-between items-center">
             <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Input</span>
             <button onClick={handleClear} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                 <RefreshCcw size={12}/> Clear
             </button>
          </div>
          
          <div className="p-4 space-y-4 flex-1 flex flex-col">
              {activeTab === 'translator' && (
                <Input 
                  placeholder="Target Language (e.g., Spanish, French)" 
                  value={extraInput} 
                  onChange={(e) => setExtraInput(e.target.value)}
                />
              )}
              
              {activeTab === 'writer' && (
                 <Input 
                   placeholder="Format (e.g., Article, Poem, Email)" 
                   value={extraInput} 
                   onChange={(e) => setExtraInput(e.target.value)}
                 />
              )}

              {activeTab === 'tone' && (
                 <select 
                   value={extraInput}
                   onChange={(e) => setExtraInput(e.target.value)}
                   className="w-full bg-gray-950 border border-gray-700 rounded-lg p-2.5 text-white"
                 >
                    <option value="">Select Tone...</option>
                    <option value="Professional">Professional</option>
                    <option value="Casual">Casual</option>
                    <option value="Witty">Witty</option>
                    <option value="Empathetic">Empathetic</option>
                    <option value="Persuasive">Persuasive</option>
                    <option value="Academic">Academic</option>
                 </select>
              )}

              <TextArea
                placeholder={activeTab === 'writer' ? "Enter your topic..." : "Paste your text here..."}
                className="flex-1 bg-transparent border-none resize-none focus:ring-0 p-0 text-lg leading-relaxed placeholder-gray-700"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
          </div>

          <div className="p-4 border-t border-gray-800 bg-gray-950/30 flex justify-between items-center">
             <div className="text-xs text-gray-500 font-mono">
                {wordCount} words • {charCount} chars
             </div>
             <Button 
                onClick={handleGenerate} 
                disabled={isLoading || !input.trim()}
                className="px-6 py-2"
             >
                {isLoading ? 'Processing...' : 'Generate'}
             </Button>
          </div>
        </div>

        {/* Output Section */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 flex flex-col overflow-hidden relative">
          <div className="p-4 border-b border-gray-800 bg-gray-950/50 flex justify-between items-center">
             <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Output</span>
             {output && (
              <button 
                onClick={copyToClipboard}
                className="text-gray-400 hover:text-white transition-colors flex items-center gap-1 text-xs font-bold uppercase"
              >
                {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
             )}
          </div>
          
          <div className="flex-1 p-6 bg-gray-950/50 text-gray-300 overflow-y-auto whitespace-pre-wrap leading-relaxed">
            {output || (
                <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50">
                    <FileText size={48} className="mb-2" />
                    <p>Result will appear here...</p>
                </div>
            )}
          </div>
          
          {output && (
              <div className="p-2 border-t border-gray-800 bg-gray-950/30 text-right">
                  <span className="text-[10px] text-gray-600 uppercase tracking-widest">Powered by ZamanX AI</span>
              </div>
          )}
        </div>
      </div>

      <HistorySidebar 
        isOpen={isHistoryOpen} 
        onClose={() => setIsHistoryOpen(false)} 
        toolFilter="TEXT"
        onRestore={restoreText}
      />
    </div>
  );
};

export default TextTools;
