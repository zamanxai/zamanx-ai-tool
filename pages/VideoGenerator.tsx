
import React, { useState, useEffect } from 'react';
import { generateVideo } from '../services/geminiService';
import { useToolContext } from '../contexts/ToolContext';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import { TextArea } from '../components/Input';
import PaymentModal from '../components/PaymentModal';
import { Video, Film, Download, AlertCircle, Key, Lock } from 'lucide-react';

const VideoGenerator: React.FC = () => {
  const { tools, rates } = useToolContext();
  const { userProfile } = useAuth();

  const [prompt, setPrompt] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  // --- Access Control ---
  const toolConfig = tools.find(t => t.id === 'VIDEO');
  const isPurchased = userProfile?.purchasedTools?.includes('VIDEO');
  const userPlanLevel = { 'Free': 0, 'Basic': 1, 'Pro': 2, 'Ultra': 3 }[userProfile?.plan || 'Free'] || 0;
  const toolAccessLevel = { 'Free': 0, 'Basic': 1, 'Pro': 2, 'Ultra': 3 }[toolConfig?.access || 'Free'] || 0;
  const isAccessLocked = toolConfig && userPlanLevel < toolAccessLevel && !isPurchased && userProfile?.role !== 'superadmin';
  
  const currency = userProfile?.currency || 'USD';
  const price = Math.ceil((toolConfig?.basePriceUSD || 20) * (rates[currency as keyof typeof rates] || 1));

  useEffect(() => {
    checkKey();
  }, []);

  const checkKey = async () => {
    const aiStudio = (window as any).aistudio;
    if (aiStudio) {
      const selected = await aiStudio.hasSelectedApiKey();
      setHasKey(selected);
    } else {
      setHasKey(false);
    }
  };

  const handleSelectKey = async () => {
    const aiStudio = (window as any).aistudio;
    if (aiStudio) {
      await aiStudio.openSelectKey();
      setHasKey(true);
    } else {
        alert("AI Studio key selection not available in this environment.");
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    // Check SaaS Lock first
    if (isAccessLocked) {
        setShowPayment(true);
        return;
    }

    setIsLoading(true);
    setError(null);
    setVideoUrl(null);

    try {
      const url = await generateVideo(prompt);
      setVideoUrl(url);
    } catch (err: any) {
       console.error(err);
       if (err.message && err.message.includes('Requested entity was not found')) {
           setError("API Key invalid or expired. Please select a key again.");
           setHasKey(false);
       } else {
           setError("Video generation failed. Ensure you have selected a valid paid API key.");
       }
    } finally {
      setIsLoading(false);
    }
  };

  // 1. Check SaaS Lock Display (Blocking View if strict) or Banner
  // 2. Check API Key Status

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-white flex items-center justify-center gap-2">
           <Video className="text-purple-500" /> AI Video Studio
        </h2>
        <p className="text-gray-400">Generate high-quality videos from text prompts using Veo.</p>
        {isAccessLocked && (
            <div className="mt-2 inline-flex items-center gap-2 bg-red-900/30 text-red-400 px-4 py-2 rounded-full text-xs font-bold border border-red-500/30 cursor-pointer hover:bg-red-900/50" onClick={() => setShowPayment(true)}>
                <Lock size={12}/> Premium Tool - Access Required
            </div>
        )}
      </div>

      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-6">
         {!hasKey ? (
             <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-xl text-center space-y-4">
                <div className="flex justify-center"><Key size={32} className="text-red-500" /></div>
                <h3 className="text-xl font-bold text-white">Google Cloud API Key Required</h3>
                <p className="text-sm text-gray-400">
                    This tool requires a personal Google Cloud API key with billing enabled to generate videos (Veo Model).
                </p>
                <Button onClick={handleSelectKey} className="!bg-red-600 hover:!bg-red-500" icon={<Key size={18} />}>
                    Select API Key
                </Button>
             </div>
         ) : (
             <>
                 <TextArea 
                    label="Video Prompt"
                    placeholder="A neon hologram of a cat driving at top speed..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={4}
                 />
                 
                 <div className="flex justify-end">
                     <Button 
                        onClick={handleGenerate} 
                        disabled={isLoading || !prompt.trim()}
                        className="!bg-purple-600 hover:!bg-purple-500 shadow-[0_0_20px_rgba(147,51,234,0.4)]"
                        icon={isAccessLocked ? <Lock size={18}/> : <Film size={18} />}
                     >
                         {isLoading ? 'Generating Video (This takes time)...' : (isAccessLocked ? `Unlock (${currency} ${price})` : 'Generate Video')}
                     </Button>
                 </div>
             </>
         )}
      </div>

      {error && (
         <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-200 text-center flex items-center justify-center gap-2">
             <AlertCircle size={18} /> {error}
         </div>
      )}

      {videoUrl && (
          <div className="space-y-4 animate-fade-in">
              <h3 className="text-xl font-bold text-white border-b border-gray-800 pb-2">Generated Video</h3>
              <div className="rounded-2xl overflow-hidden border border-gray-700 shadow-2xl bg-black">
                  <video controls className="w-full h-auto" src={videoUrl} />
              </div>
              <div className="flex justify-center">
                 <Button 
                    onClick={() => {
                        const link = document.createElement('a');
                        link.href = videoUrl;
                        link.download = `zamanx-video-${Date.now()}.mp4`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    }} 
                    variant="secondary" 
                    icon={<Download size={18} />}
                 >
                    Download Video
                 </Button>
              </div>
          </div>
      )}

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

export default VideoGenerator;
