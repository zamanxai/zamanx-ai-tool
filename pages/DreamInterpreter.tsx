
import React, { useState, useEffect } from 'react';
import { interpretDream } from '../services/geminiService';
import { useToolContext } from '../contexts/ToolContext';
import Button from '../components/Button';
import { TextArea } from '../components/Input';
import { Moon, Stars, CloudMoon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const DreamInterpreter: React.FC = () => {
  const { dreamState, setDreamState } = useToolContext();
  const [dream, setDream] = useState(dreamState.dream);
  const [interpretation, setInterpretation] = useState(dreamState.interpretation);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setDreamState({ dream, interpretation });
  }, [dream, interpretation, setDreamState]);

  const handleInterpret = async () => {
    if (!dream.trim()) return;
    setIsLoading(true);
    setInterpretation('');
    try {
      const result = await interpretDream(dream);
      setInterpretation(result);
    } catch (error) {
      setInterpretation("The connection to the ethereal realm was interrupted.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="text-center space-y-3">
        <h2 className="text-3xl font-bold text-white flex items-center justify-center gap-3">
          <Moon className="text-fuchsia-400" size={32} />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-purple-400">Dream Interpreter</span>
        </h2>
        <p className="text-gray-400">Uncover the hidden meanings and symbols within your subconscious.</p>
      </div>

      <div className="grid gap-8">
        <div className="bg-slate-900/50 backdrop-blur rounded-2xl border border-fuchsia-500/20 p-6 shadow-[0_0_30px_rgba(192,38,211,0.1)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-20 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
             <Stars size={120} className="text-fuchsia-500" />
          </div>
          
          <TextArea
            label="Describe your dream"
            placeholder="I was flying over a golden ocean while it was raining stars..."
            rows={4}
            value={dream}
            onChange={(e) => setDream(e.target.value)}
            className="font-medium text-lg bg-black/50 border-fuchsia-900/50 focus:border-fuchsia-500"
          />
          <div className="mt-4 flex justify-end">
            <Button 
              onClick={handleInterpret} 
              disabled={isLoading || !dream.trim()}
              className="px-8 !bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 border border-fuchsia-400/30"
              icon={<CloudMoon size={18} />}
            >
              {isLoading ? 'Interpreting...' : 'Interpret Dream'}
            </Button>
          </div>
        </div>

        {interpretation && (
          <div className="bg-slate-900/80 backdrop-blur rounded-2xl border border-fuchsia-500/30 overflow-hidden shadow-2xl animate-fade-in">
            <div className="bg-fuchsia-900/20 px-6 py-4 border-b border-fuchsia-500/20 flex items-center justify-between">
               <span className="font-semibold text-fuchsia-200 flex items-center gap-2"><Stars size={16}/> Mystical Insight</span>
               <span className="text-xs bg-fuchsia-500/20 text-fuchsia-300 px-2 py-1 rounded border border-fuchsia-500/30">AI Oracle</span>
            </div>
            <div className="p-8 prose prose-invert prose-fuchsia max-w-none">
              <ReactMarkdown>{interpretation}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DreamInterpreter;
