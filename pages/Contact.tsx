
import React, { useState, useEffect } from 'react';
import Button from '../components/Button';
import { Input, TextArea } from '../components/Input';
import { Phone, Mail, Send, Globe, MessageCircle, Ticket } from 'lucide-react';
import { createSupportTicket } from '../services/adminService';
import { useAuth } from '../contexts/AuthContext';
import { useToolContext } from '../contexts/ToolContext';

const Contact: React.FC = () => {
  const { userProfile } = useAuth();
  const { contactDetails } = useToolContext();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
      if (userProfile) {
          setForm(prev => ({ ...prev, name: userProfile.username || '', email: userProfile.email }));
      }
  }, [userProfile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    
    // WhatsApp Send Logic
    const text = `*New Inquiry from ZamanX AI*\n\n*Name:* ${form.name}\n*Email:* ${form.email}\n*Subject:* ${form.subject}\n*Message:* ${form.message}`;
    const waMessage = encodeURIComponent(text);
    // Extract number from link or use default
    const phoneNumber = contactDetails.whatsappLink.split('wa.me/')[1]?.split('?')[0] || "923433498450";
    window.open(`https://wa.me/${phoneNumber}?text=${waMessage}`, '_blank');

    setTimeout(() => {
        setSubmitted(false);
        setForm({ name: '', email: '', subject: '', message: '' });
    }, 2000);
  };

  const handleLiveChatRequest = async () => {
      if (!userProfile) {
          alert("Please login to request live chat.");
          return;
      }
      if (!form.message) {
          alert("Please enter a message describing your issue first.");
          return;
      }
      await createSupportTicket(userProfile.uid, userProfile.email, form.subject || "Live Chat Request", form.message);
      alert("Support Ticket Created! An admin will review your request shortly.");
  };

  const contactCards = [
      {
          icon: <Phone size={28} />,
          title: "Phone Support",
          value: contactDetails.phone,
          desc: contactDetails.supportHours,
          color: "text-cyan-400",
          bg: "bg-cyan-500/10",
          border: "hover:border-cyan-500/50",
          shadow: "hover:shadow-cyan-500/20"
      },
      {
          icon: <MessageCircle size={28} />,
          title: "WhatsApp Community",
          value: "Join Channel",
          desc: "Get latest AI updates",
          link: contactDetails.whatsappLink,
          color: "text-green-400",
          bg: "bg-green-500/10",
          border: "hover:border-green-500/50",
          shadow: "hover:shadow-green-500/20"
      },
      {
          icon: <Mail size={28} />,
          title: "Email Support",
          value: contactDetails.email,
          desc: "Response within 24 hours",
          color: "text-purple-400",
          bg: "bg-purple-500/10",
          border: "hover:border-purple-500/50",
          shadow: "hover:shadow-purple-500/20"
      }
  ];

  return (
    <div className="max-w-6xl mx-auto animate-fade-in py-8 space-y-16">
      <div className="text-center relative">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-600/20 blur-[100px] rounded-full pointer-events-none animate-pulse-slow" />
         <h2 className="text-5xl lg:text-6xl font-black text-white mb-6 relative z-10 tracking-tight">Get in Touch</h2>
         <p className="text-xl text-gray-400 relative z-10 max-w-2xl mx-auto">We'd love to hear from you. Reach out for support, feedback, or AI collaboration opportunities.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {contactCards.map((card, idx) => (
              <div key={idx} className={`bg-slate-900/40 backdrop-blur-xl p-8 rounded-3xl border border-white/5 transition-all duration-300 ${card.border} hover:-translate-y-2 hover:shadow-2xl ${card.shadow} group relative overflow-hidden`}>
                  <div className={`absolute -right-10 -top-10 w-32 h-32 ${card.bg} rounded-full blur-2xl group-hover:blur-3xl transition-all`}></div>
                  <div className={`w-16 h-16 ${card.bg} rounded-2xl flex items-center justify-center ${card.color} mb-6 group-hover:scale-110 transition-transform duration-300 relative z-10 shadow-lg`}>
                      {card.icon}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{card.title}</h3>
                  <p className="text-sm text-gray-400 mb-4">{card.desc}</p>
                  {card.link ? (
                      <a href={card.link} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-2 font-bold ${card.color} hover:brightness-125 transition-all`}>
                          {card.value} <Globe size={14} />
                      </a>
                  ) : (
                      <p className="text-gray-200 font-bold tracking-wide select-all">{card.value}</p>
                  )}
              </div>
          ))}
      </div>

      <div className="bg-slate-900/60 backdrop-blur-lg p-8 lg:p-12 rounded-[2rem] border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 relative z-10">
            <div className="space-y-8">
                <div>
                    <h3 className="text-3xl font-bold text-white mb-4">Send us a Message</h3>
                    <p className="text-gray-400 leading-relaxed">
                        Whether you have a question about our API features, pricing, or just want to say hello, our team is ready to answer all your questions.
                    </p>
                </div>
                <div className="p-6 bg-black/30 rounded-2xl border border-white/5">
                    <h4 className="font-bold text-white mb-2">Address</h4>
                    <p className="text-gray-400">{contactDetails.address}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 bg-black/20 p-6 rounded-2xl border border-white/5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Input label="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="bg-black/40 border-slate-700" />
                    <Input label="Email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required className="bg-black/40 border-slate-700" />
                </div>
                <Input label="Subject" value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} required className="bg-black/40 border-slate-700" />
                <TextArea label="Message" rows={5} value={form.message} onChange={e => setForm({...form, message: e.target.value})} required className="bg-black/40 border-slate-700" />
                
                <div className="grid grid-cols-2 gap-4">
                    <Button type="submit" disabled={submitted} icon={<Send size={20} />}>
                        {submitted ? 'Opening WhatsApp...' : 'WhatsApp Support'}
                    </Button>
                    <Button type="button" variant="secondary" onClick={handleLiveChatRequest} icon={<Ticket size={20} />}>
                        Request Live Chat
                    </Button>
                </div>
            </form>
        </div>
      </div>
    </div>
  );
};

export default Contact;
