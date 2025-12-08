
export enum View {
  HOME = 'HOME',
  CHAT = 'CHAT',
  IMAGE = 'IMAGE',
  AVATAR = 'AVATAR',
  TEXT = 'TEXT',
  VOICE = 'VOICE',
  CODE = 'CODE',
  ANALYZER = 'ANALYZER',
  VISION = 'VISION',
  MATH = 'MATH',
  DREAM = 'DREAM',
  STUDY = 'STUDY',
  CONTACT = 'CONTACT',
  SOCIAL = 'SOCIAL',
  RESUME = 'RESUME',
  LEGAL = 'LEGAL',
  FITNESS = 'FITNESS',
  // New SaaS Tools
  WHATSAPP = 'WHATSAPP',
  PLANNER = 'PLANNER',
  VIDEO = 'VIDEO',
  AUTOMATION = 'AUTOMATION',
  AD_CREATOR = 'AD_CREATOR', // New Ad Tool
  // User & Admin Views
  USER_PROFILE = 'USER_PROFILE',
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD',
  ADMIN_LOGIN = 'ADMIN_LOGIN',
  LOGIN = 'LOGIN',
  SIGNUP = 'SIGNUP',
  FORGOT_PASSWORD = 'FORGOT_PASSWORD'
}

export type UserRole = 'superadmin' | 'admin' | 'user';

export type AIProvider = 'GOOGLE' | 'OPENAI' | 'DEEPSEEK' | 'CLAUDE';

export type PlanType = 'Free' | 'Basic' | 'Pro' | 'Ultra';
export type Currency = 'USD' | 'PKR' | 'INR' | 'AED';

export interface ToolConfig {
  id: string; // matches View enum
  name: string;
  description: string;
  category: string;
  status: 'active' | 'inactive'; // 'inactive' shows "Temporarily unavailable"
  visibility: 'visible' | 'hidden';
  access: PlanType;
  basePriceUSD: number; // Base price for unlocking if not on plan
  demoAvailable: boolean; // New: Supports demo mode
  iconName?: string; 
}

export interface UserProfile {
  uid: string;
  email: string;
  username?: string;
  phoneNumber?: string;
  country?: string;
  currency: Currency;
  role: UserRole;
  plan: PlanType;
  credits: number;
  purchasedTools: string[]; // List of Tool IDs purchased individually
  isBanned: boolean;
  banReason?: string;
  createdAt: number;
  lastLogin: number;
  photoURL?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  type: 'global' | 'plan' | 'user';
  target?: string; // Plan name or User ID
  seenBy: string[];
}

export interface SupportTicket {
  id: string;
  userId: string;
  userEmail: string;
  subject: string;
  status: 'pending' | 'active' | 'closed';
  messages: {
    sender: 'user' | 'admin';
    text: string;
    timestamp: number;
  }[];
  createdAt: number;
  lastUpdate: number;
}

export interface ConversionRates {
  USD: number;
  PKR: number;
  INR: number;
  AED: number;
}

export interface AuditLog {
  id: string;
  action: string;
  adminEmail: string;
  targetEmail: string;
  timestamp: number;
  details: string;
}

export interface ActivityLog {
  id?: string;
  userId: string;
  userEmail: string;
  tool: string;
  prompt: string;
  timestamp: number;
  metadata?: any;
}

export interface ContactDetails {
  phone: string;
  email: string;
  whatsappLink: string;
  address: string;
  supportHours: string;
  paymentInfo?: {
      jazzcash: string;
      easypaisa: string;
      bankName: string;
      bankAccount: string;
      accountTitle: string;
  }
}

export interface AccessCode {
    id: string;
    code: string;
    toolId: string;
    status: 'unused' | 'used';
    createdBy: string;
    createdAt: number;
    usedBy?: string;
    usedAt?: number;
}

export interface StoredKey {
  id: string;
  key: string; // The actual API key
  provider: AIProvider;
  addedBy: string;
  createdAt: number;
  // Rotation Fields
  alias: string; // e.g., "Primary", "Backup 1"
  status: 'active' | 'exhausted' | 'suspended';
  usageLimit: number; // Max requests per period
  usageCount: number; // Current requests
  lastUsed: number;
}

export interface KeyRotationLog {
    id: string;
    timestamp: number;
    provider: AIProvider;
    previousKeyAlias: string;
    newKeyAlias: string;
    reason: string; // e.g. "Quota Exceeded", "Manual Switch"
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isError?: boolean;
}

export interface HistoryItem {
  id: string;
  tool: string; 
  type: 'text' | 'image' | 'code' | 'chat';
  content: any; 
  prompt: string; 
  timestamp: number;
  metadata?: any; 
}
