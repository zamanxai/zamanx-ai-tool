
import React, { useState, useRef, useEffect } from 'react';
import { generateStudyGuide } from '../services/geminiService';
import { useToolContext } from '../contexts/ToolContext';
import Button from '../components/Button';
import { TextArea } from '../components/Input';
import { GraduationCap, Upload, FileText, Download, BookOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const StudyHelper: React.FC = () => {
  const { studyState, setStudyState } = useToolContext();
  const [activeTab, setActiveTab] = useState<'text' | 'file'>(studyState.activeTab as any);
  const [inputText, setInputText] = useState(studyState.inputText);
  const [fileData, setFileData] = useState<{ name: string; type: string; data: string } | null>(studyState.fileData);
  const [result, setResult] = useState(studyState.result);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setStudyState({ activeTab, inputText, result, fileData });
  }, [activeTab, inputText, result, fileData, setStudyState]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic validation
    const allowedTypes = ['application/pdf', 'text/plain', 'text/markdown', 'application/json'];
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.txt') && !file.name.endsWith('.md')) {
        alert("Supported formats: PDF, TXT, MD, JSON");
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        setFileData({
            name: file.name,
            type: file.type,
            data: base64String
        });
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (activeTab === 'text' && !inputText.trim()) return;
    if (activeTab === 'file' && !fileData) return;

    setIsLoading(true);
    setResult('');

    try {
        let response;
        if (activeTab === 'file' && fileData) {
             response = await generateStudyGuide(inputText, { mimeType: fileData.type, data: fileData.data });
        } else {
             response = await generateStudyGuide(inputText);
        }
        setResult(response);
    } catch (error) {
        setResult("Error generating study material. Please try again.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleDownload = () => {
      const blob = new Blob([result], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'ZamanX-Study-Notes.md';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in h-full flex flex-col">
       <div className="flex items-center gap-3 mb-4">
         <div className="p-3 bg-lime-600/20 rounded-lg text-lime-400">
           <GraduationCap size={24} />
         </div>
         <div>
           <h2 className="text-2xl font-bold text-white">Study Helper</h2>
           <p className="text-gray-400 text-sm">Upload notes or topics to get summaries, questions, and structured guides.</p>
         </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
          <div className="space-y-4 flex flex-col">
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 flex-1 flex flex-col gap-6">
               
               <div className="flex gap-2 p-1 bg-gray-800 rounded-lg">
                   <button 
                     onClick={() => setActiveTab('text')}
                     className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'text' ? 'bg-lime-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                   >
                       Topic / Text
                   </button>
                   <button 
                     onClick={() => setActiveTab('file')}
                     className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'file' ? 'bg-lime-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                   >
                       Upload File
                   </button>
               </div>

               {activeTab === 'text' ? (
                   <TextArea 
                     label="Topic or Content" 
                     placeholder="Paste your lecture notes, article text, or simply type a subject like 'Quantum Physics'..." 
                     value={inputText}
                     onChange={(e) => setInputText(e.target.value)}
                     className="h-64"
                   />
               ) : (
                   <div 
                     className={`border-2 border-dashed rounded-xl h-64 flex flex-col items-center justify-center cursor-pointer transition-all ${fileData ? 'border-lime-500 bg-lime-900/10' : 'border-gray-700 bg-black/40 hover:border-lime-500/50 hover:bg-black/60'}`}
                     onClick={() => fileInputRef.current?.click()}
                   >
                      {fileData ? (
                          <div className="text-center p-4">
                              <FileText size={48} className="text-lime-400 mx-auto mb-3" />
                              <p className="font-bold text-white">{fileData.name}</p>
                              <p className="text-xs text-lime-400 mt-1">Ready to analyze</p>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setFileData(null); }}
                                className="mt-4 text-xs text-red-400 hover:text-red-300 underline"
                              >
                                  Remove
                              </button>
                          </div>
                      ) : (
                          <div className="text-center p-4">
                              <Upload size={48} className="text-gray-500 mx-auto mb-3" />
                              <p className="font-medium text-gray-300">Click to upload document</p>
                              <p className="text-xs text-gray-500 mt-2">PDF, TXT, MD supported</p>
                          </div>
                      )}
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept=".pdf,.txt,.md,.json" 
                        onChange={handleFileUpload} 
                      />
                   </div>
               )}

               {activeTab === 'file' && (
                   <TextArea 
                     label="Additional Instructions (Optional)" 
                     placeholder="E.g., Focus on chapter 3, or generate a quiz..." 
                     value={inputText}
                     onChange={(e) => setInputText(e.target.value)}
                     rows={2}
                   />
               )}

               <Button 
                 onClick={handleGenerate} 
                 disabled={isLoading || (activeTab === 'text' && !inputText) || (activeTab === 'file' && !fileData)} 
                 className="!bg-lime-600 hover:!bg-lime-500 w-full" 
                 icon={<BookOpen size={18} />}
               >
                 {isLoading ? 'Analyzing...' : 'Generate Study Guide'}
               </Button>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-800 flex flex-col overflow-hidden">
             <div className="bg-gray-800 px-4 py-3 border-b border-gray-700 flex justify-between items-center">
               <span className="font-semibold text-gray-200">Study Material</span>
               {result && (
                   <button onClick={handleDownload} className="text-lime-400 hover:text-lime-300 flex items-center gap-1 text-xs font-bold uppercase tracking-wider">
                       <Download size={14} /> Save Notes
                   </button>
               )}
             </div>
             <div className="flex-1 p-6 overflow-y-auto bg-gray-950 text-gray-300 custom-scrollbar">
                {result ? (
                  <div className="prose prose-invert prose-lime max-w-none">
                    <ReactMarkdown>{result}</ReactMarkdown>
                    <div className="mt-8 pt-6 border-t border-gray-800 flex flex-col items-center text-center gap-1">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Generated by ZamanX AI – Study Helper</p>
                        <p className="text-xs text-gray-600">Contact: 0343 3498450</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-600">
                    <GraduationCap size={64} className="mb-4 opacity-10" />
                    <p>Upload material or enter a topic to begin...</p>
                  </div>
                )}
             </div>
          </div>
       </div>
    </div>
  );
};

export default StudyHelper;
