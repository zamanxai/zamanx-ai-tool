
import React, { useState } from 'react';
import { X, Lock, Check, Smartphone, Send, Key } from 'lucide-react';
import Button from './Button';
import { Input } from './Input';
import { useAuth } from '../contexts/AuthContext';
import { useToolContext } from '../contexts/ToolContext';
import { redeemAccessCode } from '../services/adminService';

interface PaymentModalProps {
  toolId: string;
  toolName: string;
  price: number;
  currency: string;
  onClose: () => void;
  onSuccess: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ toolId, toolName, price, currency, onClose, onSuccess }) => {
  const { userProfile } = useAuth();
  const { contactDetails } = useToolContext();
  const [step, setStep] = useState<'info' | 'verify'>('info');
  const [accessCode, setAccessCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');

  // Fallback payment info if not in context yet
  const paymentInfo = contactDetails.paymentInfo || {
      jazzcash: "0343 3498450 (ZamanX)",
      easypaisa: "0343 3498450 (ZamanX)",
      bankName: "Meezan Bank",
      bankAccount: "1234-5678-9012-3456",
      accountTitle: "ZamanX AI Tech"
  };

  const handleSendProof = () => {
      const text = `*Payment Proof Submission*\n\n*User:* ${userProfile?.email}\n*Tool:* ${toolName}\n*Price:* ${currency} ${price}\n\n[Attach Screenshot Here]`;
      const waLink = `https://wa.me/${contactDetails.whatsappLink.split('wa.me/')[1]?.split('?')[0] || '923433498450'}?text=${encodeURIComponent(text)}`;
      window.open(waLink, '_blank');
      setStep('verify');
  };

  const handleRedeem = async () => {
      if (!userProfile) return;
      if (!accessCode.trim()) {
          setError("Please enter the code.");
          return;
      }

      setIsVerifying(true);
      setError('');

      try {
          const result = await redeemAccessCode(userProfile.uid, userProfile.email, accessCode);
          if (result.success) {
              onSuccess();
              onClose();
              // Force reload or trigger context update is handled by listener, but an alert helps
              alert(`Success! ${toolName} is now unlocked.`);
          } else {
              setError(result.message);
          }
      } catch (e) {
          setError("Verification failed. Please try again.");
      } finally {
          setIsVerifying(false);
      }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 flex items-center justify-between">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Lock size={20} /> Unlock {toolName}
                </h3>
                <button onClick={onClose} className="text-white/80 hover:text-white"><X size={20}/></button>
            </div>
            
            <div className="p-6 space-y-6">
                
                {step === 'info' && (
                    <>
                        <div className="text-center bg-black/30 p-4 rounded-xl border border-gray-800">
                             <p className="text-gray-400 text-sm mb-1">Lifetime Access Price</p>
                             <h2 className="text-3xl font-black text-white">{currency} {price}</h2>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider border-b border-gray-800 pb-2">Payment Methods</h4>
                            
                            <div className="flex items-center gap-4 bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                                <div className="p-2 bg-red-600 rounded text-white font-bold text-xs">JC</div>
                                <div>
                                    <p className="text-white font-bold text-sm">JazzCash</p>
                                    <p className="text-xs text-gray-400 font-mono select-all">{paymentInfo.jazzcash}</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4 bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                                <div className="p-2 bg-green-600 rounded text-white font-bold text-xs">EP</div>
                                <div>
                                    <p className="text-white font-bold text-sm">EasyPaisa</p>
                                    <p className="text-xs text-gray-400 font-mono select-all">{paymentInfo.easypaisa}</p>
                                </div>
                            </div>
                        </div>

                        <div className="text-xs text-center text-gray-500 bg-blue-900/10 p-3 rounded-lg border border-blue-500/20">
                            <strong>Step 1:</strong> Send payment. <strong>Step 2:</strong> Send screenshot on WhatsApp. <strong>Step 3:</strong> Get Code & Unlock.
                        </div>

                        <div className="flex flex-col gap-3">
                            <Button 
                                onClick={handleSendProof} 
                                className="w-full !bg-green-600 hover:!bg-green-500"
                                icon={<Send size={16}/>}
                            >
                                Send Proof on WhatsApp
                            </Button>
                            <Button 
                                onClick={() => setStep('verify')} 
                                variant="secondary"
                                className="w-full"
                                icon={<Key size={16}/>}
                            >
                                I already have a code
                            </Button>
                        </div>
                    </>
                )}

                {step === 'verify' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                                <Key size={32} className="text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-white">Enter Access Code</h3>
                            <p className="text-sm text-gray-400">Enter the code you received on WhatsApp to unlock this tool.</p>
                        </div>

                        <Input 
                            value={accessCode}
                            onChange={(e) => setAccessCode(e.target.value)}
                            placeholder="e.g. ZAMAN-VIP-123"
                            className="text-center font-mono text-lg uppercase tracking-widest border-green-500/50 focus:border-green-500"
                        />

                        {error && (
                            <div className="p-3 bg-red-900/20 text-red-300 text-xs rounded-lg text-center border border-red-500/30">
                                {error}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <Button onClick={() => setStep('info')} variant="secondary" className="flex-1">Back</Button>
                            <Button 
                                onClick={handleRedeem} 
                                disabled={isVerifying || !accessCode} 
                                className="flex-1 !bg-green-600 hover:!bg-green-500"
                            >
                                {isVerifying ? 'Verifying...' : 'Unlock Now'}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default PaymentModal;
