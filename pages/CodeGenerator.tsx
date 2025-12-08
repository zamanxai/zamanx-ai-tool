
import React, { useState, useEffect } from 'react';
import { analyzeCode } from '../services/geminiService';
import { useToolContext } from '../contexts/ToolContext';
import Button from '../components/Button';
import { TextArea } from '../components/Input';
import HistorySidebar from '../components/HistorySidebar';
import { Code, Terminal, FileCode, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const CodeGenerator: React.FC = () => {
  const { codeState, setCodeState, addToHistory } = useToolContext();
  const [prompt, setPrompt] = useState(codeState.prompt);
  const [code, setCode] = useState(codeState.code);
  const [output, setOutput] = useState(codeState.output);
  const [language, setLanguage] = useState(codeState.language);
  const [action, setAction] = useState(codeState.action);
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  useEffect(() => {
    setCodeState({ prompt, code, output, language, action });
  }, [prompt, code, output, language, action, setCodeState]);

  const languages = ['JavaScript', 'TypeScript', 'Python', 'React/TSX', 'HTML/CSS', 'SQL', 'C++', 'Java', 'PHP'];
  const actions = ['Generate', 'Debug', 'Refactor', 'Explain', 'Convert'];

  const handleAnalyze = async () => {
    if (!prompt.trim() && action === 'Generate') return;
    setIsLoading(true);
    
    let fullPrompt = "";
    if (action === 'Generate') {
        fullPrompt = `Generate ${language} code for: ${prompt}. Provide clean, commented code.`;
    } else if (action === 'Debug') {
        fullPrompt = `Debug this ${language} code. Find errors and fix them:\n${code}\n\nContext: ${prompt}`;
    } else if (action === 'Refactor') {
        fullPrompt = `Refactor this ${language} code to be more efficient and clean:\n${code}`;
    } else if (action === 'Explain') {
        fullPrompt = `Explain how this ${language} code works step-by-step:\n${code}`;
    } else if (action === 'Convert') {
        fullPrompt = `Convert this code to ${language}:\n${code}`;
    }

    try {
      const result = await analyzeCode(fullPrompt);
      setOutput(result);
      
      // Save to History
      addToHistory({
          tool: 'CODE',
          type: 'code',
          prompt: action + ' - ' + (prompt.substring(0, 30) || 'Code'),
          content: result,
          metadata: { language, action, codeInput: code }
      });

    } catch (error) {
      setOutput("Error processing request.");
    } finally {
      setIsLoading(false);
    }
  };

  const restoreCode = (item: any) => {
      setOutput(item.content);
      if (item.metadata) {
          if (item.metadata.language) setLanguage(item.metadata.language);
          if (item.metadata.action) setAction(item.metadata.action);
          if (item.metadata.codeInput) setCode(item.metadata.codeInput);
      }
      setIsHistoryOpen(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in h-full flex flex-col relative">
       <div className="flex items-center justify-between mb-4">
         <div className="flex items-center gap-3">
             <div className="p-3 bg-pink-600/20 rounded-lg text-pink-400">
               <Code size={24} />
             </div>
             <div>
               <h2 className="text-2xl font-bold text-white">Code Architect Pro</h2>
               <p className="text-gray-400 text-sm">Generate, debug, refactor, and convert code instantly.</p>
             </div>
         </div>
         <Button variant="ghost" onClick={() => setIsHistoryOpen(true)} title="History">
            <Clock size={20} />
         </Button>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
          <div className="space-y-4 flex flex-col">
            <div className="bg-gray-900 p-5 rounded-xl border border-gray-800 flex-1 flex flex-col gap-4">
               
               <div className="flex gap-4">
                   <div className="flex-1">
                       <label className="text-xs font-bold text-gray-500 mb-1 block">Language</label>
                       <select 
                           value={language}
                           onChange={e => setLanguage(e.target.value)}
                           className="w-full bg-gray-950 border border-gray-700 rounded-lg p-2 text-white focus:border-pink-500"
                       >
                           {languages.map(l => <option key={l} value={l}>{l}</option>)}
                       </select>
                   </div>
                   <div className="flex-1">
                       <label className="text-xs font-bold text-gray-500 mb-1 block">Action</label>
                       <select 
                           value={action}
                           onChange={e => setAction(e.target.value)}
                           className="w-full bg-gray-950 border border-gray-700 rounded-lg p-2 text-white focus:border-pink-500"
                       >
                           {actions.map(a => <option key={a} value={a}>{a}</option>)}
                       </select>
                   </div>
               </div>

               <TextArea 
                 label="Instructions" 
                 placeholder={action === 'Convert' ? 'Convert to...' : "E.g., Create a responsive navbar..."}
                 value={prompt}
                 onChange={(e) => setPrompt(e.target.value)}
                 className="h-24"
               />
               
               {(action !== 'Generate') && (
                   <TextArea 
                     label="Source Code" 
                     placeholder="Paste your code here..." 
                     value={code}
                     onChange={(e) => setCode(e.target.value)}
                     className="flex-1 font-mono text-xs"
                   />
               )}

               <Button onClick={handleAnalyze} disabled={isLoading} icon={<Terminal size={18} />} className="!bg-pink-600 hover:!bg-pink-500">
                 {isLoading ? 'Processing...' : `Execute ${action}`}
               </Button>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-800 flex flex-col overflow-hidden min-h-[500px]">
             <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 font-mono text-xs text-gray-400 flex justify-between items-center">
               <span>OUTPUT_CONSOLE</span>
               <div className="flex gap-2">
                   <div className="w-3 h-3 rounded-full bg-red-500"></div>
                   <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                   <div className="w-3 h-3 rounded-full bg-green-500"></div>
               </div>
             </div>
             <div className="flex-1 p-6 overflow-y-auto bg-gray-950 font-mono text-sm text-gray-300">
                {output ? (
                  <ReactMarkdown 
                    components={{
                      code({node, inline, className, children, ...props}: any) {
                        return !inline ? (
                          <div className="bg-gray-900 p-4 rounded-lg border border-gray-800 my-2 overflow-x-auto shadow-inner">
                             <code {...props} className={className}>{children}</code>
                          </div>
                        ) : (
                          <code className="bg-gray-800 px-1 rounded text-pink-400" {...props}>{children}</code>
                        )
                      }
                    }}
                  >
                    {output}
                  </ReactMarkdown>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-600">
                    <FileCode size={48} className="mb-4 opacity-20" />
                    <p>Ready to code...</p>
                  </div>
                )}
             </div>
          </div>
       </div>

       <HistorySidebar 
         isOpen={isHistoryOpen} 
         onClose={() => setIsHistoryOpen(false)} 
         toolFilter="CODE"
         onRestore={restoreCode}
       />
    </div>
  );
};

export default CodeGenerator;
