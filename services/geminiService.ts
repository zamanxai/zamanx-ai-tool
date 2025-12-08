import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import { db } from '../firebaseConfig';
import { collection, query, orderBy, getDocs, where, doc, updateDoc, increment, getDoc, addDoc } from 'firebase/firestore';
import { AIProvider, StoredKey } from "../types";
import { logKeyRotation } from "./adminService";

// --- KEY ROTATION ENGINE ---

interface KeyCache {
    keys: StoredKey[];
    lastFetch: number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
let keyCache: Record<string, KeyCache> = {};

// Helper to check environment keys
const getSystemEnvKey = (): string => {
  try {
     if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
         return process.env.API_KEY;
     }
  } catch (e) {}
  return '';
};
const systemDefaultKey = getSystemEnvKey();

/**
 * Fetches active keys for a specific provider from Firestore.
 * Caches results to minimize reads.
 */
const fetchActiveKeys = async (provider: AIProvider): Promise<StoredKey[]> => {
    const now = Date.now();
    
    // Check Cache
    if (keyCache[provider] && (now - keyCache[provider].lastFetch < CACHE_DURATION)) {
        return keyCache[provider].keys;
    }

    // Check Local Storage Override (For dev testing)
    if (typeof window !== 'undefined') {
        const manualKey = localStorage.getItem('zamanx_api_key');
        const manualProvider = localStorage.getItem('zamanx_provider') as AIProvider;
        if (manualKey && manualProvider === provider) {
             const mockKey: StoredKey = {
                 id: 'local-dev', key: manualKey, provider, alias: 'Dev Key', 
                 status: 'active', usageCount: 0, usageLimit: 99999, 
                 lastUsed: now, addedBy: 'local', createdAt: now
             };
             return [mockKey];
        }
    }

    try {
        const q = query(
            collection(db, "api_keys"), 
            where("provider", "==", provider),
            where("status", "==", "active"),
            orderBy("usageCount", "asc") // Load balancing strategy: Least used first
        );
        
        const snapshot = await getDocs(q);
        const keys = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StoredKey));
        
        // Filter out keys that hit their hard limit locally before db update propagates
        const validKeys = keys.filter(k => k.usageCount < k.usageLimit);

        keyCache[provider] = { keys: validKeys, lastFetch: now };
        return validKeys;
    } catch (error) {
        console.warn(`Failed to fetch ${provider} keys:`, error);
        // Fallback to system env key if available
        if (systemDefaultKey && provider === 'GOOGLE') {
             return [{
                 id: 'env-fallback', key: systemDefaultKey, provider: 'GOOGLE', alias: 'System Env', 
                 status: 'active', usageCount: 0, usageLimit: 999999, 
                 lastUsed: now, addedBy: 'system', createdAt: now
             }];
        }
        return [];
    }
};

/**
 * Marks a key as exhausted in DB and logs the rotation.
 */
const rotateKey = async (exhaustedKey: StoredKey, reason: string) => {
    try {
        if (exhaustedKey.id === 'local-dev' || exhaustedKey.id === 'env-fallback') return;

        // Mark as exhausted
        await updateDoc(doc(db, "api_keys", exhaustedKey.id), { status: 'exhausted' });
        
        // Invalidate cache immediately
        if (keyCache[exhaustedKey.provider]) {
            keyCache[exhaustedKey.provider].lastFetch = 0; 
        }

        // Fetch next available key for logging
        const nextKeys = await fetchActiveKeys(exhaustedKey.provider);
        const nextKeyAlias = nextKeys.length > 0 ? nextKeys[0].alias : "None Available";

        // Log Rotation
        await logKeyRotation(exhaustedKey.provider, exhaustedKey.alias, nextKeyAlias, reason);

        // Notify Admin if no keys left (Simplified as a console warn, ideally a cloud function trigger)
        if (nextKeys.length === 0) {
            console.error("CRITICAL: All API keys exhausted for " + exhaustedKey.provider);
        }
    } catch (e) {
        console.error("Rotation logic failed:", e);
    }
};

