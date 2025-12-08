
import React, { useState, useEffect } from 'react';
import { generateFitnessPlan } from '../services/geminiService';
import { useToolContext } from '../contexts/ToolContext';
import Button from '../components/Button';
import { TextArea, Input } from '../components/Input';
import { Dumbbell, Activity, Flame, Trophy } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const FitnessCoach: React.FC = () => {
  const { fitnessState, setFitnessState } = useToolContext();
  const [stats, setStats] = useState(fitnessState.stats);
  const [goal, setGoal] = useState(fitnessState.goal);
  const [plan, setPlan] = useState(fitnessState.plan);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setFitnessState({ stats, goal, plan });
  }, [stats, goal, plan, setFitnessState]);

  const handleGenerate = async () => {
    if (!stats.trim()) return;
    setIsLoading(true);
    setPlan('');
    
    const prompt = `Goal: ${goal}\nUser Stats/Details: ${stats}\n\nCreate a detailed workout routine and diet plan.`;
    
    try {
      const response = await generateFitnessPlan(prompt);
      setPlan(response);
    } catch (error) {
      setPlan("Error generating plan.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in h-full flex flex-col">
       <div className="flex items-center gap-3 mb-4">
         <div className="p-3 bg-red-600/20 rounded-lg text-red-400">
           <Dumbbell size={24} />
         </div>
         <div>
           <h2 className="text-2xl font-bold text-white">AI Fitness Coach</h2>
           <p className="text-gray-400 text-sm">Personalized workout routines and nutrition plans.</p>
         </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
          <div className="space-y-4 flex flex-col">
             <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 flex-1 flex flex-col gap-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Primary Goal</label>
                    <div className="flex flex-wrap gap-2">
                        {['Build Muscle', 'Lose Weight', 'Endurance', 'Flexibility', 'General Health'].map(g => (
                            <button 
                              key={g}
                              onClick={() => setGoal(g)}
                              className={`px-3 py-2 text-xs font-bold uppercase rounded-md transition-all ${goal === g ? 'bg-red-600 text-white shadow' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                            >
                                {g}
                            </button>
                        ))}
                    </div>
                 </div>

                 <TextArea 
                     label="Your Stats & Preferences"
                     placeholder="Age, Weight, Height, Gender, Available Equipment (Gym/Home), Dietary Restrictions..."
                     value={stats}
                     onChange={e => setStats(e.target.value)}
                     className="h-48"
                 />

                 <Button 
                    onClick={handleGenerate} 
                    disabled={isLoading || !stats.trim()} 
                    className="!bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 w-full"
                    icon={<Activity size={18}/>}
                 >
                     {isLoading ? 'Designing Plan...' : 'Generate Plan'}
                 </Button>
             </div>
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-800 flex flex-col overflow-hidden">
              <div className="bg-gray-800 px-4 py-3 border-b border-gray-700 flex justify-between items-center">
                  <span className="font-bold text-gray-200">Your Plan</span>
                  <div className="flex gap-2 text-red-400">
                      <Flame size={16}/> <Trophy size={16}/>
                  </div>
              </div>
              <div className="flex-1 p-6 overflow-y-auto bg-gray-950 text-gray-300">
                  {plan ? (
                      <div className="prose prose-invert prose-red max-w-none text-sm">
                          <ReactMarkdown>{plan}</ReactMarkdown>
                      </div>
                  ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-2">
                          <Dumbbell size={48} className="opacity-20"/>
                          <p>Enter your stats to start...</p>
                      </div>
                  )}
              </div>
          </div>
       </div>
    </div>
  );
};

export default FitnessCoach;
