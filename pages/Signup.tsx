
import React, { useState } from 'react';
import { auth, db } from '../firebaseConfig';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import Button from '../components/Button';
import { View } from '../types';
import { Lock, Mail, AlertCircle, User as UserIcon, Phone, Globe } from 'lucide-react';

interface SignupProps {
  onNavigate: (view: View) => void;
}

const Signup: React.FC<SignupProps> = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('Pakistan');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const countries = [
    'Pakistan', 'India', 'United States', 'United Kingdom', 'Canada', 
    'Australia', 'Germany', 'France', 'China', 'Japan', 
    'Saudi Arabia', 'UAE', 'Turkey', 'Other'
  ];

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPass) {
        setError("Passwords do not match.");
        return;
    }
    
    setError('');
    setIsLoading(true);
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Auto-assign Super Admin role to specific email
      const initialRole = user.email === 'zamanxai@gmail.com' ? 'superadmin' : 'user';

      // Create User Profile in Firestore with additional details
      await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          email: user.email,
          username: username,
          phoneNumber: phone,
          country: country,
          role: initialRole, 
          isBanned: false,
          createdAt: Date.now(),
          lastLogin: Date.now(),
          photoURL: user.photoURL || ''
      });

      onNavigate(View.HOME);
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError("Email already registered. Please Login instead.");
      } else if (err.code === 'auth/weak-password') {
        setError("Password should be at least 6 characters.");
      } else if (err.code === 'auth/network-request-failed') {
        setError("Network error. Please check your internet connection.");
      } else {
        setError("Registration failed: " + err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-black py-10">
       <div className="absolute inset-0 bg-grid-pattern opacity-20"></div>
       <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 blur-[120px] rounded-full animate-float"></div>

       <div className="relative z-10 w-full max-w-md p-8 bg-gray-900/50 backdrop-blur-xl border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-fade-in my-8">
          <div className="text-center mb-8">
             <h2 className="text-3xl font-bold text-white tracking-tight">Create Account</h2>
             <p className="text-gray-400 mt-2">Join the future of AI with ZamanX</p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-900/20 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-200 text-sm">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
             <div className="space-y-1">
               <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Username</label>
               <div className="relative">
                 <UserIcon className="absolute left-4 top-3 text-gray-500" size={18} />
                 <input 
                   type="text" 
                   required
                   className="w-full bg-black/40 border border-gray-700 rounded-xl py-3 pl-12 pr-4 text-white focus:border-cyan-500 outline-none transition-all"
                   placeholder="Your Name"
                   value={username}
                   onChange={e => setUsername(e.target.value)}
                 />
               </div>
             </div>

             <div className="space-y-1">
               <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Email</label>
               <div className="relative">
                 <Mail className="absolute left-4 top-3 text-gray-500" size={18} />
                 <input 
                   type="email" 
                   required
                   className="w-full bg-black/40 border border-gray-700 rounded-xl py-3 pl-12 pr-4 text-white focus:border-cyan-500 outline-none transition-all"
                   placeholder="Enter your email"
                   value={email}
                   onChange={e => setEmail(e.target.value)}
                 />
               </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                   <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Country</label>
                   <div className="relative">
                     <Globe className="absolute left-4 top-3 text-gray-500" size={18} />
                     <select 
                       value={country}
                       onChange={e => setCountry(e.target.value)}
                       className="w-full bg-black/40 border border-gray-700 rounded-xl py-3 pl-12 pr-4 text-white focus:border-cyan-500 outline-none transition-all appearance-none"
                     >
                        {countries.map(c => <option key={c} value={c}>{c}</option>)}
                     </select>
                   </div>
                </div>
                <div className="space-y-1">
                   <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Phone</label>
                   <div className="relative">
                     <Phone className="absolute left-4 top-3 text-gray-500" size={18} />
                     <input 
                       type="tel" 
                       required
                       className="w-full bg-black/40 border border-gray-700 rounded-xl py-3 pl-12 pr-4 text-white focus:border-cyan-500 outline-none transition-all"
                       placeholder="+92 300..."
                       value={phone}
                       onChange={e => setPhone(e.target.value)}
                     />
                   </div>
                </div>
             </div>
             
             <div className="space-y-1">
               <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Password</label>
               <div className="relative">
                 <Lock className="absolute left-4 top-3 text-gray-500" size={18} />
                 <input 
                   type="password" 
                   required
                   className="w-full bg-black/40 border border-gray-700 rounded-xl py-3 pl-12 pr-4 text-white focus:border-cyan-500 outline-none transition-all"
                   placeholder="Create password"
                   value={password}
                   onChange={e => setPassword(e.target.value)}
                 />
               </div>
             </div>

             <div className="space-y-1">
               <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Confirm Password</label>
               <div className="relative">
                 <Lock className="absolute left-4 top-3 text-gray-500" size={18} />
                 <input 
                   type="password" 
                   required
                   className="w-full bg-black/40 border border-gray-700 rounded-xl py-3 pl-12 pr-4 text-white focus:border-cyan-500 outline-none transition-all"
                   placeholder="Confirm password"
                   value={confirmPass}
                   onChange={e => setConfirmPass(e.target.value)}
                 />
               </div>
             </div>

             <Button 
               type="submit" 
               className={`w-full py-4 text-lg shadow-[0_0_20px_rgba(6,182,212,0.3)] mt-4 ${isLoading ? 'btn-loading' : ''}`}
               disabled={isLoading}
             >
               {isLoading ? 'Creating Account...' : 'Sign Up'}
             </Button>
          </form>

          <p className="mt-8 text-center text-gray-400 text-sm">
            Already have an account?{' '}
            <button onClick={() => onNavigate(View.LOGIN)} className="text-cyan-400 font-bold hover:underline">Sign In</button>
          </p>
       </div>
    </div>
  );
};

export default Signup;