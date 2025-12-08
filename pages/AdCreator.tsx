
import React, { useState, useEffect } from 'react';
import { generateText, generateImage } from '../services/geminiService';
import { useToolContext } from '../contexts/ToolContext';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import { TextArea, Input } from '../components/Input';
import HistorySidebar from '../components/HistorySidebar';
import PaymentModal from '../components/PaymentModal';
import { Megaphone, Image as ImageIcon, Copy, Download, Sparkles, LayoutTemplate, Lock, Clock, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const AdCreator: React.FC = () => {
  const { adCreatorState, setAdCreatorState, addToHistory, tools, rates } = useToolContext();
  const { userProfile } = useAuth();
  
  // Destructure with default fallbacks
  const { 
      businessName, productDesc, audience, platform, tone, generatedCopy, generatedImage 
  } = adCreatorState || {
      businessName: '', productDesc: '', audience: '', platform: 'Facebook', tone: 'Professional', generatedCopy: '', generatedImage: null
  };

  const [isLoadingCopy, setIsLoadingCopy] = useState(false);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // --- Access Control Logic ---
  const toolConfig = tools.find(t => t.id === 'AD_CREATOR');
  const isPurchased = userProfile?.purchasedTools?.includes('AD_CREATOR');
  // Check if locked based on plan level relative to tool access level
  const userPlanLevel = { 'Free': 0, 'Basic': 1, 'Pro': 2, 'Ultra': 3 }[userProfile?.plan || 'Free'] || 0;
  const toolAccessLevel = { 'Free': 0, 'Basic': 1, 'Pro': 2, 'Ultra': 3 }[toolConfig?.access || 'Free'] || 0;
  
  const isAccessLocked = toolConfig && userPlanLevel < toolAccessLevel && !isPurchased && userProfile?.role !== 'superadmin';
  const showDemo = isAccessLocked && toolConfig?.demoAvailable;
  
  const currency = userProfile?.currency || 'USD';
  const price = Math.ceil((toolConfig?.basePriceUSD || 10) * (rates[currency as keyof typeof rates] || 1));

  // Sync state
  const updateState = (updates: any) => {
      setAdCreatorState((prev: any) => ({ ...prev, ...updates }));
  };

  const handleGenerateCopy = async () => {
      if (!productDesc || !businessName) return;
      
      // Lock Check
      if (isAccessLocked && !showDemo) {
          setShowPayment(true);
          return;
      }

      setIsLoadingCopy(true);
      updateState({ generatedCopy: '' });

      const demoContext = showDemo ? " (DEMO MODE: Generate a SHORT, 1-sentence teaser only)" : "";

      const prompt = `Act as a world-class Copywriter. Write a high-converting advertisement for:
      Platform: ${platform}
      Business Name: ${businessName}
      Product/Service: ${productDesc}
      Target Audience: ${audience}
      Tone: ${tone}
      ${demoContext}

      Requirements:
      1. Catchy Headline.
      2. Engaging Body Text.
      3. Strong Call to Action (CTA).
      4. Relevant Hashtags.
      
      Format clearly.`;

      try {
          const res = await generateText(prompt);
          updateState({ generatedCopy: res });
          
          if (!showDemo) {
              addToHistory({
                  tool: 'AD_CREATOR',
                  type: 'text',
                  prompt: `Ad Copy for ${businessName}`,
                  content: res,
                  metadata: { platform, tone }
              });
          }
      } catch (e) {
          updateState({ generatedCopy: "Error generating copy." });
      } finally {
          setIsLoadingCopy(false);
      }
  };

  const handleGenerateImage = async () => {
      if (!productDesc) return;

      // Lock Check
      if (isAccessLocked) {
          setShowPayment(true);
          return;
      }

      setIsLoadingImage(true);
      updateState({ generatedImage: null });

      const imagePrompt = `Professional advertisement photography for ${productDesc}, 
      style suitable for ${platform} ads, ${tone} lighting and mood, 
      high quality, 4k, centered composition, commercial aesthetic.`;

      try {
          const images = await generateImage(imagePrompt, { aspectRatio: platform === 'Instagram' || platform === 'TikTok' ? '9:16' : '1:1' });
          if (images && images.length > 0) {
              updateState({ generatedImage: images[0] });
              addToHistory({
                  tool: 'AD_CREATOR',
                  type: 'image',
                  prompt: `Ad Visual for ${businessName}`,
                  content: images[0],
                  metadata: { platform }
              });
          }
      } catch (e) {
          console.error(e);
      } finally {
          setIsLoadingImage(false);
      }
  };

  const handleGenerateAll = () => {
      if (isAccessLocked && !showDemo) {
          setShowPayment(true);
          return;
      }
      handleGenerateCopy();
      if (!isAccessLocked) {
          handleGenerateImage();
      }
  };

  const handleCopyText = () => {
      navigator.clipboard.writeText(generatedCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const restoreHistory = (item: any) => {
      if (item.type === 'text') updateState({ generatedCopy: item.content });
      if (item.type === 'image') updateState({ generatedImage: item.content });
      setIsHistoryOpen(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-20 relative">
       <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-2">
            <Megaphone className="text-orange-500" /> Ad Creator 360
          </h2>
          <p className="text-gray-400">Generate professional ad copy and visuals for any platform in seconds.</p>
          
          {isAccessLocked && (
            <div className="mt-4 inline-flex items-center gap-2 bg-yellow-900/30 text-yellow-400 px-4 py-2 rounded-full text-xs font-bold border border-yellow-500/30 cursor-pointer hover:bg-yellow-900/50 transition-colors" onClick={() => setShowPayment(true)}>
                <Lock size={12}/> {showDemo ? "Demo Mode Active - Click to Unlock Full Power" : "Premium Feature - Click to Unlock"}
            </div>
          )}

          <button 
            onClick={() => setIsHistoryOpen(true)}
            className="absolute right-0 top-0 text-gray-500 hover:text-white flex items-center gap-2 text-sm font-bold"
          >
            <Clock size={16} /> Recent
          </button>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           
           {/* Input Section */}
           <div className="space-y-6">
               <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 space-y-4">
                   <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                       <LayoutTemplate size={18} className="text-gray-400"/> Campaign Details
                   </h3>
                   
                   <Input 
                       label="Business Name" 
                       placeholder="e.g. ZamanX Tech" 
                       value={businessName} 
                       onChange={e => updateState({ businessName: e.target.value })} 
                   />
                   
                   <TextArea 
                       label="Product / Service Description" 
                       placeholder="Describe what you are selling, key features, and offers..." 
                       value={productDesc} 
                       onChange={e => updateState({ productDesc: e.target.value })} 
                       rows={4}
                   />

                   <Input 
                       label="Target Audience" 
                       placeholder="e.g. Small business owners, Fitness enthusiasts..." 
                       value={audience} 
                       onChange={e => updateState({ audience: e.target.value })} 
                   />

                   <div className="grid grid-cols-2 gap-4">
                       <div>
                           <label className="block text-sm font-medium text-gray-300 mb-1">Platform</label>
                           <select 
                               value={platform} 
                               onChange={e => updateState({ platform: e.target.value })}
                               className="w-full bg-black/40 border border-gray-700 rounded-lg p-2.5 text-white"
                           >
                               <option>Facebook</option>
                               <option>Instagram</option>
                               <option>LinkedIn</option>
                               <option>Google Ads</option>
                               <option>TikTok</option>
                               <option>Twitter/X</option>
                           </select>
                       </div>
                       <div>
                           <label className="block text-sm font-medium text-gray-300 mb-1">Tone</label>
                           <select 
                               value={tone} 
                               onChange={e => updateState({ tone: e.target.value })}
                               className="w-full bg-black/40 border border-gray-700 rounded-lg p-2.5 text-white"
                           >
                               <option>Professional</option>
                               <option>Hype / Exciting</option>
                               <option>Minimalist</option>
                               <option>Emotional</option>
                               <option>Urgent / Salesy</option>
                               <option>Humorous</option>
                           </select>
                       </div>
                   </div>

                   <div className="pt-4 flex flex-col gap-3">
                       <Button 
                           onClick={handleGenerateAll} 
                           disabled={isLoadingCopy || isLoadingImage || !productDesc} 
                           className="w-full !bg-orange-600 hover:!bg-orange-500 shadow-[0_0_20px_rgba(234,88,12,0.4)]"
                           icon={isAccessLocked && !showDemo ? <Lock size={18}/> : <Sparkles size={18}/>}
                       >
                           {isAccessLocked && !showDemo ? `Unlock Full Ad Suite (${currency} ${price})` : 'Generate Full Ad'}
                       </Button>
                       <div className="grid grid-cols-2 gap-3">
                           <Button 
                               onClick={handleGenerateCopy} 
                               disabled={isLoadingCopy || !productDesc} 
                               variant="secondary"
                               className="text-xs"
                           >
                               {isLoadingCopy ? 'Writing...' : 'Copy Only'}
                           </Button>
                           <Button 
                               onClick={handleGenerateImage} 
                               disabled={isLoadingImage || !productDesc || (isAccessLocked && !showDemo)} 
                               variant="secondary"
                               className="text-xs"
                           >
                               {isLoadingImage ? 'Painting...' : (isAccessLocked ? <Lock size={12}/> : 'Visual Only')}
                           </Button>
                       </div>
                   </div>
               </div>
           </div>

           {/* Output Section */}
           <div className="space-y-6">
               
               {/* Copy Output */}
               <div className="bg-gray-900 rounded-2xl border border-gray-800 flex flex-col overflow-hidden min-h-[300px]">
                    <div className="bg-gray-800 px-4 py-3 border-b border-gray-700 flex justify-between items-center">
                        <span className="font-bold text-gray-200 text-sm uppercase tracking-wider">Ad Copy</span>
                        {generatedCopy && (
                            <button 
                                onClick={handleCopyText} 
                                className="text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                                title="Copy Text"
                            >
                                {copied ? <Check size={16} className="text-green-500"/> : <Copy size={16}/>}
                            </button>
                        )}
                    </div>
                    <div className="flex-1 p-6 overflow-y-auto bg-gray-950 text-gray-300">
                        {generatedCopy ? (
                            <ReactMarkdown className="prose prose-invert prose-orange max-w-none text-sm">
                                {generatedCopy}
                            </ReactMarkdown>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-600 opacity-50">
                                <Megaphone size={32} className="mb-2"/>
                                <p className="text-sm">Ad copy will appear here</p>
                            </div>
                        )}
                    </div>
               </div>

               {/* Image Output */}
               <div className="bg-gray-900 rounded-2xl border border-gray-800 flex flex-col overflow-hidden min-h-[300px]">
                    <div className="bg-gray-800 px-4 py-3 border-b border-gray-700 flex justify-between items-center">
                        <span className="font-bold text-gray-200 text-sm uppercase tracking-wider">Ad Creative</span>
                        {generatedImage && (
                            <button 
                                onClick={() => {
                                    if(isAccessLocked) { setShowPayment(true); return; }
                                    const link = document.createElement('a');
                                    link.href = generatedImage;
                                    link.download = `zamanx-ad-${Date.now()}.png`;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                }} 
                                className="text-gray-400 hover:text-white transition-colors"
                                title="Download Image"
                            >
                                {isAccessLocked ? <Lock size={16} className="text-yellow-500"/> : <Download size={16}/>}
                            </button>
                        )}
                    </div>
                    <div className="flex-1 bg-black flex items-center justify-center p-4 relative group">
                        {isLoadingImage ? (
                            <div className="animate-pulse flex flex-col items-center">
                                <ImageIcon size={48} className="text-gray-700 mb-2"/>
                                <span className="text-gray-500 text-xs">Generating Visuals...</span>
                            </div>
                        ) : generatedImage ? (
                            <div className="relative">
                                <img src={generatedImage} alt="Generated Ad" className={`max-h-[400px] w-auto object-contain rounded-lg shadow-lg ${isAccessLocked ? 'blur-sm opacity-50' : ''}`} />
                                {isAccessLocked && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Button onClick={() => setShowPayment(true)} className="!bg-yellow-600">Unlock Image</Button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-600 opacity-50">
                                <ImageIcon size={32} className="mb-2"/>
                                <p className="text-sm">Visuals will appear here</p>
                            </div>
                        )}
                    </div>
               </div>

           </div>
       </div>

       <HistorySidebar 
         isOpen={isHistoryOpen} 
         onClose={() => setIsHistoryOpen(false)} 
         toolFilter="AD_CREATOR"
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

export default AdCreator;