/**
 * Increment usage count for a successful request
 */
const incrementUsage = async (key: StoredKey) => {
    if (key.id === 'local-dev' || key.id === 'env-fallback') return;
    try {
        // Optimistic local update
        key.usageCount++;
        // Async DB update (fire and forget to not block UI)
        updateDoc(doc(db, "api_keys", key.id), { 
            usageCount: increment(1),
            lastUsed: Date.now()
        });
    } catch (e) {
        console.warn("Failed to update usage stats");
    }
};

/**
 * Detect if error is a Quota/Rate Limit error
 */
const isQuotaError = (error: any): boolean => {
    const msg = (error?.toString() + (error?.message || "")).toLowerCase();
    return msg.includes('quota') || 
           msg.includes('billing') || 
           msg.includes('429') || 
           msg.includes('insufficient') ||
           msg.includes('rate limit') ||
           msg.includes('exceeded your current quota') ||
           msg.includes('check your plan') ||
           msg.includes('403');
};

/**
 * Higher Order Function to execute API calls with automatic rotation
 */
const executeWithRotation = async <T>(
    provider: AIProvider, 
    operation: (apiKey: string) => Promise<T>
): Promise<T> => {
    let attempts = 0;
    const maxAttempts = 5; // Prevent infinite loops

    while (attempts < maxAttempts) {
        const keys = await fetchActiveKeys(provider);
        
        if (keys.length === 0) {
            throw new Error("Service Temporarily Unavailable: High traffic. Please try again later.");
        }

        const currentKey = keys[0]; // Always take the first available (least used)

        try {
            const result = await operation(currentKey.key);
            // If successful, track usage
            await incrementUsage(currentKey);
            return result;
        } catch (error: any) {
            console.error(`API Error with key ${currentKey.alias}:`, error);

            if (isQuotaError(error)) {
                // Critical: Rotate Key
                console.warn(`Quota hit for ${currentKey.alias}. Rotating...`);
                await rotateKey(currentKey, "Quota Exceeded / Rate Limit");
                attempts++;
                // Loop continues, fetching new key list
            } else {
                // Non-rotation error (e.g. Bad Request, Safety filter), rethrow
                throw error;
            }
        }
    }
    throw new Error("Service Busy: Unable to process request after multiple attempts.");
};


// --- WRAPPED GENERATION FUNCTIONS ---

export const setDynamicApiKey = (key: string, provider: AIProvider = 'GOOGLE') => {
  if (typeof window !== 'undefined') {
      localStorage.setItem('zamanx_api_key', key);
      localStorage.setItem('zamanx_provider', provider);
      // Invalidate cache to force re-fetch including local key
      keyCache[provider] = { keys: [], lastFetch: 0 };
  }
};

export const removeDynamicApiKey = () => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('zamanx_api_key');
        localStorage.removeItem('zamanx_provider');
        keyCache = {};
    }
};

// --- CORE EXPORTS using Rotation ---

export const generateText = async (prompt: string, systemInstruction?: string): Promise<string> => {
    return executeWithRotation('GOOGLE', async (apiKey) => {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { systemInstruction },
        });
        return response.text || "No response generated.";
    });
};

export const enhancePrompt = async (input: string): Promise<string> => {
    return generateText(
        `Expand and improve this prompt to be highly detailed and professional. Input: "${input}"`, 
        "You are an expert prompt engineer. Output ONLY the improved prompt."
    );
};

// Streaming needs a slightly different approach because it yields
export const generateChatStream = async function* (history: any[], newMessage: string, systemInstruction?: string) {
    // We can't easily rotate *during* a stream, but we can rotate before starting
    const keys = await fetchActiveKeys('GOOGLE');
    if(keys.length === 0) throw new Error("Service Unavailable");
    
    // Simplification: Try the best key.
    const currentKey = keys[0]; 

    try {
        const ai = new GoogleGenAI({ apiKey: currentKey.key });
        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            history: history,
            config: { systemInstruction }
        });
        const result = await chat.sendMessageStream({ message: newMessage });
        
        // If we get here, connection worked.
        incrementUsage(currentKey); 

        for await (const chunk of result) {
            const c = chunk as GenerateContentResponse;
            if (c.text) yield c.text;
        }
    } catch (error: any) {
        if (isQuotaError(error)) {
            await rotateKey(currentKey, "Quota Exceeded during Stream Init");
            throw new Error("Capacity limit reached. Please retry.");
        }
        throw error;
    }
};

