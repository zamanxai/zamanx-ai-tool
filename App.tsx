
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToolProvider } from './contexts/ToolContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import AdminLogin from './pages/AdminLogin';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import Chatbot from './pages/Chatbot';
import ImageGenerator from './pages/ImageGenerator';
import TextTools from './pages/TextTools';
import VoiceTools from './pages/VoiceTools';
import CodeGenerator from './pages/CodeGenerator';
import AvatarGenerator from './pages/AvatarGenerator';
import DataAnalyzer from './pages/DataAnalyzer';
import VisionTool from './pages/VisionTool';
import MathSolver from './pages/MathSolver';
import DreamInterpreter from './pages/DreamInterpreter';
import StudyHelper from './pages/StudyHelper';
import SocialManager from './pages/SocialManager';
import ResumeBuilder from './pages/ResumeBuilder';
import LegalAdvisor from './pages/LegalAdvisor';
import FitnessCoach from './pages/FitnessCoach';
import Contact from './pages/Contact';
import AdminDashboard from './pages/AdminDashboard';
import WhatsAppTools from './pages/WhatsAppTools';
import ContentPlanner from './pages/ContentPlanner';
import VideoGenerator from './pages/VideoGenerator';
import AutomationTools from './pages/AutomationTools';
import AdCreator from './pages/AdCreator';
import UserDashboard from './pages/UserDashboard';
import { View } from './types';
import { fetchAndSetActiveKey } from './services/geminiService';

const ProtectedRoute: React.FC<{ children: React.ReactNode; view: View; onNavigate: (v: View) => void }> = ({ children, view, onNavigate }) => {
  const { currentUser, loading, isAdmin } = useAuth();

  useEffect(() => {
    if (!loading && !currentUser) {
      onNavigate(View.LOGIN);
    }
  }, [currentUser, loading, onNavigate]);

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-cyan-500">Loading ZamanX AI...</div>;

  if (view === View.ADMIN_DASHBOARD && !isAdmin) {
    return <div className="text-center text-red-500 mt-20 text-2xl">Access Denied: Admins Only</div>;
  }

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.LOGIN);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser && (currentView === View.LOGIN || currentView === View.ADMIN_LOGIN || currentView === View.FORGOT_PASSWORD)) {
        setCurrentView(View.HOME);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchAndSetActiveKey();
  }, []);

  const renderView = () => {
    switch (currentView) {
      case View.LOGIN: return <Login onNavigate={setCurrentView} />;
      case View.ADMIN_LOGIN: return <AdminLogin onNavigate={setCurrentView} />;
      case View.SIGNUP: return <Signup onNavigate={setCurrentView} />;
      case View.FORGOT_PASSWORD: return <ForgotPassword onNavigate={setCurrentView} />;
      case View.HOME: return <Home onChangeView={setCurrentView} />;
      case View.CHAT: return <Chatbot />;
      case View.IMAGE: return <ImageGenerator />;
      case View.VISION: return <VisionTool />;
      case View.AVATAR: return <AvatarGenerator />;
      case View.TEXT: return <TextTools />;
      case View.VOICE: return <VoiceTools />;
      case View.MATH: return <MathSolver />;
      case View.DREAM: return <DreamInterpreter />;
      case View.STUDY: return <StudyHelper />;
      case View.CODE: return <CodeGenerator />;
      case View.ANALYZER: return <DataAnalyzer />;
      case View.SOCIAL: return <SocialManager />;
      case View.RESUME: return <ResumeBuilder />;
      case View.LEGAL: return <LegalAdvisor />;
      case View.FITNESS: return <FitnessCoach />;
      case View.CONTACT: return <Contact />;
      case View.WHATSAPP: return <WhatsAppTools />;
      case View.PLANNER: return <ContentPlanner />;
      case View.VIDEO: return <VideoGenerator />;
      case View.AUTOMATION: return <AutomationTools />;
      case View.AD_CREATOR: return <AdCreator />;
      case View.USER_PROFILE: return <UserDashboard />;
      case View.ADMIN_DASHBOARD: return <AdminDashboard />;
      default: return <Home onChangeView={setCurrentView} />;
    }
  };

  return (
    <Layout currentView={currentView} onChangeView={setCurrentView}>
      {currentView === View.LOGIN || currentView === View.SIGNUP || currentView === View.ADMIN_LOGIN || currentView === View.FORGOT_PASSWORD ? (
         renderView()
      ) : (
         <ProtectedRoute view={currentView} onNavigate={setCurrentView}>
            {renderView()}
         </ProtectedRoute>
      )}
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ToolProvider>
        <AppContent />
      </ToolProvider>
    </AuthProvider>
  );
};

export default App;
