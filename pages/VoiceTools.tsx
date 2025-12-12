import React, { useState, useRef, useEffect } from 'react';
import { generateSpeech, transcribeAudio } from '../services/geminiService';
import { useToolContext } from '../contexts/ToolContext';
import Button from '../components/Button';
import { TextArea } from '../components/Input';
import { Mic, Volume2, Upload, Play, Square, FileAudio, Download, Settings2, Activity, Zap } from 'lucide-react';

const VoiceTools: React.FC = () => {
  const { voiceState, setVoiceState } = useToolContext();
  const [activeTab, setActiveTab] = useState<'tts' | 'stt'>(voiceState.activeTab as any);
  const [textInput, setTextInput] = useState(voiceState.textInput);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState('');
  
  // TTS State
  const [selectedVoice, setSelectedVoice] = useState(voiceState.selectedVoice);
  const [audioSource, setAudioSource] = useState<AudioBufferSourceNode | null>(null);
  const [audioData, setAudioData] = useState<{ buffer: AudioBuffer; raw: Uint8Array } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);

  // STT State
  const [transcription, setTranscription] = useState(voiceState.transcription);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Visualizer State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    setVoiceState({ activeTab, textInput, transcription, selectedVoice });
  }, [activeTab, textInput, transcription, selectedVoice, setVoiceState]);

  const voices = [
      { id: 'Kore', label: 'Kore - Female (Calm)' },
      { id: 'Puck', label: 'Puck - Male (Energetic)' },
      { id: 'Charon', label: 'Charon - Male (Deep)' },
      { id: 'Fenrir', label: 'Fenrir - Male (Fast)' },
      { id: 'Zephyr', label: 'Zephyr - Female (Soft)' },
  ];

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    analyserRef.current = audioContextRef.current.createAnalyser();
    analyserRef.current.fftSize = 256;
    
    return () => {
       if (audioContextRef.current?.state !== 'closed') {
           audioContextRef.current?.close();
       }
       cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const drawVisualizer = () => {
      if (!canvasRef.current || !analyserRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
          barHeight = dataArray[i] / 2;
          
          const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
          gradient.addColorStop(0, '#06b6d4'); 
          gradient.addColorStop(1, '#ec4899'); 
          
          ctx.fillStyle = gradient;
          ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

          x += barWidth + 1;
      }

      animationFrameRef.current = requestAnimationFrame(drawVisualizer);
  };

  useEffect(() => {
      if (isPlaying || isRecording) {
          drawVisualizer();
      } else {
          cancelAnimationFrame(animationFrameRef.current);
          const canvas = canvasRef.current;
          const ctx = canvas?.getContext('2d');
          if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
  }, [isPlaying, isRecording]);

  const playBuffer = (buffer: AudioBuffer) => {
    if (audioSource) audioSource.stop();
    if (!audioContextRef.current || !analyserRef.current) return;

    if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = playbackSpeed;
    
    source.connect(analyserRef.current);
    analyserRef.current.connect(audioContextRef.current.destination);

    source.onended = () => setIsPlaying(false);
    source.start();
    setAudioSource(source);
    setIsPlaying(true);
  };

  const stopPlayback = () => {
    if (audioSource) {
      audioSource.stop();
      setIsPlaying(false);
    }
  };

  const handleTTS = async () => {
    if (!textInput.trim()) return;
    setIsProcessing(true);
    setStatus("Initiating Neural Voice Engine...");
    setAudioData(null);
    
    try {
      const { buffer, rawData } = await generateSpeech(textInput, selectedVoice);
      setAudioData({ buffer, raw: rawData });
      playBuffer(buffer);
      setStatus("Audio Sequence Generated.");
    } catch (error) {
      setStatus("System Error: Voice generation failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const startRecording = async () => {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              mediaRecorderRef.current = new MediaRecorder(stream);
              
              if (audioContextRef.current && analyserRef.current) {
                  const source = audioContextRef.current.createMediaStreamSource(stream);
                  source.connect(analyserRef.current);
              }

              mediaRecorderRef.current.ondataavailable = (e) => {
                  if (e.data.size > 0) chunksRef.current.push(e.data);
              };

              mediaRecorderRef.current.onstop = async () => {
                  const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                  chunksRef.current = [];
                  await processAudioBlob(blob);
                  stream.getTracks().forEach(track => track.stop());
              };

              mediaRecorderRef.current.start();
              setIsRecording(true);
              setStatus("Recording Audio Stream...");
          } catch (err: any) {
              if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                  setStatus("Microphone Permission Denied");
                  alert("Please allow microphone access in your browser.");
              } else {
                  setStatus("Microphone Error: " + err.message);
              }
          }
      }
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
          setStatus("Processing Audio Data...");
      }
  };

  const processAudioBlob = async (blob: Blob) => {
      setIsProcessing(true);
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
          const base64data = (reader.result as string).split(',')[1];
          try {
              const text = await transcribeAudio(base64data, blob.type || 'audio/webm');
              setTranscription(text);
              setStatus("Transcription Complete.");
          } catch (e) {
              setStatus("Transcription Failed.");
          } finally {
              setIsProcessing(false);
          }
      };
  };

  const createWavFile = (samples: Uint8Array) => {
    const buffer = new ArrayBuffer(44 + samples.length);
    const view = new DataView(buffer);
    const writeString = (view: DataView, offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
    };
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, 24000, true);
    view.setUint32(28, 24000 * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, samples.length, true);
    const byteView = new Uint8Array(buffer);
    byteView.set(samples, 44);
    return new Blob([buffer], { type: 'audio/wav' });
  };

  const handleDownload = () => {
    if (!audioData) return;
    const wavBlob = createWavFile(audioData.raw);
    const url = URL.createObjectURL(wavBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zamanx-speech-${selectedVoice}-${Date.now()}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setStatus("File too large. Max 10MB.");
      return;
    }
    processAudioBlob(file);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-20">
       <div className="flex justify-center gap-4 mb-8">
          <button 
            onClick={() => { setActiveTab('tts'); setStatus(''); }}
            className={`px-8 py-3 rounded-xl flex items-center gap-2 font-bold tracking-wide transition-all uppercase text-sm ${activeTab === 'tts' ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-[0_0_20px_rgba(234,88,12,0.4)]' : 'bg-gray-900 border border-gray-700 text-gray-400 hover:text-white'}`}
          >
            <Volume2 size={18} /> Voice Synthesis
          </button>
          <button 
            onClick={() => { setActiveTab('stt'); setStatus(''); }}
            className={`px-8 py-3 rounded-xl flex items-center gap-2 font-bold tracking-wide transition-all uppercase text-sm ${activeTab === 'stt' ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_20px_rgba(8,145,178,0.4)]' : 'bg-gray-900 border border-gray-700 text-gray-400 hover:text-white'}`}
          >
            <Mic size={18} /> Audio Analysis
          </button>
       </div>

       <div className="bg-black border border-gray-800 rounded-2xl p-4 h-32 relative overflow-hidden shadow-inner">
           <canvas ref={canvasRef} width="800" height="100" className="w-full h-full object-contain opacity-80" />
           <div className="absolute top-2 left-3 text-[10px] font-mono text-cyan-500 uppercase flex items-center gap-2">
                <Activity size={12} className={isPlaying || isRecording ? "animate-pulse" : ""} />
                Frequency Monitor
           </div>
           <div className="absolute bottom-2 right-3 text-[10px] font-mono text-gray-600 uppercase">
                {status || "System Ready"}
           </div>
       </div>

       {activeTab === 'tts' && (
         <div className="bg-gray-900/60 backdrop-blur-md p-8 rounded-3xl border border-white/5 space-y-6 relative overflow-hidden shadow-2xl">
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-orange-500/10 rounded-full blur-[80px] pointer-events-none animate-pulse-slow"></div>

            <div className="flex flex-col md:flex-row gap-6">
               <div className="w-full md:w-1/3 space-y-4">
                 <div className="bg-black/40 p-4 rounded-xl border border-gray-800">
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider flex items-center gap-2"><Settings2 size={12}/> Voice Model</label>
                    <div className="space-y-2">
                        {voices.map(v => (
                            <button
                                key={v.id}
                                onClick={() => setSelectedVoice(v.id)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex justify-between ${selectedVoice === v.id ? 'bg-orange-600/20 text-orange-400 border border-orange-500/50' : 'text-gray-400 hover:bg-gray-800'}`}
                            >
                                {v.label}
                                {selectedVoice === v.id && <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse mt-1"></div>}
                            </button>
                        ))}
                    </div>
                 </div>

                 <div className="bg-black/40 p-4 rounded-xl border border-gray-800">
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Playback Speed: {playbackSpeed}x</label>
                    <input 
                        type="range" 
                        min="0.5" 
                        max="2.0" 
                        step="0.1" 
                        value={playbackSpeed} 
                        onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                        className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                    />
                 </div>
               </div>

               <div className="flex-1 space-y-4">
                    <TextArea 
                      rows={6} 
                      placeholder="Enter text to synthesize..." 
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      className="font-medium text-lg bg-black/40 border-gray-700 focus:border-orange-500 h-full"
                    />
               </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                 {audioData && (
                     <Button onClick={handleDownload} variant="secondary" icon={<Download size={18} />}>
                       Save Audio
                     </Button>
                 )}
                 {isPlaying ? (
                    <Button onClick={stopPlayback} variant="danger" icon={<Square size={18} />}>Stop Playback</Button>
                 ) : (
                    <Button 
                        onClick={handleTTS} 
                        disabled={isProcessing || !textInput} 
                        className="!bg-gradient-to-r !from-orange-600 !to-red-600 hover:shadow-[0_0_20px_rgba(234,88,12,0.5)]" 
                        icon={<Play size={18} />}
                    >
                      {isProcessing ? 'Synthesizing...' : 'Generate Speech'}
                    </Button>
                 )}
            </div>
         </div>
       )}

       {activeTab === 'stt' && (
         <div className="bg-gray-900/60 backdrop-blur-md p-8 rounded-3xl border border-white/5 space-y-6 relative shadow-2xl">
            <div className="flex flex-col items-center justify-center py-8 gap-6 border-b border-gray-800">
                <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ${
                        isRecording 
                        ? 'bg-red-500/20 text-red-500 border-2 border-red-500 animate-pulse shadow-[0_0_30px_rgba(239,68,68,0.4)]' 
                        : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 hover:scale-105'
                    }`}
                >
                    {isRecording ? <Square size={32} fill="currentColor" /> : <Mic size={32} />}
                </button>
                <p className="text-gray-400 text-sm font-medium tracking-wide">
                    {isRecording ? "LISTENING..." : "TAP TO RECORD"}
                </p>
            </div>

            <div className="flex justify-center">
                <div 
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-800/50 border border-gray-700 cursor-pointer hover:bg-gray-800 hover:border-cyan-500/50 transition-all"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <Upload size={14} className="text-gray-400"/>
                    <span className="text-xs font-bold text-gray-300 uppercase">Or Upload Audio File</span>
                    <input 
                       type="file" 
                       ref={fileInputRef} 
                       className="hidden" 
                       accept="audio/*" 
                       onChange={handleFileUpload}
                     />
                </div>
            </div>

           {transcription && (
             <div className="mt-6 bg-black/40 p-6 rounded-2xl border border-cyan-500/20 text-gray-200 whitespace-pre-wrap leading-relaxed shadow-inner">
               <div className="flex items-center gap-2 mb-3 text-cyan-500 text-xs font-bold uppercase tracking-widest">
                   <Zap size={14}/> Transcript
               </div>
               {transcription}
             </div>
           )}
         </div>
       )}
    </div>
  );
};

export default VoiceTools;