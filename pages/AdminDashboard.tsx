import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToolContext } from '../contexts/ToolContext';
import { db } from '../firebaseConfig';
import { collection, query, onSnapshot, orderBy, where } from 'firebase/firestore';
import { 
    fetchAllUsers, updateUserRole, toggleBanUser, updateUserPlan, updateUserCredits, getStats, 
    addApiKey, getApiKeys, deleteApiKey, updateToolVisibility, updateToolStatus, updateToolAccess, 
    updateToolPrice, getRotationLogs, updateKeyStatus, sendBroadcast, 
    fetchActivityLogs, replyToTicket, closeTicket, generateAccessCode, 
    getAccessCodes, getTools, deleteAccessCode, grantToolAccess, revokeToolAccess, sendUserNotification, acceptSupportTicket
} from '../services/adminService';
import { 
    UserProfile, StoredKey, ContactDetails, AIProvider, ToolConfig, SupportTicket, 
    KeyRotationLog, PlanType, UserRole, ActivityLog, AccessCode 
} from '../types';
import Button from '../components/Button';
import { Input, TextArea } from '../components/Input';
import { 
    Users, Shield, RefreshCw, Key, Trash2, Zap, MessageCircle, RotateCcw, 
    CheckCircle, PauseCircle, Search, Ban, Lock, Bell, Laptop, User, Clock,
    Send, XCircle, Copy, Activity, Settings, ToggleLeft, ToggleRight, Mail, UserPlus
} from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const { userProfile, currentUser } = useAuth();
  const { contactDetails, globalApiKey, setGlobalApiKey, keyStatus } = useToolContext(); 
  
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'tools' | 'codes' | 'keys' | 'support' | 'activity'>('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [localKeyInput, setLocalKeyInput] = useState(globalApiKey);

  // --- Data State ---
  const [stats, setStats] = useState({ total: 0, banned: 0, admins: 0 });
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [toolsData, setToolsData] = useState<ToolConfig[]>([]);
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([]);
  const [keys, setKeys] = useState<StoredKey[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [rotationLogs, setRotationLogs] = useState<KeyRotationLog[]>([]);

  // --- UI State ---
  const [searchUser, setSearchUser] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [adminReply, setAdminReply] = useState('');
  
  // User Management Modal State
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserProfile | null>(null);
  const [userNotificationMsg, setUserNotificationMsg] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Forms
  const [selectedToolForCode, setSelectedToolForCode] = useState('');
  const [customCodeInput, setCustomCodeInput] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newKeyProvider, setNewKeyProvider] = useState<AIProvider>('GOOGLE');
  const [newKeyAlias, setNewKeyAlias] = useState('');

  // Initial Load
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [uData, sData, tData, kData, cData, actData, rotData] = await Promise.all([
          fetchAllUsers(), getStats(), getTools(), getApiKeys(), getAccessCodes(), fetchActivityLogs(), getRotationLogs()
      ]);
      setUsers(uData); setStats(sData); setToolsData(tData.sort((a,b) => a.name.localeCompare(b.name)));
      setKeys(kData); setAccessCodes(cData); setActivityLogs(actData); setRotationLogs(rotData);
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  // Real-time Tickets Listener
  useEffect(() => {
      const q = query(collection(db, "support_tickets"), orderBy("lastUpdate", "desc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
          const fetchedTickets = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SupportTicket));
          setTickets(fetchedTickets);
          
          // Update selected ticket if it exists to show new messages immediately
          if (selectedTicket) {
              const updated = fetchedTickets.find(t => t.id === selectedTicket.id);
              if (updated) setSelectedTicket(updated);
          }
      });
      return () => unsubscribe();
  }, [selectedTicket?.id]);

  useEffect(() => { loadData(); }, []);
  useEffect(() => { setLocalKeyInput(globalApiKey); }, [globalApiKey]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [selectedTicket]);

  const handleRoleChange = async (uid: string, email: string, role: string) => { if(userProfile) { await updateUserRole(userProfile.email, uid, email, role as UserRole); setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role: role as UserRole } : u)); }};
  const handlePlanChange = async (uid: string, plan: string) => { if(userProfile) { await updateUserPlan(uid, plan as PlanType, userProfile.email); setUsers(prev => prev.map(u => u.uid === uid ? { ...u, plan: plan as PlanType } : u)); }};
  const handleBanToggle = async (uid: string, email: string, current: boolean) => { if(userProfile) { await toggleBanUser(userProfile.email, uid, email, current); setUsers(prev => prev.map(u => u.uid === uid ? { ...u, isBanned: !current } : u)); }};
  
  const handleToolUpdate = async (toolId: string, field: string, value: any) => {
      if(field === 'visibility') await updateToolVisibility(toolId, value);
      if(field === 'status') await updateToolStatus(toolId, value);
      if(field === 'access') await updateToolAccess(toolId, value);
      if(field === 'basePriceUSD') await updateToolPrice(toolId, parseFloat(value));
      setToolsData(prev => prev.map(t => t.id === toolId ? { ...t, [field]: value } : t));
  };

  const handleLocalKeySave = () => {
      setGlobalApiKey(localKeyInput);
      alert("Local Key Updated. Tools should now be active.");
  };

  const handleAddKey = async () => { if(userProfile && newKey) { await addApiKey(userProfile.email, newKey, newKeyProvider, newKeyAlias || 'New Key'); setNewKey(''); setNewKeyAlias(''); loadData(); }};
  const handleKeyStatus = async (id: string, status: any) => { await updateKeyStatus(id, status); setKeys(prev => prev.map(k => k.id === id ? { ...k, status } : k)); };
  const handleDeleteKey = async (id: string) => { if(userProfile && window.confirm("Delete?")) { await deleteApiKey(userProfile.email, id); setKeys(prev => prev.filter(k => k.id !== id)); }};
  
  const handleGenerateCode = async () => { 
      if(userProfile && selectedToolForCode) { 
          await generateAccessCode(userProfile.email, selectedToolForCode, customCodeInput); 
          setCustomCodeInput(''); 
          const codes = await getAccessCodes();
          setAccessCodes(codes);
      }
  };
  
  const handleDeleteCode = async (code: string) => { 
      if (window.confirm("Delete code?")) { 
          await deleteAccessCode(code); 
          setAccessCodes(prev => prev.filter(c => c.code !== code)); 
      }
  };

  const handleAcceptTicket = async () => {
      if (selectedTicket && userProfile) {
          await acceptSupportTicket(selectedTicket.id, userProfile.email);
      }
  };

  const handleReplyTicket = async () => {
      if(selectedTicket && adminReply.trim()) {
          await replyToTicket(selectedTicket.id, adminReply, true);
          setAdminReply('');
      }
  };

  const handleCloseTicket = async () => {
      if(selectedTicket) {
          await closeTicket(selectedTicket.id);
          setSelectedTicket(null);
      }
  };

  // --- Specific User Actions ---
  const handleToggleToolForUser = async (toolId: string, hasAccess: boolean) => {
      if (!selectedUserForEdit || !userProfile) return;
      
      if (hasAccess) {
          // Remove access
          await revokeToolAccess(userProfile.email, selectedUserForEdit.uid, toolId);
          setSelectedUserForEdit(prev => prev ? { ...prev, purchasedTools: prev.purchasedTools.filter(t => t !== toolId) } : null);
      } else {
          // Grant access
          await grantToolAccess(userProfile.email, selectedUserForEdit.uid, toolId);
          setSelectedUserForEdit(prev => prev ? { ...prev, purchasedTools: [...(prev.purchasedTools || []), toolId] } : null);
      }
      // Update local users list for consistency
      setUsers(prev => prev.map(u => u.uid === selectedUserForEdit.uid ? selectedUserForEdit! : u));
  };

  const handleSendUserNotification = async () => {
      if (!selectedUserForEdit || !userProfile || !userNotificationMsg.trim()) return;
      await sendUserNotification(userProfile.email, selectedUserForEdit.uid, "Admin Message", userNotificationMsg);
      setUserNotificationMsg('');
      alert("Notification Sent to " + selectedUserForEdit.username);
  };
  
  const filteredUsers = users.filter(u => (u.email || '').toLowerCase().includes(searchUser.toLowerCase()) || (u.username || '').toLowerCase().includes(searchUser.toLowerCase()));

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in p-4 pb-20">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-gray-800 pb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><Shield className="text-cyan-500" /> Command Center</h2>
        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar w-full md:w-auto">
            {['overview', 'users', 'tools', 'codes', 'support', 'keys'].map(tab => (
                <button 
                    key={tab} 
                    onClick={() => setActiveTab(tab as any)} 
                    className={`px-4 py-2 rounded-lg font-bold capitalize transition-all border text-sm whitespace-nowrap ${activeTab === tab ? 'bg-cyan-600 border-cyan-500 text-white shadow' : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-gray-300'}`}
                >
                    {tab}
                </button>
            ))}
            <Button onClick={loadData} variant="secondary" className="px-3" icon={<RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />}></Button>
        </div>
      </div>

      <div className="bg-gray-950/30 rounded-3xl min-h-[600px] relative">
      
      {/* --- OVERVIEW TAB --- */}
      {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800"><h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total Users</h3><p className="text-4xl font-black text-white mt-2 flex items-center gap-2">{stats.total} <Users size={20} className="text-gray-600"/></p></div>
                  <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800"><h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">Admins</h3><p className="text-4xl font-black text-cyan-400 mt-2 flex items-center gap-2">{stats.admins} <Shield size={20} className="text-cyan-900"/></p></div>
                  <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800"><h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">Tickets</h3><p className="text-4xl font-black text-yellow-500 mt-2 flex items-center gap-2">{tickets.filter(t => t.status === 'pending').length} <MessageCircle size={20} className="text-yellow-900"/></p></div>
                  <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800"><h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">API Keys</h3><p className="text-4xl font-black text-green-500 mt-2 flex items-center gap-2">{keys.filter(k => k.status === 'active').length} <Key size={20} className="text-green-900"/></p></div>
              </div>
              
              <div className="bg-gradient-to-r from-blue-900/10 to-cyan-900/10 p-6 rounded-2xl border border-blue-500/20 backdrop-blur-sm">
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2"><Bell size={18}/> System Broadcast</h3>
                  <div className="flex gap-2"><Input value={broadcastMessage} onChange={e => setBroadcastMessage(e.target.value)} placeholder="Send a global notification to ALL users..." className="bg-black/50 border-blue-900/50" /><Button onClick={() => {if(userProfile) sendBroadcast(broadcastMessage, userProfile.email); setBroadcastMessage(''); alert('Broadcast Sent!');}} disabled={!broadcastMessage}>Send to All</Button></div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 h-96 overflow-y-auto custom-scrollbar">
                     <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 sticky top-0 bg-gray-900 pb-2 z-10"><Activity size={18}/> Recent Activity</h3>
                     <div className="space-y-3">
                         {activityLogs.slice(0, 10).map(log => (
                             <div key={log.id} className="text-sm border-b border-gray-800 pb-3 flex items-start gap-3">
                                 <div className="mt-1 w-2 h-2 rounded-full bg-cyan-500"></div>
                                 <div>
                                     <div className="text-white font-medium">{log.tool}</div>
                                     <div className="text-xs text-gray-500">{log.userEmail} • {new Date(log.timestamp).toLocaleString()}</div>
                                     <div className="text-xs text-gray-600 truncate max-w-xs">{log.prompt}</div>
                                 </div>
                             </div>
                         ))}
                     </div>
                 </div>
                 <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 h-96 overflow-y-auto custom-scrollbar">
                     <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 sticky top-0 bg-gray-900 pb-2 z-10"><Key size={18}/> Key Rotations</h3>
                     <div className="space-y-3">
                         {rotationLogs.slice(0, 10).map(log => (
                             <div key={log.id} className="text-sm border-b border-gray-800 pb-3">
                                 <div className="flex justify-between items-center mb-1">
                                     <span className="text-orange-400 font-bold">{log.provider}</span>
                                     <span className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                 </div>
                                 <div className="text-xs text-gray-400">Switched to: <span className="text-white">{log.newKeyAlias}</span></div>
                                 <div className="text-xs text-red-400/70">Reason: {log.reason}</div>
                             </div>
                         ))}
                     </div>
                 </div>
              </div>
          </div>
      )}

      {/* --- CODES TAB --- */}
      {activeTab === 'codes' && (
          <div className="space-y-6 animate-fade-in">
              <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Lock size={18}/> Generate Access Code</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-black/20 p-4 rounded-xl">
                      <div>
                          <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Tool to Unlock</label>
                          <select 
                              value={selectedToolForCode} 
                              onChange={e => setSelectedToolForCode(e.target.value)} 
                              className="w-full bg-black border border-gray-700 rounded-lg p-2.5 text-white"
                          >
                              <option value="">Select Tool...</option>
                              {toolsData.filter(t => t.access !== 'Free').map(t => (
                                  <option key={t.id} value={t.id}>{t.name} ({t.access})</option>
                              ))}
                          </select>
                      </div>
                      <div>
                          <Input label="Custom Code (Optional)" placeholder="VIP-USER-123" value={customCodeInput} onChange={e => setCustomCodeInput(e.target.value)} />
                      </div>
                      <Button onClick={handleGenerateCode} disabled={!selectedToolForCode}>Generate Code</Button>
                  </div>
              </div>

              <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                  <table className="w-full text-left text-sm text-gray-400">
                      <thead className="bg-black text-gray-200 font-bold uppercase text-xs">
                          <tr><th className="px-6 py-4">Code</th><th className="px-6 py-4">Tool</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Used By</th><th className="px-6 py-4">Action</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                          {accessCodes.map(code => (
                              <tr key={code.id} className="hover:bg-gray-800/30">
                                  <td className="px-6 py-4 font-mono text-cyan-400 font-bold flex items-center gap-2">
                                      {code.code}
                                      <button onClick={() => navigator.clipboard.writeText(code.code)} title="Copy" className="text-gray-600 hover:text-white"><Copy size={12}/></button>
                                  </td>
                                  <td className="px-6 py-4 text-white">{toolsData.find(t => t.id === code.toolId)?.name || code.toolId}</td>
                                  <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs font-bold uppercase ${code.status === 'unused' ? 'bg-green-900/30 text-green-500' : 'bg-red-900/30 text-red-500'}`}>{code.status}</span></td>
                                  <td className="px-6 py-4 text-xs">{code.usedBy ? <div>{code.usedBy}<br/><span className="text-gray-600">{new Date(code.usedAt!).toLocaleDateString()}</span></div> : '-'}</td>
                                  <td className="px-6 py-4"><button onClick={() => handleDeleteCode(code.code)} className="text-red-500 hover:text-red-400"><Trash2 size={16}/></button></td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* --- SUPPORT TAB --- */}
      {activeTab === 'support' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in h-[600px]">
              {/* Ticket List */}
              <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-gray-800 bg-gray-950 font-bold text-white flex justify-between items-center">
                      <span>Support Tickets</span>
                      <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">{tickets.filter(t => t.status === 'pending').length} Pending</span>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                      {tickets.map(ticket => (
                          <div 
                              key={ticket.id} 
                              onClick={() => setSelectedTicket(ticket)}
                              className={`p-4 border-b border-gray-800 cursor-pointer transition-all hover:bg-gray-800 ${selectedTicket?.id === ticket.id ? 'bg-gray-800 border-l-4 border-l-cyan-500' : ''}`}
                          >
                              <div className="flex justify-between mb-1">
                                  <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${ticket.status === 'pending' ? 'bg-yellow-900/30 text-yellow-500' : (ticket.status === 'active' ? 'bg-green-900/30 text-green-500' : 'bg-gray-700 text-gray-400')}`}>{ticket.status}</span>
                                  <span className="text-xs text-gray-500">{new Date(ticket.lastUpdate).toLocaleDateString()}</span>
                              </div>
                              <h4 className="font-bold text-white truncate">{ticket.subject}</h4>
                              <p className="text-xs text-gray-400 truncate">{ticket.userEmail}</p>
                          </div>
                      ))}
                  </div>
              </div>

              {/* Chat View */}
              <div className="lg:col-span-2 bg-gray-900 rounded-2xl border border-gray-800 flex flex-col overflow-hidden relative">
                  {selectedTicket ? (
                      <>
                          <div className="p-4 border-b border-gray-800 bg-gray-950 flex justify-between items-center">
                              <div>
                                  <h3 className="font-bold text-white">{selectedTicket.subject}</h3>
                                  <p className="text-xs text-gray-400">User: {selectedTicket.userEmail} | ID: {selectedTicket.userId.substring(0,8)}</p>
                              </div>
                              {selectedTicket.status !== 'closed' && (
                                  <Button variant="danger" onClick={handleCloseTicket} className="text-xs px-3 py-1.5 h-auto">Close Ticket</Button>
                              )}
                          </div>
                          
                          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/20 custom-scrollbar">
                              {selectedTicket.messages.map((msg, idx) => (
                                  <div key={idx} className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                                      <div className={`max-w-[80%] rounded-xl p-3 ${msg.sender === 'admin' ? 'bg-cyan-600 text-white rounded-br-none' : 'bg-gray-800 text-gray-200 rounded-bl-none'}`}>
                                          <p className="text-sm">{msg.text}</p>
                                          <p className="text-[10px] opacity-60 mt-1 text-right">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                                      </div>
                                  </div>
                              ))}
                              <div ref={chatEndRef} />
                          </div>

                          <div className="p-4 bg-gray-950 border-t border-gray-800">
                              {selectedTicket.status === 'closed' ? (
                                  <div className="text-center text-gray-500 text-sm bg-gray-900 p-2 rounded">This ticket is closed.</div>
                              ) : selectedTicket.status === 'pending' ? (
                                  <div className="flex flex-col items-center justify-center p-2 gap-2">
                                      <p className="text-xs text-yellow-500">This request is pending approval.</p>
                                      <Button onClick={handleAcceptTicket} className="w-full !bg-green-600 hover:!bg-green-500" icon={<UserPlus size={16}/>}>Accept Chat Request</Button>
                                  </div>
                              ) : (
                                  <div className="flex gap-2">
                                      <Input 
                                          value={adminReply} 
                                          onChange={e => setAdminReply(e.target.value)} 
                                          placeholder="Type a reply..." 
                                          className="bg-gray-900 border-gray-700"
                                          onKeyDown={e => e.key === 'Enter' && handleReplyTicket()}
                                      />
                                      <Button onClick={handleReplyTicket} disabled={!adminReply.trim()} icon={<Send size={16}/>}>Reply</Button>
                                  </div>
                              )}
                          </div>
                      </>
                  ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-500">
                          <MessageCircle size={48} className="mb-4 opacity-20"/>
                          <p>Select a ticket to view conversation</p>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* --- KEYS TAB --- */}
      {activeTab === 'keys' && (
          <div className="space-y-6 animate-fade-in">
               {/* LOCAL KEY MANAGER */}
               <div className="bg-gradient-to-r from-gray-900 to-black p-8 rounded-2xl border border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.1)] relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none"><Laptop size={120} /></div>
                   <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3"><Laptop size={24} className="text-cyan-400"/> Primary Engine Key</h3>
                   <div className="flex flex-col md:flex-row gap-4 items-end bg-black/40 p-6 rounded-xl border border-gray-800">
                       <div className="flex-1 w-full">
                           <label className="text-xs text-gray-500 font-bold uppercase mb-2 block">ZamanX API Key (Override)</label>
                           <div className="relative">
                               <Input 
                                   value={localKeyInput} 
                                   onChange={e => setLocalKeyInput(e.target.value)} 
                                   placeholder="sk-..." 
                                   className="bg-black border-cyan-900 text-cyan-100 font-mono pl-10 h-12"
                                   type="password"
                               />
                               <Key className="absolute left-3 top-3.5 text-cyan-600" size={18} />
                           </div>
                       </div>
                       <Button onClick={handleLocalKeySave} className="!bg-cyan-600 h-12 px-8" icon={<Clock size={18}/>}>Update Local Key</Button>
                   </div>
               </div>

               {/* SYSTEM KEYS */}
               <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
                  <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><Key size={18}/> System Key Pool</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-black/20 p-4 rounded-xl mb-6">
                      <div className="md:col-span-1">
                          <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">Provider</label>
                          <select value={newKeyProvider} onChange={e => setNewKeyProvider(e.target.value as AIProvider)} className="w-full bg-black border border-gray-700 rounded-lg p-2.5 text-white h-10"><option value="GOOGLE">Google Gemini</option><option value="OPENAI">OpenAI</option><option value="DEEPSEEK">DeepSeek</option></select>
                      </div>
                      <div className="md:col-span-1"><Input label="Alias" placeholder="Key 1" value={newKeyAlias} onChange={e => setNewKeyAlias(e.target.value)} className="h-10" /></div>
                      <div className="md:col-span-1"><Input label="Key String" placeholder="AIzaSy..." value={newKey} onChange={e => setNewKey(e.target.value)} type="password" className="h-10" /></div>
                      <Button onClick={handleAddKey} disabled={!newKey} className="h-10">Add to Pool</Button>
                  </div>
                  
                  <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-gray-400">
                          <thead className="bg-black text-gray-200 font-bold uppercase text-xs">
                              <tr><th className="px-6 py-4 rounded-tl-xl">Alias</th><th className="px-6 py-4">Provider</th><th className="px-6 py-4">Usage</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 rounded-tr-xl">Action</th></tr>
                          </thead>
                          <tbody className="divide-y divide-gray-800 bg-gray-900/50">
                              {keys.map(key => (
                                  <tr key={key.id} className="hover:bg-gray-800/50 transition-colors">
                                      <td className="px-6 py-4 font-bold text-white">{key.alias}</td>
                                      <td className="px-6 py-4"><span className="bg-gray-800 px-2 py-1 rounded text-xs">{key.provider}</span></td>
                                      <td className="px-6 py-4 font-mono">{key.usageCount} / {key.usageLimit}</td>
                                      <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs font-bold uppercase ${key.status === 'active' ? 'bg-green-900/30 text-green-500' : 'bg-red-900/30 text-red-500'}`}>{key.status}</span></td>
                                      <td className="px-6 py-4 flex gap-2">
                                          <button onClick={() => handleKeyStatus(key.id, key.status === 'active' ? 'suspended' : 'active')} className="p-2 rounded bg-gray-800 hover:text-white">{key.status === 'active' ? <PauseCircle size={14}/> : <CheckCircle size={14}/>}</button>
                                          <button onClick={() => handleDeleteKey(key.id)} className="p-2 rounded bg-red-900/20 text-red-500 hover:bg-red-900/40"><Trash2 size={14}/></button>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

      {/* --- USERS TAB --- */}
      {activeTab === 'users' && (
          <div className="space-y-4 animate-fade-in">
              <Input placeholder="Search users by email or name..." value={searchUser} onChange={e => setSearchUser(e.target.value)} icon={<Search size={16}/>} className="bg-black border-gray-800 h-12" />
              <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                  <table className="w-full text-left text-sm text-gray-400">
                      <thead className="bg-black text-gray-200 font-bold uppercase text-xs">
                          <tr><th className="px-6 py-4">User</th><th className="px-6 py-4">Role / Plan</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Action</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                          {filteredUsers.map(user => (
                              <tr key={user.uid} className="hover:bg-gray-800/30">
                                  <td className="px-6 py-4"><div>{user.email}</div><div className="text-xs text-gray-500">{user.username}</div></td>
                                  <td className="px-6 py-4 space-y-1">
                                      <select value={user.role} onChange={(e) => handleRoleChange(user.uid, user.email, e.target.value)} className="bg-black border border-gray-700 rounded px-2 py-1 text-xs text-white w-full"><option value="user">User</option><option value="admin">Admin</option></select>
                                      <select value={user.plan} onChange={(e) => handlePlanChange(user.uid, e.target.value)} className="bg-black border border-gray-700 rounded px-2 py-1 text-xs text-white w-full"><option value="Free">Free</option><option value="Pro">Pro</option></select>
                                  </td>
                                  <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs ${user.isBanned ? 'bg-red-900/30 text-red-500' : 'bg-green-900/30 text-green-500'}`}>{user.isBanned ? 'BANNED' : 'ACTIVE'}</span></td>
                                  <td className="px-6 py-4 flex gap-2">
                                      <button onClick={() => setSelectedUserForEdit(user)} className="px-3 py-1.5 rounded text-xs border border-blue-500/30 bg-blue-900/20 text-blue-400 hover:bg-blue-900/40">Manage</button>
                                      <button onClick={() => handleBanToggle(user.uid, user.email, user.isBanned)} className={`px-3 py-1.5 rounded text-xs border transition-all ${user.isBanned ? 'bg-green-600 text-white border-green-500' : 'bg-red-900/20 text-red-500 border-red-500/30 hover:bg-red-900/40'}`}>{user.isBanned ? 'Unban' : 'Ban'}</button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* --- USER MANAGEMENT MODAL --- */}
      {selectedUserForEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
              <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
                  <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-950">
                      <div>
                          <h3 className="text-xl font-bold text-white flex items-center gap-2"><Settings size={20} className="text-cyan-500"/> Manage User</h3>
                          <p className="text-xs text-gray-400">{selectedUserForEdit.email}</p>
                      </div>
                      <button onClick={() => setSelectedUserForEdit(null)} className="text-gray-400 hover:text-white"><XCircle size={24}/></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                      
                      {/* Section 1: Send Message */}
                      <div className="bg-black/30 p-4 rounded-xl border border-gray-800">
                          <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2"><Mail size={16} className="text-yellow-500"/> Direct Notification</h4>
                          <div className="flex gap-2">
                              <Input 
                                  value={userNotificationMsg} 
                                  onChange={e => setUserNotificationMsg(e.target.value)} 
                                  placeholder="Type a message to send to this user..." 
                                  className="bg-gray-900 border-gray-700"
                              />
                              <Button onClick={handleSendUserNotification} disabled={!userNotificationMsg} icon={<Send size={16}/>}>Send</Button>
                          </div>
                      </div>

                      {/* Section 2: Tool Access Management */}
                      <div className="bg-black/30 p-4 rounded-xl border border-gray-800">
                          <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Lock size={16} className="text-green-500"/> Access Control</h4>
                          <p className="text-xs text-gray-500 mb-4">Toggle specific tools to grant access regardless of the user's plan.</p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {toolsData.map(tool => {
                                  const hasAccess = selectedUserForEdit.purchasedTools?.includes(tool.id);
                                  return (
                                      <div key={tool.id} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${hasAccess ? 'bg-green-900/10 border-green-500/30' : 'bg-gray-800 border-gray-700'}`}>
                                          <div className="flex items-center gap-2">
                                              <span className={`w-2 h-2 rounded-full ${hasAccess ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                                              <span className="text-sm font-bold text-gray-300">{tool.name}</span>
                                          </div>
                                          <button 
                                              onClick={() => handleToggleToolForUser(tool.id, !!hasAccess)}
                                              className={`text-2xl transition-colors ${hasAccess ? 'text-green-500 hover:text-green-400' : 'text-gray-600 hover:text-gray-400'}`}
                                          >
                                              {hasAccess ? <ToggleRight /> : <ToggleLeft />}
                                          </button>
                                      </div>
                                  );
                              })}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- TOOLS TAB --- */}
      {activeTab === 'tools' && <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden animate-fade-in"><table className="w-full text-left text-sm text-gray-400"><thead className="bg-black text-gray-200 font-bold uppercase text-xs"><tr><th className="px-6 py-4">Tool Name</th><th className="px-6 py-4">Visibility</th><th className="px-6 py-4">Access Level</th><th className="px-6 py-4">Base Price ($)</th></tr></thead><tbody className="divide-y divide-gray-800">{toolsData.map(tool => (<tr key={tool.id} className="hover:bg-gray-800/30"><td className="px-6 py-4 font-bold text-white">{tool.name}</td><td className="px-6 py-4"><button onClick={() => handleToolUpdate(tool.id, 'visibility', tool.visibility === 'visible' ? 'hidden' : 'visible')} className={`p-2 border rounded transition-all ${tool.visibility === 'visible' ? 'bg-green-900/20 text-green-400 border-green-500/30' : 'bg-gray-800 text-gray-500'}`}>{tool.visibility==='visible'?'Visible':'Hidden'}</button></td><td className="px-6 py-4"><select value={tool.access} onChange={(e) => handleToolUpdate(tool.id, 'access', e.target.value)} className="bg-black border border-gray-700 rounded px-2 py-1 text-xs text-white"><option value="Free">Free</option><option value="Pro">Pro</option><option value="Ultra">Ultra</option></select></td><td className="px-6 py-4"><input type="number" defaultValue={tool.basePriceUSD} onBlur={(e) => handleToolUpdate(tool.id, 'basePriceUSD', e.target.value)} className="w-20 bg-black border border-gray-700 rounded px-2 py-1 text-xs text-white text-center"/></td></tr>))}</tbody></table></div>}
      
      </div>
    </div>
  );
};

export default AdminDashboard;