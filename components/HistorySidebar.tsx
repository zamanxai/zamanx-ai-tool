
import React from 'react';
import { useToolContext } from '../contexts/ToolContext';
import { HistoryItem } from '../types';
import { X, Trash2, Clock, MessageSquare, Image, Code, FileText, ChevronRight } from 'lucide-react';

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  toolFilter: string;
  onRestore: (item: HistoryItem) => void;
}

const HistorySidebar: React.FC<HistorySidebarProps> = ({ isOpen, onClose, toolFilter, onRestore }) => {
  const { history, deleteFromHistory, clearHistory } = useToolContext();
  
  const filteredHistory = history.filter(item => item.tool === toolFilter);

  const getIcon = (type: string) => {
      switch(type) {
          case 'image': return <Image size={16} className="text-purple-400"/>;
          case 'code': return <Code size={16} className="text-pink-400"/>;
          case 'chat': return <MessageSquare size={16} className="text-cyan-400"/>;
          default: return <FileText size={16} className="text-gray-400"/>;
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-80 bg-gray-900 border-l border-gray-800 shadow-2xl z-50 transform transition-transform duration-300 flex flex-col">
       <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-950/50 backdrop-blur">
           <h3 className="font-bold text-white flex items-center gap-2">
               <Clock size={18} className="text-cyan-400" /> Recent History
           </h3>
           <div className="flex items-center gap-2">
               {filteredHistory.length > 0 && (
                   <button 
                     onClick={() => {
                         if(window.confirm('Clear all history for this tool?')) clearHistory(toolFilter);
                     }}
                     className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                     title="Clear All"
                   >
                       <Trash2 size={16} />
                   </button>
               )}
               <button onClick={onClose} className="p-2 text-gray-400 hover:text-white">
                   <X size={20} />
               </button>
           </div>
       </div>

       <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
           {filteredHistory.length === 0 ? (
               <div className="text-center text-gray-500 mt-10">
                   <Clock size={40} className="mx-auto mb-3 opacity-20" />
                   <p className="text-sm">No recent history found.</p>
               </div>
           ) : (
               filteredHistory.map(item => (
                   <div 
                     key={item.id} 
                     className="bg-black/40 border border-gray-800 rounded-xl p-3 hover:border-cyan-500/50 transition-all cursor-pointer group relative overflow-hidden"
                     onClick={() => onRestore(item)}
                   >
                       <div className="flex justify-between items-start mb-2">
                           <div className="flex items-center gap-2 text-xs font-medium text-gray-400">
                               {getIcon(item.type)}
                               <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                           </div>
                           <button 
                             onClick={(e) => { e.stopPropagation(); deleteFromHistory(item.id); }}
                             className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                           >
                               <Trash2 size={12} />
                           </button>
                       </div>
                       
                       {item.type === 'image' && typeof item.content === 'string' && (
                           <div className="mb-2 rounded-lg overflow-hidden h-24 border border-gray-800">
                               <img src={item.content} alt="History thumbnail" className="w-full h-full object-cover" />
                           </div>
                       )}

                       <p className="text-sm text-gray-200 line-clamp-2 font-medium mb-1">{item.prompt}</p>
                       <p className="text-xs text-gray-500 truncate">
                           {item.type === 'code' ? 'Code Snippet' : item.type === 'chat' ? 'Chat Session' : 'Click to restore'}
                       </p>
                       
                       <div className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <ChevronRight size={14} className="text-cyan-500" />
                       </div>
                   </div>
               ))
           )}
       </div>
    </div>
  );
};

export default HistorySidebar;
