
import React, { useState } from 'react';
import { auth, db } from '../firebaseConfig';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import Button from '../components/Button';
import { View, UserProfile } from '../types';
import { Lock, Mail, AlertCircle, ShieldCheck, ArrowLeft } from 'lucide-react';

interface AdminLoginProps {
  onNavigate: (view: View) => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const profile = docSnap.data() as UserProfile;
        
        if (profile.role === 'admin' || profile.role === 'superadmin') {
          onNavigate(View.ADMIN_DASHBOARD);
        } else if (user.email === 'zamanxai@gmail.com') {
           // Auto-promote hardcoded owner email if needed
           await updateDoc(docRef, { role: 'superadmin' });
           onNavigate(View.ADMIN_DASHBOARD);
        } else {
          await signOut(auth);
          setError("Access Denied: You do not have administrator privileges.");
        }
      } else {
        await signOut(auth);
        setError("System Error: User profile incomplete.");
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError("Invalid credentials. Please verify your email and password.");
      } else {
        setError("Authentication failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-black">
       <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
       <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-red-900/10 blur-[120px] rounded-full animate-float"></div>
       <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-orange-900/10 blur-[120px] rounded-full animate-float" style={{animationDelay: '2s'}}></div>

       <div className="relative z-10 w-full max-w-md p-8 bg-gray-950/80 backdrop-blur-xl border border-red-900/30 rounded-3xl shadow-[0_0_50px_rgba(220,38,38,0.1)] animate-fade-in">
          
          <button 
            onClick={() => onNavigate(View.LOGIN)}
            className="absolute top-6 left-6 text-gray-500 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="text-center mb-8 mt-4">
             <div className="w-16 h-16 bg-gradient-to-tr from-red-600 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-4">
                <ShieldCheck size={32} className="text-white" />
             </div>
             <h2 className="text-2xl font-bold text-white tracking-tight">Admin Portal</h2>
             <p className="text-red-400/80 mt-2 text-sm font-medium uppercase tracking-wider">Restricted Access</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-950/80 border border-red-500/50 rounded-xl flex items-center gap-2 text-red-200 text-sm animate-pulse">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-5">
             <div className="space-y-1">
               <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Admin Email</label>
               <div className="relative">
                 <Mail className="absolute left-4 top-3 text-gray-500" size={18} />
                 <input 
                   type="email" 
                   required
                   className="w-full bg-black/40 border border-gray-800 rounded-xl py-3 pl-12 pr-4 text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all placeholder-gray-600"
                   placeholder="admin@zamanx.ai"
                   value={email}
                   onChange={e => setEmail(e.target.value)}
                 />
               </div>
             </div>
             
             <div className="space-y-1">
               <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Password</label>
               <div className="relative">
                 <Lock className="absolute left-4 top-3 text-gray-500" size={18} />
                 <input 
                   type="password" 
                   required
                   className="w-full bg-black/40 border border-gray-800 rounded-xl py-3 pl-12 pr-4 text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all placeholder-gray-600"
                   placeholder="••••••••"
                   value={password}
                   onChange={e => setPassword(e.target.value)}
                 />
               </div>
               <div className="text-right">
                  <button 
                    type="button"
                    onClick={() => onNavigate(View.FORGOT_PASSWORD)} 
                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    Forgot Password?
                  </button>
               </div>
             </div>

             <Button 
               type="submit" 
               className={`w-full py-4 text-lg shadow-[0_0_20px_rgba(220,38,38,0.2)] !bg-gradient-to-r !from-red-600 !to-orange-700 hover:!from-red-500 hover:!to-orange-600 border-0 ${isLoading ? 'btn-loading' : ''}`}
               disabled={isLoading}
             >
               {isLoading ? 'Verifying Credentials...' : 'Access Dashboard'}
             </Button>
          </form>

          <div className="mt-8 text-center text-xs text-gray-700">
             ZamanX AI Secure Admin Environment
          </div>
       </div>
    </div>
  );
};

export default AdminLogin;
