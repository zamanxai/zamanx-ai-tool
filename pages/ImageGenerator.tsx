
import React, { useState, useEffect } from 'react';
import { generateImage } from '../services/geminiService';
import { logActivity } from '../services/loggingService';
import { useAuth } from '../contexts/AuthContext';
import { useToolContext } from '../contexts/ToolContext';
import Button from '../components/Button';
import { TextArea, Input } from '../components/Input';
import HistorySidebar from '../components/HistorySidebar';
import { Download, Sparkles, Image as ImageIcon, Layers, Maximize, Palette, Clock } from 'lucide-react';

const ImageGenerator: React.FC = () => {
  const { currentUser } = useAuth();
  const { imageState, setImageState, addToHistory } = useToolContext();

  const [prompt, setPrompt] = useState(imageState.prompt);
  const [negativePrompt, setNegativePrompt] = useState(imageState.negativePrompt);
  const [aspectRatio, setAspectRatio] = useState(imageState.aspectRatio);
  const [imageCount, setImageCount] = useState(imageState.count);
  const [style, setStyle] = useState(imageState.style);
  const [results, setResults] = useState<string[]>(imageState.results);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  useEffect(() => {
    setImageState({ prompt, negativePrompt, aspectRatio, count: imageCount, style, results });
  }, [prompt, negativePrompt, aspectRatio, imageCount, style, results, setImageState]);

  const artStyles = [
    'None', 'Cinematic', 'Photorealistic', 'Anime', 'Cyberpunk', 
    'Oil Painting', '3D Render', 'Sketch', 'Watercolor', 'Pixel Art'
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setError(null);
    setResults([]);

    let enhancedPrompt = prompt;
    if (style !== 'None') {
        enhancedPrompt += `, in ${style} style, high quality, detailed`;
    }
    if (negativePrompt.trim()) {
        enhancedPrompt += ` --no ${negativePrompt}`;
    }

    if (currentUser && currentUser.email) {
        logActivity(currentUser.uid, currentUser.email, `Image Generator`, enhancedPrompt);
    }

    try {
      const images = await generateImage(enhancedPrompt, { 
          count: imageCount, 
          aspectRatio: aspectRatio 
      });
      setResults(images);

      // Save to History
      if (images.length > 0) {
          images.forEach(imgUrl => {
              addToHistory({
                  tool: 'IMAGE',
                  type: 'image',
                  prompt: prompt,
                  content: imgUrl,
                  metadata: { style, aspectRatio }
              });
          });
      }

    } catch (err: any) {
      setError(err.message || "Failed to generate image. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = (url: string, index: number) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `zamanx-ai-image-${index}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const restoreImage = (item: any) => {
      setPrompt(item.prompt);
      if (item.metadata) {
          if(item.metadata.style) setStyle(item.metadata.style);
          if(item.metadata.aspectRatio) setAspectRatio(item.metadata.aspectRatio);
      }
      setResults([item.content]);
      setIsHistoryOpen(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-12 relative">
      <div className="text-center space-y-2 relative">
        <h2 className="text-3xl font-bold text-white flex items-center justify-center gap-2">
          <ImageIcon className="text-purple-400" /> Pro Image Studio
        </h2>
        <p className="text-gray-400">
            Create stunning art with ZamanX AI. Generate up to 4 images at once.
        </p>
        <button 
            onClick={() => setIsHistoryOpen(true)}
            className="absolute right-0 top-0 text-gray-500 hover:text-white flex items-center gap-2 text-sm font-bold"
        >
            <Clock size={16} /> Recent
        </button>
      </div>

      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-6">
        <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 space-y-4">
                <TextArea
                  label="Enter your prompt"
                  placeholder="A futuristic cyberpunk city with neon lights in rain, 4k highly detailed..."
                  rows={4}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="h-32"
                />
                <Input
                    label="Negative Prompt (Optional)"
                    placeholder="E.g., bad quality, blurry, distorted, ugly"
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    className="border-red-900/30 focus:border-red-500"
                />
            </div>
            <div className="w-full md:w-72 space-y-4">
                <div>
                   <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2"><Palette size={16}/> Art Style</label>
                   <select 
                      value={style}
                      onChange={(e) => setStyle(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-purple-500"
                   >
                       {artStyles.map(s => <option key={s} value={s}>{s}</option>)}
                   </select>
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2"><Maximize size={16}/> Aspect Ratio</label>
                   <div className="grid grid-cols-3 gap-2">
                      {['1:1', '16:9', '9:16', '3:4', '4:3'].map(ratio => (
                          <button
                            key={ratio}
                            onClick={() => setAspectRatio(ratio)}
                            className={`px-2 py-2 rounded-lg text-xs font-bold border transition-all ${aspectRatio === ratio ? 'bg-purple-600 border-purple-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}
                          >
                             {ratio}
                          </button>
                      ))}
                   </div>
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2"><Layers size={16}/> Count</label>
                   <div className="grid grid-cols-4 gap-2">
                      {[1, 2, 3, 4].map(num => (
                          <button
                            key={num}
                            onClick={() => setImageCount(num)}
                            className={`px-3 py-2 rounded-lg text-sm font-bold border transition-all ${imageCount === num ? 'bg-cyan-600 border-cyan-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}
                          >
                             {num}
                          </button>
                      ))}
                   </div>
                </div>
                <Button 
                    onClick={handleGenerate} 
                    disabled={isLoading || !prompt.trim()}
                    className="w-full h-12 mt-4"
                    icon={<Sparkles size={18} />}
                >
                    {isLoading ? 'Creating...' : 'Generate'}
                </Button>
            </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-200 text-center">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-4 animate-fade-in">
          <h3 className="text-xl font-bold text-white border-b border-gray-800 pb-2">Generation Results</h3>
          <div className={`grid gap-4 ${results.length === 1 ? 'grid-cols-1 max-w-2xl mx-auto' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2'}`}>
            {results.map((img, idx) => (
                <div key={idx} className="relative group rounded-2xl overflow-hidden border border-gray-700 shadow-2xl bg-black">
                    <img src={img} alt={`Generated ${idx}`} className="w-full h-auto object-cover" />
                    <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-xs text-white/80 font-medium pointer-events-none">
                    ZamanX AI
                    </div>
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-sm">
                        <Button onClick={() => handleDownload(img, idx)} variant="secondary" icon={<Download size={18} />}>
                            Download
                        </Button>
                    </div>
                </div>
            ))}
          </div>
          <div className="flex justify-center pt-4">
             <p className="text-sm text-gray-500">Contact: 0343 3498450</p>
          </div>
        </div>
      )}

      <HistorySidebar 
        isOpen={isHistoryOpen} 
        onClose={() => setIsHistoryOpen(false)} 
        toolFilter="IMAGE"
        onRestore={restoreImage}
      />
    </div>
  );
};

export default ImageGenerator;
