
import React, { useState } from 'react';
import { generateContentCalendar } from '../services/geminiService';
import { useToolContext } from '../contexts/ToolContext';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import { Input } from '../components/Input';
import { Calendar, Hash, Lock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const ContentPlanner: React.FC = () => {
  const { tools } = useToolContext();
  const { userProfile } = useAuth();
  
  const [keyword, setKeyword] = useState('');
  const [niche, setNiche] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const toolConfig = tools.find(t => t.id === 'PLANNER');
  // Fix: Added optional chaining checks for purchasedTools
  const isLocked = toolConfig && toolConfig.access !== 'Free' && userProfile?.plan !== 'Pro' && userProfile?.plan !== 'Ultra' && !userProfile?.purchasedTools?.includes('PLANNER');
  const showDemo = isLocked && toolConfig?.demoAvailable;

  const handleGenerate = async () => {
      if(!keyword || !niche) return;
      setIsLoading(true);
      setResult('');
      try {
          const res = await generateContentCalendar(keyword, niche, showDemo || false);
          setResult(res);
      } catch(e) { setResult("Error generating calendar."); }
      finally { setIsLoading(false); }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
        <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-2">
                <Calendar className="text-purple-500" /> Viral Content Planner
            </h2>
            <p className="text-gray-400">Generate a comprehensive 30-day content strategy for TikTok, Reels, and Shorts.</p>
            {isLocked && (
                <div className="mt-4 inline-flex items-center gap-2 bg-yellow-900/30 text-yellow-400 px-4 py-2 rounded-full text-xs font-bold border border-yellow-500/30">
                    <Lock size={12}/> Demo Mode (3 Days) - Upgrade for 30 Days
                </div>
            )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 space-y-6 md:col-span-1 h-fit">
                <Input label="Niche / Industry" value={niche} onChange={e=>setNiche(e.target.value)} placeholder="e.g. AI Technology" />
                <Input label="Focus Keyword" value={keyword} onChange={e=>setKeyword(e.target.value)} placeholder="e.g. Productivity Hacks" />
                <Button onClick={handleGenerate} disabled={isLoading || !keyword} className="w-full !bg-purple-600" icon={<Hash size={18}/>}>
                    {isLoading ? 'Planning...' : (showDemo ? 'Generate 3-Day Demo' : 'Generate 30-Day Plan')}
                </Button>
            </div>

            <div className="bg-gray-900 rounded-2xl border border-gray-800 flex flex-col overflow-hidden min-h-[500px] md:col-span-2">
                <div className="bg-gray-800 px-4 py-3 border-b border-gray-700 font-bold text-gray-200">Content Calendar Strategy</div>
                <div className="flex-1 p-6 overflow-y-auto bg-gray-950 text-gray-300">
                    {result ? <ReactMarkdown className="prose prose-invert prose-purple max-w-none">{result}</ReactMarkdown> : <div className="text-center text-gray-600 mt-20">Your content plan will appear here</div>}
                </div>
            </div>
        </div>
    </div>
  );
};

export default ContentPlanner;
