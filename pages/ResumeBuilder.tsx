
import React, { useState, useEffect } from 'react';
import { generateText } from '../services/geminiService';
import { useToolContext } from '../contexts/ToolContext';
import Button from '../components/Button';
import { TextArea, Input } from '../components/Input';
import { FileText, Briefcase, Star, CheckCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const ResumeBuilder: React.FC = () => {
  const { resumeState, setResumeState } = useToolContext();
  const [currentResume, setCurrentResume] = useState(resumeState.currentResume);
  const [jobDesc, setJobDesc] = useState(resumeState.jobDesc);
  const [goal, setGoal] = useState(resumeState.goal);
  const [result, setResult] = useState(resumeState.result);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setResumeState({ currentResume, jobDesc, goal, result });
  }, [currentResume, jobDesc, goal, result, setResumeState]);

  const handleProcess = async () => {
    if (!currentResume.trim()) return;
    setIsLoading(true);
    setResult('');

    let prompt = "";
    if (goal === 'Improve') {
        prompt = `Act as a professional Resume Writer. Review the following resume and improve its clarity, impact, and formatting. Use strong action verbs.\n\nResume:\n${currentResume}`;
    } else if (goal === 'Tailor') {
        prompt = `Tailor the following resume to match this Job Description. Highlight relevant skills and keywords.\n\nJob Description:\n${jobDesc}\n\nResume:\n${currentResume}`;
    } else if (goal === 'CoverLetter') {
        prompt = `Write a professional Cover Letter for this Job Description based on the Resume provided.\n\nJob Description:\n${jobDesc}\n\nResume:\n${currentResume}`;
    }

    try {
      const response = await generateText(prompt);
      setResult(response);
    } catch (error) {
      setResult("Error processing request.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in h-full flex flex-col">
       <div className="flex items-center gap-3 mb-4">
         <div className="p-3 bg-amber-600/20 rounded-lg text-amber-400">
           <FileText size={24} />
         </div>
         <div>
           <h2 className="text-2xl font-bold text-white">Resume & Career AI</h2>
           <p className="text-gray-400 text-sm">Optimize your CV, tailor it for jobs, or write cover letters.</p>
         </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
          <div className="space-y-4 flex flex-col">
             <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 flex-1 flex flex-col gap-4">
                 <div className="flex gap-2 p-1 bg-gray-800 rounded-lg mb-2">
                     {['Improve', 'Tailor', 'CoverLetter'].map(g => (
                         <button 
                           key={g}
                           onClick={() => setGoal(g)}
                           className={`flex-1 py-2 text-xs font-bold uppercase rounded-md transition-all ${goal === g ? 'bg-amber-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                         >
                             {g === 'CoverLetter' ? 'Cover Letter' : g}
                         </button>
                     ))}
                 </div>

                 <TextArea 
                     label="Paste Current Resume"
                     placeholder="Work Experience, Education, Skills..."
                     value={currentResume}
                     onChange={e => setCurrentResume(e.target.value)}
                     className="h-48"
                 />

                 {(goal === 'Tailor' || goal === 'CoverLetter') && (
                     <TextArea 
                         label="Job Description"
                         placeholder="Paste the job listing here..."
                         value={jobDesc}
                         onChange={e => setJobDesc(e.target.value)}
                         className="h-32"
                     />
                 )}

                 <Button 
                    onClick={handleProcess} 
                    disabled={isLoading || !currentResume} 
                    className="!bg-amber-600 hover:!bg-amber-500 w-full"
                    icon={<Star size={18}/>}
                 >
                     {isLoading ? 'Processing...' : 'Enhance Profile'}
                 </Button>
             </div>
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-800 flex flex-col overflow-hidden">
              <div className="bg-gray-800 px-4 py-3 border-b border-gray-700 flex justify-between items-center">
                  <span className="font-bold text-gray-200">AI Feedback / Output</span>
                  <Briefcase size={16} className="text-amber-400"/>
              </div>
              <div className="flex-1 p-6 overflow-y-auto bg-gray-950 text-gray-300">
                  {result ? (
                      <div className="prose prose-invert prose-amber max-w-none text-sm">
                          <ReactMarkdown>{result}</ReactMarkdown>
                      </div>
                  ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-2">
                          <FileText size={48} className="opacity-20"/>
                          <p>Upload details to start...</p>
                      </div>
                  )}
              </div>
          </div>
       </div>
    </div>
  );
};

export default ResumeBuilder;
