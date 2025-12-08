
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { updatePassword } from 'firebase/auth';
import Button from '../components/Button';
import { Input } from '../components/Input';
import { User, Mail, Phone, Lock, Camera, CheckCircle, Shield, CreditCard, Zap, Save, AlertCircle } from 'lucide-react';

const UserDashboard: React.FC = () => {
  const { currentUser, userProfile, updateProfile } = useAuth();
  
  // Form State
  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currency, setCurrency] = useState('USD');
  
  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (userProfile) {
      setUsername(userProfile.username || '');
      setPhoneNumber(userProfile.phoneNumber || '');
      setCurrency(userProfile.currency || 'USD');
    }
  }, [userProfile]);

  const handleUpdateInfo = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      await updateProfile({ 
          username, 
          phoneNumber,
          currency: currency as any
      });
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update profile.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }

    setIsLoading(true);
    setMessage(null);
    try {
      if (currentUser) {
        await updatePassword(currentUser, newPassword);
        setMessage({ type: 'success', text: 'Password changed successfully!' });
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        setMessage({ type: 'error', text: 'Security check: Please log out and log in again to change your password.' });
      } else {
        setMessage({ type: 'error', text: 'Failed to change password. ' + error.message });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1 * 1024 * 1024) { // 1MB Limit for Firestore Document Safety
        setMessage({ type: 'error', text: 'Image too large. Max size 1MB.' });
        return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
            await updateProfile({ photoURL: base64 });
            setMessage({ type: 'success', text: 'Profile picture updated!' });
        } catch (e) {
            setMessage({ type: 'error', text: 'Failed to upload image.' });
        }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-12">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-2">
          <User className="text-cyan-400" /> User Dashboard
        </h2>
        <p className="text-gray-400">Manage your account settings, security, and preferences.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Profile Card */}
        <div className="lg:col-span-1 space-y-6">
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-cyan-600/20 to-blue-600/20"></div>
                
                <div className="relative z-10 mx-auto w-24 h-24 rounded-full border-4 border-gray-900 bg-gray-800 flex items-center justify-center overflow-hidden group cursor-pointer mb-4 shadow-xl" onClick={() => fileInputRef.current?.click()}>
                    {userProfile?.photoURL ? (
                        <img src={userProfile.photoURL} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        <User size={40} className="text-gray-500" />
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera size={20} className="text-white" />
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                </div>
                
                <h3 className="text-xl font-bold text-white">{userProfile?.username || 'User'}</h3>
                <p className="text-sm text-gray-500 mb-4">{userProfile?.email}</p>
                
                <div className="flex justify-center gap-2 mb-6">
                    <span className="px-3 py-1 bg-cyan-900/30 text-cyan-400 text-xs font-bold uppercase rounded-full border border-cyan-500/20">
                        {userProfile?.plan} Plan
                    </span>
                    <span className="px-3 py-1 bg-purple-900/30 text-purple-400 text-xs font-bold uppercase rounded-full border border-purple-500/20">
                        {userProfile?.credits} Credits
                    </span>
                </div>

                <div className="border-t border-gray-800 pt-4 text-left space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">User ID</span>
                        <span className="font-mono text-gray-300 text-xs">{userProfile?.uid.substring(0, 8)}...</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Member Since</span>
                        <span className="text-gray-300">{new Date(userProfile?.createdAt || Date.now()).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Role</span>
                        <span className="text-gray-300 capitalize">{userProfile?.role}</span>
                    </div>
                </div>
            </div>

            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Zap size={18} className="text-yellow-500"/> My Tools
                </h3>
                {userProfile?.purchasedTools && userProfile.purchasedTools.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {userProfile.purchasedTools.map(t => (
                            <span key={t} className="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded border border-gray-700">
                                {t}
                            </span>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-gray-500">No premium tools purchased yet.</p>
                )}
            </div>
        </div>

        {/* Right Column: Settings */}
        <div className="lg:col-span-2 space-y-6">
            {message && (
                <div className={`p-4 rounded-xl flex items-center gap-2 text-sm font-medium ${message.type === 'success' ? 'bg-green-900/20 text-green-400 border border-green-500/30' : 'bg-red-900/20 text-red-400 border border-red-500/30'}`}>
                    {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                    {message.text}
                </div>
            )}

            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Shield size={20} className="text-cyan-400"/> Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input 
                        label="Username" 
                        value={username} 
                        onChange={e => setUsername(e.target.value)} 
                        icon={<User size={16}/>}
                    />
                    <Input 
                        label="Phone Number" 
                        value={phoneNumber} 
                        onChange={e => setPhoneNumber(e.target.value)} 
                        icon={<Phone size={16}/>}
                        placeholder="+1234567890"
                    />
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-300 mb-1">Preferred Currency</label>
                        <select 
                            value={currency} 
                            onChange={e => setCurrency(e.target.value)}
                            className="w-full bg-black/40 border border-gray-700 rounded-lg py-2 px-4 text-white focus:border-cyan-500 outline-none"
                        >
                            <option value="USD">USD ($)</option>
                            <option value="PKR">PKR (₨)</option>
                            <option value="INR">INR (₹)</option>
                            <option value="AED">AED (AED)</option>
                        </select>
                    </div>
                </div>
                <div className="mt-6 flex justify-end">
                    <Button onClick={handleUpdateInfo} disabled={isLoading} icon={<Save size={16}/>}>
                        {isLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </div>

            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Lock size={20} className="text-red-400"/> Security
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input 
                        label="New Password" 
                        type="password"
                        value={newPassword} 
                        onChange={e => setNewPassword(e.target.value)} 
                        icon={<Lock size={16}/>}
                        placeholder="Min 6 characters"
                    />
                    <Input 
                        label="Confirm Password" 
                        type="password"
                        value={confirmPassword} 
                        onChange={e => setConfirmPassword(e.target.value)} 
                        icon={<Lock size={16}/>}
                        placeholder="Re-enter password"
                    />
                </div>
                <div className="mt-6 flex justify-end">
                    <Button variant="danger" onClick={handlePasswordChange} disabled={isLoading || !newPassword}>
                        {isLoading ? 'Updating...' : 'Change Password'}
                    </Button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
