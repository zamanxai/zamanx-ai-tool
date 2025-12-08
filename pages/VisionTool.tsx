
import React, { useState, useRef, useEffect } from 'react';
import { analyzeImage } from '../services/geminiService';
import { useToolContext } from '../contexts/ToolContext';
import Button from '../components/Button';
import { TextArea } from '../components/Input';
import { Eye, Upload, Image as ImageIcon, ScanEye } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const VisionTool: React.FC = () => {
  const { visionState, setVisionState } = useToolContext();
  const [image, setImage] = useState<string | null>(visionState.image);
  const [mimeType, setMimeType] = useState<string>(visionState.mimeType);
  const [prompt, setPrompt] = useState(visionState.prompt);
  const [result, setResult] = useState(visionState.result);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setVisionState({ image, mimeType, prompt, result });
  }, [image, mimeType, prompt, result, setVisionState]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setMimeType(file.type);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!image || !prompt.trim()) return;
    setIsLoading(true);
    setResult('');
    
    try {
      const base64Data = image.split(',')[1];
      const response = await analyzeImage(base64Data, prompt, mimeType);
      setResult(response);
    } catch (error) {
      setResult("Error analyzing image. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in h-full flex flex-col">
       <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-2">
            <Eye className="text-emerald-400" /> AI Vision
          </h2>
          <p className="text-gray-400">Upload an image and ask ZamanX AI to analyze, describe, or extract info.</p>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1">
          <div className="space-y-6">
            <div 
              className={`border-2 border-dashed rounded-2xl h-64 flex flex-col items-center justify-center cursor-pointer transition-all ${image ? 'border-emerald-500 bg-emerald-900/10' : 'border-gray-700 bg-slate-900 hover:border-emerald-500/50 hover:bg-slate-800'}`}
              onClick={() => fileInputRef.current?.click()}
            >
              {image ? (
                <img src={image} alt="Upload" className="h-full w-full object-contain rounded-2xl p-2" />
              ) : (
                <>
                  <Upload size={48} className="text-gray-500 mb-4" />
                  <p className="text-gray-300 font-medium">Click to upload image</p>
                  <p className="text-sm text-gray-500 mt-2">JPG, PNG, WEBP</p>
                </>
              )}
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            </div>

            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
               <TextArea 
                 label="Ask about the image"
                 placeholder="E.g., Describe the scenery. What ingredients are in this food? Extract text from this image." 
                 value={prompt}
                 onChange={(e) => setPrompt(e.target.value)}
                 rows={3}
               />
               <Button 
                 onClick={handleAnalyze} 
                 disabled={isLoading || !image || !prompt} 
                 className="w-full !bg-emerald-600 hover:!bg-emerald-500" 
                 icon={<ScanEye size={18} />}
               >
                 {isLoading ? 'Analyzing...' : 'Analyze Image'}
               </Button>
            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl border border-slate-800 flex flex-col overflow-hidden min-h-[400px]">
             <div className="bg-slate-800/50 px-6 py-4 border-b border-slate-700 flex justify-between items-center backdrop-blur-sm">
               <span className="font-semibold text-emerald-100 flex items-center gap-2"><ImageIcon size={16}/> Vision Analysis</span>
               <span className="text-xs text-gray-500 uppercase tracking-wider">ZamanX AI</span>
             </div>
             <div className="flex-1 p-6 overflow-y-auto bg-slate-950/50 text-gray-300 custom-scrollbar">
                {result ? (
                  <div className="prose prose-invert prose-emerald max-w-none">
                    <ReactMarkdown>{result}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-600 space-y-4">
                    <ScanEye size={48} className="opacity-20 animate-pulse" />
                    <p>Analysis results will appear here...</p>
                  </div>
                )}
             </div>
          </div>
       </div>
    </div>
  );
};

export default VisionTool;
