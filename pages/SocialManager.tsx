
import React, { useState, useEffect } from 'react';
import { generateText } from '../services/geminiService';
import { useToolContext } from '../contexts/ToolContext';
import Button from '../components/Button';
import { TextArea, Input } from '../components/Input';
import { Share2, Hash, Twitter, Linkedin, Instagram, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const SocialManager: React.FC = () => {
  const { socialState, setSocialState } = useToolContext();
  const [topic, setTopic] = useState(socialState.topic);
  const [platform, setPlatform] = useState(socialState.platform);
  const [tone, setTone] = useState(socialState.tone);
  const [result, setResult] = useState(socialState.result);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setSocialState({ topic, platform, tone, result });
  }, [topic, platform, tone, result, setSocialState]);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setIsLoading(true);
    setResult('');

    const prompt = `Act as a social media expert. Write a ${tone} post for ${platform} about: "${topic}". 
    Include relevant hashtags. 
    ${platform === 'Twitter' ? 'Keep it under 280 characters if possible or make a thread.' : ''}
    ${platform === 'LinkedIn' ? 'Make it professional yet engaging. Use line breaks.' : ''}
    ${platform === 'Instagram' ? 'Focus on visual description and engaging caption.' : ''}`;

    try {
      const response = await generateText(prompt);
      setResult(response);
    } catch (error) {
      setResult("Error generating content.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
       <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-2">
            <Share2 className="text-blue-400" /> Social Media Manager
          </h2>
          <p className="text-gray-400">Generate viral posts for Twitter, LinkedIn, and Instagram instantly.</p>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="space-y-6">
               <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 space-y-4">
                   <div>
                       <label className="block text-sm font-medium text-gray-300 mb-2">Platform</label>
                       <div className="flex gap-2">
                           {['Twitter', 'LinkedIn', 'Instagram'].map(p => (
                               <button
                                 key={p}
                                 onClick={() => setPlatform(p)}
                                 className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all flex items-center justify-center gap-2 ${platform === p ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}
                               >
                                   {p === 'Twitter' && <Twitter size={14} />}
                                   {p === 'LinkedIn' && <Linkedin size={14} />}
                                   {p === 'Instagram' && <Instagram size={14} />}
                                   {p}
                               </button>
                           ))}
                       </div>
                   </div>

                   <div>
                       <label className="block text-sm font-medium text-gray-300 mb-2">Tone</label>
                       <select 
                           value={tone}
                           onChange={e => setTone(e.target.value)}
                           className="w-full bg-black/40 border border-gray-700 rounded-lg p-2.5 text-white"
                       >
                           <option>Viral & Hype</option>
                           <option>Professional & Corporate</option>
                           <option>Casual & Friendly</option>
                           <option>Inspirational</option>
                           <option>Educational</option>
                       </select>
                   </div>

                   <TextArea 
                       label="Topic / Idea"
                       placeholder="E.g., Launching a new AI product called ZamanX..."
                       value={topic}
                       onChange={e => setTopic(e.target.value)}
                       rows={5}
                   />

                   <Button onClick={handleGenerate} disabled={isLoading || !topic} className="w-full" icon={<Hash size={18}/>}>
                       {isLoading ? 'Generating...' : 'Generate Post'}
                   </Button>
               </div>
           </div>

           <div className="bg-gray-900 rounded-2xl border border-gray-800 flex flex-col overflow-hidden h-full min-h-[400px]">
                <div className="bg-gray-800 px-4 py-3 border-b border-gray-700 flex justify-between items-center">
                    <span className="font-bold text-gray-200">Preview</span>
                    {result && (
                        <button onClick={copyToClipboard} className="text-gray-400 hover:text-white transition-colors">
                            {copied ? <Check size={18} className="text-green-400"/> : <Copy size={18}/>}
                        </button>
                    )}
                </div>
                <div className="flex-1 p-6 overflow-y-auto bg-gray-950 text-gray-300 text-sm whitespace-pre-wrap">
                    {result ? (
                        <div className="prose prose-invert max-w-none">
                            <ReactMarkdown>{result}</ReactMarkdown>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-600 opacity-50">
                            <Share2 size={48} className="mb-2"/>
                            <p>Your post will appear here</p>
                        </div>
                    )}
                </div>
           </div>
       </div>
    </div>
  );
};

export default SocialManager;
