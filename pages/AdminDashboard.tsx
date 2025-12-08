
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToolContext } from '../contexts/ToolContext';
import { 
    fetchAllUsers, updateUserRole, toggleBanUser, updateUserPlan, updateUserCredits, getStats, 
    addApiKey, getApiKeys, deleteApiKey, updateToolVisibility, updateToolStatus, updateToolAccess, 
    updateToolPrice, getSupportTickets, getRotationLogs, updateKeyStatus, sendBroadcast, 
    fetchActivityLogs, replyToTicket, closeTicket, updateContactDetails, generateAccessCode, 
    getAccessCodes, getTools, deleteAccessCode 
} from '../services/adminService';
import { 
    UserProfile, StoredKey, ContactDetails, AIProvider, ToolConfig, SupportTicket, 
    KeyRotationLog, PlanType, UserRole, ActivityLog, AccessCode 
} from '../types';
import Button from '../components/Button';
import { Input, TextArea } from '../components/Input';
import { 
    Users, Shield, RefreshCw, Key, Trash2, Zap, MessageCircle, RotateCcw, 
    CheckCircle, PauseCircle, Plus, Search, Ban, Unlock, DollarSign, Send, 
    Activity, Ticket, Globe, Settings, MapPin, Mail, Phone, Lock, CreditCard, 
    Eye, EyeOff, Power, Save, ChevronDown, ChevronUp, Copy, Bell
} from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const { userProfile } = useAuth();
  // We fetch tools from service to ensure we can edit them without fighting context updates, 
  // though context syncs eventually.
  const { contactDetails } = useToolContext(); 
  
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'tools' | 'codes' | 'keys' | 'support' | 'activity' | 'settings'>('overview');
  const [isLoading, setIsLoading] = useState(false);

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
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  
  // Forms
  const [editContact, setEditContact] = useState<ContactDetails>(contactDetails);
  const [selectedToolForCode, setSelectedToolForCode] = useState('');
  const [customCodeInput, setCustomCodeInput] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newKeyProvider, setNewKeyProvider] = useState<AIProvider>('GOOGLE');
  const [newKeyAlias, setNewKeyAlias] = useState('');

  // --- Initial Load ---
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [
          uData, sData, tData, kData, cData, tickData, actData, rotData
      ] = await Promise.all([
          fetchAllUsers(),
          getStats(),
          getTools(),
          getApiKeys(),
          getAccessCodes(),
          getSupportTickets(),
          fetchActivityLogs(),
          getRotationLogs()
      ]);

      setUsers(uData);
      setStats(sData);
      setToolsData(tData.sort((a,b) => a.name.localeCompare(b.name)));
      setKeys(kData);
      setAccessCodes(cData);
      setTickets(tickData);
      setActivityLogs(actData);
      setRotationLogs(rotData);
    } catch (e) {
      console.error("Dashboard Load Error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    setEditContact(contactDetails);
  }, [contactDetails]);

  // --- Handlers: Users ---
  const handleRoleChange = async (uid: string, email: string, role: string) => {
      if(!userProfile) return;
      await updateUserRole(userProfile.email, uid, email, role as UserRole);
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role: role as UserRole } : u));
  };
  const handlePlanChange = async (uid: string, plan: string) => {
      if(!userProfile) return;
      await updateUserPlan(uid, plan as PlanType, userProfile.email);
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, plan: plan as PlanType } : u));
  };
  const handleBanToggle = async (uid: string, email: string, current: boolean) => {
      if(!userProfile) return;
      await toggleBanUser(userProfile.email, uid, email, current);
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, isBanned: !current } : u));
  };

  // --- Handlers: Tools ---
  const handleToolUpdate = async (toolId: string, field: string, value: any) => {
      if(field === 'visibility') await updateToolVisibility(toolId, value);
      if(field === 'status') await updateToolStatus(toolId, value);
      if(field === 'access') await updateToolAccess(toolId, value);
      if(field === 'basePriceUSD') await updateToolPrice(toolId, parseFloat(value));
      
      // Optimistic Update
      setToolsData(prev => prev.map(t => t.id === toolId ? { ...t, [field]: value } : t));
  };

  // --- Handlers: Codes ---
  const handleGenerateCode = async () => {
      if(userProfile && selectedToolForCode) {
          await generateAccessCode(userProfile.email, selectedToolForCode, customCodeInput);
          setCustomCodeInput('');
          loadData(); // Refresh codes
      }
  };
  
  const handleDeleteCode = async (code: string) => {
      if (window.confirm("Are you sure you want to delete this access code?")) {
          await deleteAccessCode(code);
          setAccessCodes(prev => prev.filter(c => c.code !== code));
      }
  };

  // --- Handlers: Keys ---
  const handleAddKey = async () => {
      if(userProfile && newKey) {
          await addApiKey(userProfile.email, newKey, newKeyProvider, newKeyAlias || 'New Key');
          setNewKey(''); setNewKeyAlias('');
          loadData();
      }
  };
  const handleKeyStatus = async (id: string, status: any) => {
      await updateKeyStatus(id, status);
      setKeys(prev => prev.map(k => k.id === id ? { ...k, status } : k));
  };
  const handleDeleteKey = async (id: string) => {
      if(userProfile && window.confirm("Delete this API key permanently?")) {
          await deleteApiKey(userProfile.email, id);
          setKeys(prev => prev.filter(k => k.id !== id));
      }
  };

  // --- Handlers: Support ---
  const handleReply = async (ticketId: string) => {
      if(!replyText) return;
      await replyToTicket(ticketId, replyText, true);
      setReplyText('');
      loadData();
  };
  const handleCloseTicket = async (ticketId: string) => {
      await closeTicket(ticketId);
      loadData();
  };

  // --- Handlers: Settings ---
  const handleSaveSettings = async () => {
      if(userProfile) {
          await updateContactDetails(userProfile.email, editContact);
          alert("Settings Saved Successfully!");
      }
  };

  // --- Handlers: Broadcast ---
  const handleBroadcast = async () => {
      if(!userProfile || !broadcastMessage.trim()) return;
      if(window.confirm("Send this message to ALL users?")) {
          await sendBroadcast(broadcastMessage, userProfile.email);
          setBroadcastMessage('');
          alert("Notification Sent!");
      }
  };

  // Filtered Users
  const filteredUsers = users.filter(u => 
      (u.email || '').toLowerCase().includes(searchUser.toLowerCase()) || 
      (u.username || '').toLowerCase().includes(searchUser.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in p-4 pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-gray-800 pb-6">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-2">
              <Shield className="text-cyan-500" /> Admin Console
          </h2>
          <div className="flex items-center gap-2 mt-1">
             <span className="relative flex h-2 w-2">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
             </span>
             <p className="text-gray-400 text-xs font-mono">SYSTEM ONLINE • {userProfile?.email}</p>
          </div>
        </div>
        <Button onClick={loadData} variant="secondary" icon={<RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />}>
            Sync Database
        </Button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {[
            { id: 'overview', label: 'Overview', icon: <Activity size={16}/> },
            { id: 'users', label: 'Users', icon: <Users size={16}/> },
            { id: 'tools', label: 'Tools', icon: <Zap size={16}/> },
            { id: 'codes', label: 'Codes', icon: <Lock size={16}/> },
            { id: 'support', label: 'Support', icon: <Ticket size={16}/> },
            { id: 'keys', label: 'Keys', icon: <Key size={16}/> },
            { id: 'activity', label: 'Logs', icon: <RotateCcw size={16}/> },
            { id: 'settings', label: 'Settings', icon: <Settings size={16}/> },
        ].map(tab => (
            <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id as any)} 
                className={`px-5 py-3 rounded-xl font-bold flex items-center gap-2 whitespace-nowrap transition-all border ${
                    activeTab === tab.id 
                    ? 'bg-cyan-600 border-cyan-500 text-white shadow-[0_0_15px_rgba(8,145,178,0.4)]' 
                    : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                }`}
            >
                {tab.icon} {tab.label}
            </button>
        ))}
      </div>

      <div className="bg-gray-950/50 rounded-3xl border border-gray-800 p-6 shadow-2xl min-h-[600px] relative">
      
      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && (
          <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
                      <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total Users</h3>
                      <p className="text-4xl font-black text-white mt-2">{stats.total}</p>
                  </div>
                  <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
                      <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">Admins</h3>
                      <p className="text-4xl font-black text-cyan-400 mt-2">{stats.admins}</p>
                  </div>
                  <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
                      <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">Support Tickets</h3>
                      <p className="text-4xl font-black text-yellow-500 mt-2">{tickets.filter(t => t.status === 'pending').length}</p>
                  </div>
                  <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
                      <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">Active Keys</h3>
                      <p className="text-4xl font-black text-green-500 mt-2">{keys.filter(k => k.status === 'active').length}</p>
                  </div>
              </div>
              
              <div className="bg-gradient-to-r from-blue-900/20 to-cyan-900/20 p-6 rounded-2xl border border-blue-500/30">
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2"><Bell size={18}/> System Broadcast</h3>
                  <div className="flex gap-2">
                      <Input 
                         value={broadcastMessage}
                         onChange={e => setBroadcastMessage(e.target.value)}
                         placeholder="Send a notification to ALL users (e.g. 'Server maintenance at 10 PM')"
                         className="bg-black/50 border-blue-900/50"
                      />
                      <Button onClick={handleBroadcast} disabled={!broadcastMessage}>Send</Button>
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
                     <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Activity size={18}/> Recent Activity</h3>
                     <div className="space-y-3">
                         {activityLogs.slice(0, 5).map(log => (
                             <div key={log.id} className="text-sm border-b border-gray-800 pb-2">
                                 <span className="text-cyan-400 font-bold">{log.tool}</span> used by <span className="text-gray-400">{log.userEmail}</span>
                                 <div className="text-xs text-gray-600">{new Date(log.timestamp).toLocaleString()}</div>
                             </div>
                         ))}
                     </div>
                 </div>
                 <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
                     <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Key size={18}/> Key Rotations</h3>
                     <div className="space-y-3">
                         {rotationLogs.slice(0, 5).map(log => (
                             <div key={log.id} className="text-sm border-b border-gray-800 pb-2">
                                 <div className="flex justify-between">
                                    <span className="text-orange-400 font-bold">{log.provider}</span>
                                    <span className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                 </div>
                                 <div className="text-xs text-gray-400">Switched to: {log.newKeyAlias} ({log.reason})</div>
                             </div>
                         ))}
                     </div>
                 </div>
              </div>
          </div>
      )}

      {/* 2. USERS TAB */}
      {activeTab === 'users' && (
          <div className="space-y-4">
              <Input 
                placeholder="Search users by email or name..." 
                value={searchUser} 
                onChange={e => setSearchUser(e.target.value)}
                icon={<Search size={16}/>}
                className="bg-black border-gray-800"
              />
              <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                  <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-gray-400">
                          <thead className="bg-black text-gray-200 font-bold uppercase text-xs">
                              <tr>
                                  <th className="px-6 py-4">User</th>
                                  <th className="px-6 py-4">Plan / Role</th>
                                  <th className="px-6 py-4">Purchases</th>
                                  <th className="px-6 py-4">Status</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-800">
                              {filteredUsers.map(user => (
                                  <tr key={user.uid} className="hover:bg-gray-800/50 transition-colors">
                                      <td className="px-6 py-4">
                                          <div className="font-bold text-white">{user.email}</div>
                                          <div className="text-xs text-gray-500">{user.username || 'No Name'}</div>
                                          <div className="text-[10px] font-mono text-gray-600">{user.uid}</div>
                                      </td>
                                      <td className="px-6 py-4 space-y-1">
                                          <select value={user.role} onChange={(e) => handleRoleChange(user.uid, user.email, e.target.value)} className="bg-black border border-gray-700 rounded px-2 py-1 text-xs text-white w-full">
                                              <option value="user">User</option>
                                              <option value="admin">Admin</option>
                                              <option value="superadmin">Super Admin</option>
                                          </select>
                                          <select value={user.plan} onChange={(e) => handlePlanChange(user.uid, e.target.value)} className="bg-black border border-gray-700 rounded px-2 py-1 text-xs text-white w-full">
                                              <option value="Free">Free</option>
                                              <option value="Basic">Basic</option>
                                              <option value="Pro">Pro</option>
                                              <option value="Ultra">Ultra</option>
                                          </select>
                                      </td>
                                      <td className="px-6 py-4">
                                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                                              {user.purchasedTools?.length > 0 ? user.purchasedTools.map(t => (
                                                  <span key={t} className="text-[10px] bg-green-900/30 text-green-400 border border-green-500/30 px-1 rounded">{t}</span>
                                              )) : <span className="text-xs text-gray-600">-</span>}
                                          </div>
                                      </td>
                                      <td className="px-6 py-4">
                                          <button 
                                            onClick={() => handleBanToggle(user.uid, user.email, user.isBanned)} 
                                            className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-bold border ${user.isBanned ? 'bg-green-600 text-white border-green-500' : 'bg-red-900/30 text-red-500 border-red-500/50'}`}
                                          >
                                              {user.isBanned ? <Unlock size={12}/> : <Ban size={12}/>}
                                              {user.isBanned ? 'Unban' : 'Ban'}
                                          </button>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

      {/* 3. TOOLS TAB */}
      {activeTab === 'tools' && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-400">
                      <thead className="bg-black text-gray-200 font-bold uppercase text-xs">
                          <tr>
                              <th className="px-6 py-4">Tool Name</th>
                              <th className="px-6 py-4">Controls</th>
                              <th className="px-6 py-4">Access Level</th>
                              <th className="px-6 py-4">Price (USD)</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                          {toolsData.map(tool => (
                              <tr key={tool.id} className="hover:bg-gray-800/50 transition-colors">
                                  <td className="px-6 py-4">
                                      <div className="font-bold text-white flex items-center gap-2">
                                          {tool.name}
                                          {tool.demoAvailable && <span className="text-[10px] bg-blue-900 text-blue-300 px-1 rounded">DEMO</span>}
                                      </div>
                                      <div className="text-xs font-mono text-gray-500">{tool.id}</div>
                                  </td>
                                  <td className="px-6 py-4 flex items-center gap-2">
                                      <button 
                                          onClick={() => handleToolUpdate(tool.id, 'visibility', tool.visibility === 'visible' ? 'hidden' : 'visible')}
                                          className={`p-2 rounded border ${tool.visibility === 'visible' ? 'bg-cyan-900/20 text-cyan-400 border-cyan-500/30' : 'bg-gray-800 text-gray-600 border-gray-700'}`}
                                          title="Toggle Visibility"
                                      >
                                          {tool.visibility === 'visible' ? <Eye size={16}/> : <EyeOff size={16}/>}
                                      </button>
                                      <button 
                                          onClick={() => handleToolUpdate(tool.id, 'status', tool.status === 'active' ? 'inactive' : 'active')}
                                          className={`p-2 rounded border ${tool.status === 'active' ? 'bg-green-900/20 text-green-400 border-green-500/30' : 'bg-red-900/20 text-red-500 border-red-500/30'}`}
                                          title="Toggle Status"
                                      >
                                          <Power size={16}/>
                                      </button>
                                  </td>
                                  <td className="px-6 py-4">
                                      <select 
                                          value={tool.access} 
                                          onChange={(e) => handleToolUpdate(tool.id, 'access', e.target.value)}
                                          className="bg-black border border-gray-700 rounded px-2 py-1 text-xs text-white w-full"
                                      >
                                          <option value="Free">Free</option>
                                          <option value="Basic">Basic</option>
                                          <option value="Pro">Pro</option>
                                          <option value="Ultra">Ultra</option>
                                      </select>
                                  </td>
                                  <td className="px-6 py-4">
                                      <div className="flex items-center gap-2">
                                          <span className="text-gray-500">$</span>
                                          <input 
                                              type="number" 
                                              defaultValue={tool.basePriceUSD}
                                              onBlur={(e) => handleToolUpdate(tool.id, 'basePriceUSD', e.target.value)}
                                              className="w-20 bg-black border border-gray-700 rounded px-2 py-1 text-xs text-white"
                                          />
                                      </div>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* 4. ACCESS CODES TAB */}
      {activeTab === 'codes' && (
          <div className="space-y-6">
              <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Plus size={18}/> Generate Access Code</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                      <div>
                          <label className="text-xs text-gray-500 font-bold uppercase">Select Tool</label>
                          <select 
                            value={selectedToolForCode} 
                            onChange={e => setSelectedToolForCode(e.target.value)}
                            className="w-full bg-black border border-gray-700 rounded p-2.5 text-white"
                          >
                              <option value="">-- Select Tool --</option>
                              {toolsData.map(t => (
                                  <option key={t.id} value={t.id}>{t.name} (${t.basePriceUSD})</option>
                              ))}
                          </select>
                      </div>
                      <div>
                          <Input 
                            label="Custom Code (Optional)" 
                            placeholder="e.g. ZAMAN-VIP-01" 
                            value={customCodeInput} 
                            onChange={e => setCustomCodeInput(e.target.value)}
                          />
                      </div>
                      <Button onClick={handleGenerateCode} disabled={!selectedToolForCode}>Generate Code</Button>
                  </div>
              </div>

              <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                  <table className="w-full text-left text-sm text-gray-400">
                      <thead className="bg-black text-gray-200 font-bold uppercase text-xs">
                          <tr>
                              <th className="px-6 py-4">Code</th>
                              <th className="px-6 py-4">Tool</th>
                              <th className="px-6 py-4">Status</th>
                              <th className="px-6 py-4">Used By</th>
                              <th className="px-6 py-4">Created By</th>
                              <th className="px-6 py-4">Action</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                          {accessCodes.map(code => (
                              <tr key={code.id} className="hover:bg-gray-800/30">
                                  <td className="px-6 py-4 font-mono text-cyan-400 font-bold select-all flex items-center gap-2">
                                      {code.code}
                                      <button onClick={() => navigator.clipboard.writeText(code.code)} title="Copy" className="text-gray-600 hover:text-white"><Copy size={12}/></button>
                                  </td>
                                  <td className="px-6 py-4 text-white font-bold">{toolsData.find(t=>t.id===code.toolId)?.name || code.toolId}</td>
                                  <td className="px-6 py-4">
                                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${code.status === 'used' ? 'bg-red-900/30 text-red-500' : 'bg-green-900/30 text-green-500'}`}>
                                          {code.status}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4 text-gray-300">{code.usedBy || '-'}</td>
                                  <td className="px-6 py-4 text-gray-500 text-xs">{code.createdBy}</td>
                                  <td className="px-6 py-4 text-gray-500 text-xs">
                                     <button onClick={() => handleDeleteCode(code.code)} className="text-red-500 hover:text-red-400 p-1 bg-red-900/10 rounded">
                                        <Trash2 size={16}/>
                                     </button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* 5. SUPPORT TAB */}
      {activeTab === 'support' && (
          <div className="space-y-4">
              {tickets.length === 0 ? (
                  <div className="text-center text-gray-500 py-10">No support tickets found.</div>
              ) : (
                  tickets.map(ticket => (
                      <div key={ticket.id} className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                          <div 
                              className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-800/50 transition-colors"
                              onClick={() => setExpandedTicket(expandedTicket === ticket.id ? null : ticket.id)}
                          >
                              <div className="flex items-center gap-4">
                                  <div className={`w-2 h-2 rounded-full ${ticket.status === 'pending' ? 'bg-red-500 animate-pulse' : ticket.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                                  <div>
                                      <h4 className="font-bold text-white">{ticket.subject}</h4>
                                      <p className="text-xs text-gray-400">{ticket.userEmail} • {new Date(ticket.lastUpdate).toLocaleString()}</p>
                                  </div>
                              </div>
                              <div className="flex items-center gap-3">
                                  <span className="text-xs uppercase font-bold bg-black px-2 py-1 rounded text-gray-300">{ticket.status}</span>
                                  {expandedTicket === ticket.id ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                              </div>
                          </div>

                          {expandedTicket === ticket.id && (
                              <div className="p-4 border-t border-gray-800 bg-black/20">
                                  <div className="space-y-3 mb-4 max-h-60 overflow-y-auto custom-scrollbar p-2">
                                      {ticket.messages.map((msg, idx) => (
                                          <div key={idx} className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                                              <div className={`max-w-[80%] p-3 rounded-lg text-sm ${msg.sender === 'admin' ? 'bg-cyan-900/30 text-cyan-100 border border-cyan-500/30' : 'bg-gray-800 text-gray-300'}`}>
                                                  {msg.text}
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                                  
                                  {ticket.status !== 'closed' && (
                                      <div className="flex gap-2">
                                          <Input 
                                              value={replyText} 
                                              onChange={e => setReplyText(e.target.value)}
                                              placeholder="Type reply..."
                                              className="bg-black border-gray-700"
                                          />
                                          <Button onClick={() => handleReply(ticket.id)} icon={<Send size={16}/>}>Reply</Button>
                                          <Button variant="danger" onClick={() => handleCloseTicket(ticket.id)}>Close</Button>
                                      </div>
                                  )}
                              </div>
                          )}
                      </div>
                  ))
              )}
          </div>
      )}

      {/* 6. API KEYS TAB */}
      {activeTab === 'keys' && (
          <div className="space-y-6">
               <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Plus size={18}/> Add API Key</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                      <div className="md:col-span-1">
                          <label className="text-xs text-gray-500 font-bold uppercase">Provider</label>
                          <select 
                            value={newKeyProvider} 
                            onChange={e => setNewKeyProvider(e.target.value as AIProvider)}
                            className="w-full bg-black border border-gray-700 rounded p-2.5 text-white"
                          >
                              <option value="GOOGLE">Google Gemini</option>
                              <option value="OPENAI">OpenAI</option>
                              <option value="DEEPSEEK">DeepSeek</option>
                              <option value="CLAUDE">Claude/Anthropic</option>
                          </select>
                      </div>
                      <div className="md:col-span-1">
                          <Input 
                            label="Alias (Name)" 
                            placeholder="e.g. Primary Key" 
                            value={newKeyAlias} 
                            onChange={e => setNewKeyAlias(e.target.value)}
                          />
                      </div>
                      <div className="md:col-span-1">
                          <Input 
                            label="Key String" 
                            placeholder="AIzaSy..." 
                            value={newKey} 
                            onChange={e => setNewKey(e.target.value)}
                            type="password"
                          />
                      </div>
                      <Button onClick={handleAddKey} disabled={!newKey}>Add Key</Button>
                  </div>
              </div>

              <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                  <table className="w-full text-left text-sm text-gray-400">
                      <thead className="bg-black text-gray-200 font-bold uppercase text-xs">
                          <tr>
                              <th className="px-6 py-4">Alias</th>
                              <th className="px-6 py-4">Provider</th>
                              <th className="px-6 py-4">Usage</th>
                              <th className="px-6 py-4">Status</th>
                              <th className="px-6 py-4">Action</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                          {keys.map(key => (
                              <tr key={key.id} className="hover:bg-gray-800/30">
                                  <td className="px-6 py-4 font-bold text-white">{key.alias}</td>
                                  <td className="px-6 py-4">{key.provider}</td>
                                  <td className="px-6 py-4 font-mono">{key.usageCount} / {key.usageLimit}</td>
                                  <td className="px-6 py-4">
                                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${key.status === 'active' ? 'bg-green-900/30 text-green-500' : 'bg-red-900/30 text-red-500'}`}>
                                          {key.status}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4 flex gap-2">
                                      <button 
                                          onClick={() => handleKeyStatus(key.id, key.status === 'active' ? 'suspended' : 'active')}
                                          className="p-1.5 rounded bg-gray-800 hover:text-white"
                                      >
                                          {key.status === 'active' ? <PauseCircle size={14}/> : <CheckCircle size={14}/>}
                                      </button>
                                      <button 
                                          onClick={() => handleDeleteKey(key.id)}
                                          className="p-1.5 rounded bg-red-900/20 text-red-500 hover:bg-red-900/40"
                                      >
                                          <Trash2 size={14}/>
                                      </button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* 7. ACTIVITY LOGS TAB */}
      {activeTab === 'activity' && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
               <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-400">
                      <thead className="bg-black text-gray-200 font-bold uppercase text-xs">
                          <tr>
                              <th className="px-6 py-4">Time</th>
                              <th className="px-6 py-4">User</th>
                              <th className="px-6 py-4">Tool</th>
                              <th className="px-6 py-4">Prompt Snippet</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                          {activityLogs.map(log => (
                              <tr key={log.id} className="hover:bg-gray-800/30">
                                  <td className="px-6 py-4 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                                  <td className="px-6 py-4">{log.userEmail}</td>
                                  <td className="px-6 py-4 text-cyan-400 font-bold">{log.tool}</td>
                                  <td className="px-6 py-4 truncate max-w-xs" title={log.prompt}>{log.prompt}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* 8. SETTINGS TAB */}
      {activeTab === 'settings' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 space-y-6">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2"><Globe size={20}/> Contact & Support Info</h3>
                  
                  <Input label="Support Email" icon={<Mail size={16}/>} value={editContact.email} onChange={e => setEditContact({...editContact, email: e.target.value})} />
                  <Input label="Support Phone" icon={<Phone size={16}/>} value={editContact.phone} onChange={e => setEditContact({...editContact, phone: e.target.value})} />
                  <Input label="WhatsApp Link" icon={<MessageCircle size={16}/>} value={editContact.whatsappLink} onChange={e => setEditContact({...editContact, whatsappLink: e.target.value})} />
                  <Input label="Office Address" icon={<MapPin size={16}/>} value={editContact.address} onChange={e => setEditContact({...editContact, address: e.target.value})} />
              </div>
              <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 space-y-6">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2"><CreditCard size={20}/> Payment Details</h3>
                  <p className="text-xs text-gray-500">These details appear in the payment modal for users.</p>

                  <Input 
                      label="JazzCash Number" 
                      value={editContact.paymentInfo?.jazzcash || ''} 
                      onChange={e => setEditContact({...editContact, paymentInfo: { ...editContact.paymentInfo, jazzcash: e.target.value } as any})} 
                  />
                  <Input 
                      label="EasyPaisa Number" 
                      value={editContact.paymentInfo?.easypaisa || ''} 
                      onChange={e => setEditContact({...editContact, paymentInfo: { ...editContact.paymentInfo, easypaisa: e.target.value } as any})} 
                  />
                  <Input 
                      label="Bank Name" 
                      value={editContact.paymentInfo?.bankName || ''} 
                      onChange={e => setEditContact({...editContact, paymentInfo: { ...editContact.paymentInfo, bankName: e.target.value } as any})} 
                  />
                  <Input 
                      label="Account Number" 
                      value={editContact.paymentInfo?.bankAccount || ''} 
                      onChange={e => setEditContact({...editContact, paymentInfo: { ...editContact.paymentInfo, bankAccount: e.target.value } as any})} 
                  />
                  
                  <Button onClick={handleSaveSettings} className="w-full mt-4" icon={<Save size={16}/>}>Save All Settings</Button>
              </div>
          </div>
      )}
      
      </div>
    </div>
  );
};

export default AdminDashboard;