export const generateImage = async (prompt: string, options: any = {}): Promise<string[]> => {
     return executeWithRotation('GOOGLE', async (apiKey) => {
         const ai = new GoogleGenAI({ apiKey });
         const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: prompt }] },
            config: { imageConfig: { aspectRatio: options.aspectRatio || "1:1" } }
         });
         const parts = response.candidates?.[0]?.content?.parts;
         const images: string[] = [];
         if (parts) {
           for (const part of parts) {
               if (part.inlineData?.data) images.push(`data:image/png;base64,${part.inlineData.data}`);
           }
         }
         return images;
     });
};

// --- NEW SAAS TOOLS ---

export const generateWhatsAppCampaign = async (product: string, audience: string, goal: string, isDemo: boolean): Promise<string> => {
    const quantity = isDemo ? "1 sample ad caption" : "10 ad captions, 3 short scripts, and 1 complete sales message";
    const prompt = `Create a WhatsApp Marketing Campaign for:
    Product: ${product}
    Target Audience: ${audience}
    Goal: ${goal}
    
    Output Requirements: Generate ${quantity}. Format cleanly with emojis and bold text.`;
    
    return generateText(prompt, "You are an elite WhatsApp Marketing Specialist.");
};

export const generateWhatsAppBotConfig = async (business: string, goal: string, tone: string): Promise<string> => {
    const prompt = `Design a comprehensive AI Chatbot Persona and Logic Flow for WhatsApp.
    Business: ${business}
    Goal: ${goal}
    Tone: ${tone}

    Output Requirements:
    1. System Instruction (for LLMs).
    2. Key Triggers & Responses (FAQ logic).
    3. Escalation Rules (When to hand over to human).
    4. Sample Conversation Flow (User vs Bot).`;
    return generateText(prompt, "You are a Conversational AI Architect specializing in WhatsApp Business.");
};

export const generateWhatsAppPythonScript = async (task: string): Promise<string> => {
    const prompt = `Write a production-ready Python script for WhatsApp Automation.
    Task: ${task}
    
    Preferred Libraries: 'pywhatkit' or 'selenium' or 'twilio' (choose best for the task).
    
    Include:
    - Required pip installs.
    - Robust Error Handling.
    - Rate limiting/delays (crucial for WhatsApp).
    - Detailed comments explaining how to run it.`;
    return analyzeCode(prompt);
};

export const analyzeWhatsAppChat = async (chatData: string): Promise<string> => {
    // Truncate to avoid token limits if too massive, though 2.5 Flash handles ~1M tokens.
    const safeData = chatData.length > 50000 ? chatData.substring(0, 50000) + "\n...[Truncated]" : chatData;
    
    const prompt = `Analyze this WhatsApp Chat Export and provide a Forensic Insight Report.
    
    Input Data:
    ${safeData}
    
    Output Requirements:
    1. **Communication Dynamics**: Who talks more? Who initiates? Avg response time estimate.
    2. **Sentiment Analysis**: Overall vibe (Professional, Flirty, Angry, Casual).
    3. **Key Topics**: What are the main subjects discussed?
    4. **Activity Heatmap**: Most active times of day/week (estimated).
    5. **Psychological Profile**: Brief personality assessment of participants based on text style.
    
    Format: Professional Markdown Report.`;
    
    return generateText(prompt, "You are a Digital Forensics & Communication Analyst.");
};

