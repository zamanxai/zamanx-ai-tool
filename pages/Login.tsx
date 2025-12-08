
import React, { useState, useEffect } from 'react';
import { auth } from '../firebaseConfig';
import { signInWithEmailAndPassword, getRedirectResult } from 'firebase/auth';
import Button from '../components/Button';
import { View } from '../types';
import { Lock, Mail, AlertCircle, Shield } from 'lucide-react';

interface LoginProps {
  onNavigate: (view: View) => void;
}

const Login: React.FC<LoginProps> = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          onNavigate(View.HOME);
        }
      })
      .catch((error) => {
        console.error("Redirect Auth Error:", error);
        setError("Failed to sign in via redirect. Please try again.");
      });
  }, [onNavigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onNavigate(View.HOME);
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError("Invalid email or password. Please try again.");
      } else if (err.code === 'auth/network-request-failed') {
        setError("Network error. Please check your internet connection.");
      } else if (err.code === 'auth/too-many-requests') {
        setError("Too many attempts. Please try again later.");
      } else if (err.code === 'auth/unauthorized-domain') {
        setError(`Domain '${window.location.hostname}' is not authorized in Firebase Console.`);
      } else {
        setError("Unable to sign in. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-black">
       <div className="absolute inset-0 bg-grid-pattern opacity-20"></div>
       <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyan-600/20 blur-[120px] rounded-full animate-float"></div>
       <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 blur-[120px] rounded-full animate-float" style={{animationDelay: '2s'}}></div>

       <div className="relative z-10 w-full max-w-md p-8 bg-gray-900/50 backdrop-blur-xl border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-fade-in group overflow-hidden">
          {/* Holographic Scanner Effect */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50 animate-scanline pointer-events-none"></div>

          <div className="text-center mb-8 relative">
             <div className="w-16 h-16 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-4 animate-glow relative z-10">
                <span className="text-3xl font-bold text-white">Z</span>
             </div>
             <h2 className="text-3xl font-bold text-white tracking-tight overflow-hidden whitespace-nowrap border-r-4 border-cyan-400 pr-1 animate-typing mx-auto w-fit">
               Welcome Back
             </h2>
             <p className="text-gray-400 mt-2">Access your ZamanX AI dashboard</p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-900/20 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-200 text-sm">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
             <div className="space-y-1">
               <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Email</label>
               <div className="relative group/input">
                 <Mail className="absolute left-4 top-3 text-gray-500 group-focus-within/input:text-cyan-400 transition-colors" size={18} />
                 <input 
                   type="email" 
                   required
                   className="w-full bg-black/40 border border-gray-700 rounded-xl py-3 pl-12 pr-4 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                   placeholder="Enter your email"
                   value={email}
                   onChange={e => setEmail(e.target.value)}
                 />
               </div>
             </div>
             
             <div className="space-y-1">
               <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Password</label>
               <div className="relative group/input">
                 <Lock className="absolute left-4 top-3 text-gray-500 group-focus-within/input:text-cyan-400 transition-colors" size={18} />
                 <input 
                   type="password" 
                   required
                   className="w-full bg-black/40 border border-gray-700 rounded-xl py-3 pl-12 pr-4 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                   placeholder="••••••••"
                   value={password}
                   onChange={e => setPassword(e.target.value)}
                 />
               </div>
             </div>

             <div className="text-right">
               <button 
                type="button" 
                className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                onClick={() => onNavigate(View.FORGOT_PASSWORD)}
               >
                 Forgot password?
               </button>
             </div>

             <Button 
               type="submit" 
               className={`w-full py-4 text-lg shadow-[0_0_20px_rgba(6,182,212,0.3)] ${isLoading ? 'btn-loading' : ''}`}
               disabled={isLoading}
             >
               {isLoading ? 'Sign In' : 'Sign In'}
             </Button>
          </form>

          <p className="mt-8 text-center text-gray-400 text-sm">
            Don't have an account?{' '}
            <button onClick={() => onNavigate(View.SIGNUP)} className="text-cyan-400 font-bold hover:underline">Sign Up</button>
          </p>
          
          <div className="mt-8 pt-4 border-t border-gray-800 text-center">
            <button 
              onClick={() => onNavigate(View.ADMIN_LOGIN)} 
              className="text-xs text-gray-600 hover:text-red-400 flex items-center justify-center gap-1 mx-auto transition-colors"
            >
              <Shield size={12} /> Admin Portal
            </button>
          </div>
       </div>

       <style>{`
         @keyframes scanline {
           0% { top: 0%; opacity: 0; }
           50% { opacity: 1; }
           100% { top: 100%; opacity: 0; }
         }
         .animate-scanline {
           animation: scanline 3s linear infinite;
         }
         @keyframes typing {
           from { width: 0 }
           to { width: 100% }
         }
         .animate-typing {
           animation: typing 2s steps(20, end);
         }
       `}</style>
    </div>
  );
};

export default Login;
