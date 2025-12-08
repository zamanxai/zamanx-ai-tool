
import React, { useState, useEffect } from 'react';
import { generateLegalAdvice } from '../services/geminiService';
import { useToolContext } from '../contexts/ToolContext';
import Button from '../components/Button';
import { TextArea } from '../components/Input';
import { Scale, Gavel, FileCheck, AlertTriangle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const LegalAdvisor: React.FC = () => {
  const { legalState, setLegalState } = useToolContext();
  const [query, setQuery] = useState(legalState.query);
  const [result, setResult] = useState(legalState.result);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setLegalState({ query, result });
  }, [query, result, setLegalState]);

  const handleConsult = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    setResult('');
    try {
      const response = await generateLegalAdvice(query);
      setResult(response);
    } catch (error) {
      setResult("Error processing legal query.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in h-full flex flex-col">
       <div className="flex items-center gap-3 mb-4">
         <div className="p-3 bg-slate-600/20 rounded-lg text-slate-400">
           <Scale size={24} />
         </div>
         <div>
           <h2 className="text-2xl font-bold text-white">AI Legal Advisor</h2>
           <p className="text-gray-400 text-sm">Analyze contracts, understand legal terms, and get general guidance.</p>
         </div>
       </div>

       <div className="p-4 bg-yellow-900/20 border border-yellow-500/20 rounded-xl flex items-start gap-3 text-yellow-200 text-sm mb-4">
           <AlertTriangle size={20} className="shrink-0 mt-0.5" />
           <p><strong>Disclaimer:</strong> ZamanX AI is an artificial intelligence, not a lawyer. Output provided here is for informational purposes only and does not constitute professional legal advice or representation. Always consult a qualified attorney for legal matters.</p>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
          <div className="space-y-4 flex flex-col">
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 flex-1 flex flex-col gap-4">
               <TextArea 
                 label="Legal Query or Contract Clause" 
                 placeholder="Paste a contract clause to explain, or ask a question like 'What are the basics of copyright law?'..." 
                 value={query}
                 onChange={(e) => setQuery(e.target.value)}
                 className="h-64"
               />

               <Button 
                 onClick={handleConsult} 
                 disabled={isLoading || !query.trim()} 
                 className="!bg-slate-700 hover:!bg-slate-600 w-full" 
                 icon={<Gavel size={18} />}
               >
                 {isLoading ? 'Analyzing...' : 'Consult AI Advisor'}
               </Button>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-800 flex flex-col overflow-hidden">
             <div className="bg-gray-800 px-4 py-3 border-b border-gray-700 flex justify-between items-center">
               <span className="font-semibold text-gray-200">Legal Insight</span>
               <FileCheck size={16} className="text-slate-400"/>
             </div>
             <div className="flex-1 p-6 overflow-y-auto bg-gray-950 text-gray-300">
                {result ? (
                  <div className="prose prose-invert prose-slate max-w-none text-sm">
                    <ReactMarkdown>{result}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-2">
                    <Scale size={48} className="opacity-20" />
                    <p>Enter a query to begin analysis...</p>
                  </div>
                )}
             </div>
          </div>
       </div>
    </div>
  );
};

export default LegalAdvisor;
