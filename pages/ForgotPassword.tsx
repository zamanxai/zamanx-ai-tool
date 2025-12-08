
import React, { useState } from 'react';
import { auth } from '../firebaseConfig';
import { sendPasswordResetEmail } from 'firebase/auth';
import Button from '../components/Button';
import { Input } from '../components/Input';
import { View } from '../types';
import { ArrowLeft, Mail, CheckCircle, AlertCircle } from 'lucide-react';

interface ForgotPasswordProps {
  onNavigate: (view: View) => void;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setStatus('idle');
    setMessage('');

    try {
      await sendPasswordResetEmail(auth, email);
      setStatus('success');
      setMessage(`A password reset link has been sent to ${email}. Please check your inbox (and spam folder).`);
    } catch (error: any) {
      setStatus('error');
      if (error.code === 'auth/user-not-found') {
        setMessage("No account found with this email address.");
      } else if (error.code === 'auth/invalid-email') {
        setMessage("Please enter a valid email address.");
      } else {
        setMessage("Failed to send reset email. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-black">
       {/* Animated Background */}
       <div className="absolute inset-0 bg-grid-pattern opacity-20"></div>
       <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full animate-float"></div>

       <div className="relative z-10 w-full max-w-md p-8 bg-gray-900/50 backdrop-blur-xl border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-fade-in">
          
          <button 
            onClick={() => onNavigate(View.LOGIN)}
            className="absolute top-6 left-6 text-gray-500 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="text-center mb-8 mt-4">
             <div className="w-16 h-16 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-4">
                <Mail size={32} className="text-white" />
             </div>
             <h2 className="text-2xl font-bold text-white tracking-tight">Reset Password</h2>
             <p className="text-gray-400 mt-2">Enter your email to receive recovery instructions.</p>
          </div>

          {status === 'success' && (
            <div className="mb-6 p-4 bg-green-900/20 border border-green-500/50 rounded-xl flex items-start gap-3 text-green-200 text-sm animate-fade-in">
              <CheckCircle size={20} className="shrink-0 mt-0.5" />
              <span>{message}</span>
            </div>
          )}

          {status === 'error' && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-xl flex items-start gap-3 text-red-200 text-sm animate-fade-in">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <span>{message}</span>
            </div>
          )}

          <form onSubmit={handleReset} className="space-y-6">
             <div className="space-y-1">
               <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Email Address</label>
               <div className="relative">
                 <Mail className="absolute left-4 top-3 text-gray-500" size={18} />
                 <input 
                   type="email" 
                   required
                   className="w-full bg-black/40 border border-gray-700 rounded-xl py-3 pl-12 pr-4 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                   placeholder="Enter your registered email"
                   value={email}
                   onChange={e => setEmail(e.target.value)}
                 />
               </div>
             </div>

             <Button 
               type="submit" 
               className={`w-full py-4 text-lg shadow-[0_0_20px_rgba(6,182,212,0.3)] ${isLoading ? 'btn-loading' : ''}`}
               disabled={isLoading || status === 'success'}
             >
               {isLoading ? 'Sending Link...' : 'Send Reset Link'}
             </Button>
          </form>

          <div className="mt-8 text-center">
             <button 
               onClick={() => onNavigate(View.LOGIN)} 
               className="text-sm text-gray-500 hover:text-white transition-colors"
             >
               Remember your password? <span className="text-cyan-400 font-bold">Sign In</span>
             </button>
          </div>
       </div>
    </div>
  );
};

export default ForgotPassword;