export const generateContentCalendar = async (keyword: string, niche: string, isDemo: boolean): Promise<string> => {
    const duration = isDemo ? "3 Days" : "30 Days";
    const prompt = `Create a ${duration} Viral Content Calendar for the niche: ${niche}, focusing on keyword: ${keyword}.
    For each day, provide:
    1. Content Idea/Hook
    2. Format (Reel/Post/Story)
    3. Caption & Hashtags
    
    Format as a structured list.`;
    
    return generateText(prompt, "You are a Viral Social Media Strategist.");
};

export const generateStoreStructure = async (name: string, products: string, isDemo: boolean): Promise<string> => {
    const prompt = `Generate a SINGLE HTML FILE containing a complete, modern, mobile-responsive WhatsApp Store for a brand named "${name}".
    
    Products to include: ${products}
    
    Features Required:
    1. Header with Store Name.
    2. Grid of product cards. Each card must have:
       - A placeholder image (use https://placehold.co/300x300?text=Product).
       - Product Name.
       - Price.
       - A "Buy on WhatsApp" button that links to https://wa.me/?text=I+want+to+buy+Product_Name.
    3. Use Tailwind CSS via CDN (<script src="https://cdn.tailwindcss.com"></script>) for styling.
    4. Modern, clean, dark-mode inspired design (Black/Green theme).
    
    ${isDemo ? 'NOTE: This is a DEMO version. Only include 3 sample products and add a "Premium Version Required" banner at the bottom.' : 'Include full product listing logic and professional footer.'}
    
    IMPORTANT: Output ONLY the raw HTML code. Do not include markdown code fences like \`\`\`html. Just the code.`;
    
    const result = await generateText(prompt, "You are a Frontend Developer Expert.");
    return result.replace(/```html/g, '').replace(/```/g, ''); 
};

export const analyzeImage = async (base64: string, prompt: string, mime: string) => {
    return executeWithRotation('GOOGLE', async (apiKey) => {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ inlineData: { mimeType: mime, data: base64 } }, { text: prompt }] }
        });
        return response.text || "";
    });
};

export const generateSpeech = async (text: string, voiceName: string = 'Kore') => {
    return executeWithRotation('GOOGLE', async (apiKey) => {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
              model: "gemini-2.5-flash-preview-tts",
              contents: [{ parts: [{ text }] }],
              config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } } },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        
        const binaryString = atob(base64Audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) { bytes[i] = binaryString.charCodeAt(i); }
        
        const buffer = audioContext.createBuffer(1, 1, 24000); 
        return { buffer, rawData: bytes }; 
    });
};

export const transcribeAudio = async (base64: string, mime: string) => {
    return executeWithRotation('GOOGLE', async (apiKey) => {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ inlineData: { mimeType: mime, data: base64 } }, { text: "Transcribe" }] }
        });
        return response.text || "";
    });
};

export const solveMath = (p: string) => generateText(p, "Math Expert");
export const interpretDream = (d: string) => generateText(d, "Dream Interpreter");
export const analyzeData = (d: string, q: string) => generateText(`Data: ${d}\nQuery: ${q}`, "Data Analyst");
export const analyzeCode = (p: string) => generateText(p, "Coding Expert");
export const generateLegalAdvice = (q: string) => generateText(q, "Legal Advisor");
export const generateFitnessPlan = (q: string) => generateText(q, "Fitness Coach");
export const generateStudyGuide = (q: string, f?: any) => generateText(q, "Study Helper");

export const generateVideo = async (prompt: string) => {
    // Veo requires process.env.API_KEY directly as it is selected by the user via AI Studio
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Start Video Generation
    let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        config: { numberOfVideos: 1, resolution: '1080p', aspectRatio: '16:9' }
    });
    
    // Poll for completion
    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000)); // Poll every 10s
        operation = await ai.operations.getVideosOperation({operation: operation});
    }
    
    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    
    if (!videoUri) {
        throw new Error("Video generation completed but returned no URI.");
    }
    
    // Return URI with API Key for access
    return `${videoUri}&key=${process.env.API_KEY}`; 
};
// Export active provider for legacy components
export let activeProvider: AIProvider = 'GOOGLE';
export let apiKey = ''; // Legacy export
export const fetchAndSetActiveKey = async () => { /* No-op, handled by engine */ };