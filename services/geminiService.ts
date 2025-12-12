import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import { db } from '../firebaseConfig';
import { collection, query, orderBy, getDocs, where, doc, updateDoc, increment } from 'firebase/firestore';
import { AIProvider, StoredKey } from "../types";
import { logKeyRotation } from "./adminService";

// --- KEY ENGINE ---

interface KeyCache {
    keys: StoredKey[];
    lastFetch: number;
}

const CACHE_DURATION = 5 * 60 * 1000;
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
 * Fetches active keys. PRIORITIZES LOCAL STORAGE KEY.
 */
const fetchActiveKeys = async (provider: AIProvider): Promise<StoredKey[]> => {
    // 1. Check Local Storage (User Override) - "zamanx_api_key"
    if (typeof window !== 'undefined') {
        const manualKey = localStorage.getItem('zamanx_api_key');
        if (manualKey) {
             const now = Date.now();
             const usage = parseInt(localStorage.getItem('zamanx_key_usage') || '0');
             const mockKey: StoredKey = {
                 id: 'local-user-key', 
                 key: manualKey, 
                 provider: 'GOOGLE', // Assume Google for local key
                 alias: 'My Active Key', 
                 status: 'active', 
                 usageCount: usage, 
                 usageLimit: 999999, 
                 lastUsed: now, 
                 addedBy: 'local', 
                 createdAt: parseInt(localStorage.getItem('zamanx_key_created') || now.toString())
             };
             return [mockKey];
        }
    }

    // 2. Fallback to System/Firestore Keys
    const now = Date.now();
    if (keyCache[provider] && (now - keyCache[provider].lastFetch < CACHE_DURATION)) {
        return keyCache[provider].keys;
    }

    try {
        const q = query(
            collection(db, "api_keys"), 
            where("provider", "==", provider),
            where("status", "==", "active"),
            orderBy("usageCount", "asc")
        );
        
        const snapshot = await getDocs(q);
        const keys = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StoredKey));
        const validKeys = keys.filter(k => k.usageCount < k.usageLimit);

        keyCache[provider] = { keys: validKeys, lastFetch: now };
        return validKeys;
    } catch (error) {
        console.warn(`Failed to fetch ${provider} keys:`, error);
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

const rotateKey = async (exhaustedKey: StoredKey, reason: string) => {
    try {
        if (exhaustedKey.id === 'local-user-key') {
            console.error("Local Key Exhausted or Invalid");
            return;
        }
        if (exhaustedKey.id === 'env-fallback') return;

        await updateDoc(doc(db, "api_keys", exhaustedKey.id), { status: 'exhausted' });
        if (keyCache[exhaustedKey.provider]) {
            keyCache[exhaustedKey.provider].lastFetch = 0; 
        }
        
        const nextKeys = await fetchActiveKeys(exhaustedKey.provider);
        const nextKeyAlias = nextKeys.length > 0 ? nextKeys[0].alias : "None Available";
        await logKeyRotation(exhaustedKey.provider, exhaustedKey.alias, nextKeyAlias, reason);
    } catch (e) {
        console.error("Rotation logic failed:", e);
    }
};

const incrementUsage = async (key: StoredKey) => {
    // Handle Local Storage Key Usage Update
    if (key.id === 'local-user-key') {
        const current = parseInt(localStorage.getItem('zamanx_key_usage') || '0');
        const newUsage = current + 1;
        localStorage.setItem('zamanx_key_usage', newUsage.toString());
        // Dispatch event for UI updates
        window.dispatchEvent(new Event('zamanx-key-update'));
        return;
    }

    if (key.id === 'env-fallback') return;
    try {
        key.usageCount++;
        updateDoc(doc(db, "api_keys", key.id), { 
            usageCount: increment(1),
            lastUsed: Date.now()
        });
    } catch (e) {
        console.warn("Failed to update usage stats");
    }
};

const isQuotaError = (error: any): boolean => {
    const msg = (error?.toString() + (error?.message || "")).toLowerCase();
    return msg.includes('quota') || msg.includes('429') || msg.includes('insufficient') || msg.includes('rate limit') || msg.includes('403');
};

const executeWithRotation = async <T>(
    provider: AIProvider, 
    operation: (apiKey: string) => Promise<T>
): Promise<T> => {
    const maxAttempts = 5;
    let attempts = 0;

    while (attempts < maxAttempts) {
        const keys = await fetchActiveKeys(provider);
        
        if (keys.length === 0) {
            // Check for missing local key specifically
            if (typeof window !== 'undefined' && !localStorage.getItem('zamanx_api_key')) {
                throw new Error("Missing API Key. Please add one in the Admin Dashboard.");
            }
            throw new Error("System Busy: No active API keys available.");
        }

        const currentKey = keys[0];

        try {
            const result = await operation(currentKey.key);
            await incrementUsage(currentKey);
            return result;
        } catch (error: any) {
            console.error(`API Error with key ${currentKey.alias}:`, error);

            if (isQuotaError(error)) {
                await rotateKey(currentKey, "Quota Exceeded");
                attempts++;
            } else {
                throw error;
            }
        }
    }
    throw new Error("Request failed after multiple attempts.");
};

export const setDynamicApiKey = (key: string) => {
    // This is now mainly for triggering re-fetches, as fetchActiveKeys reads localStorage directly
    keyCache = {}; 
};

export const fetchAndSetActiveKey = async () => { /* No-op */ };

// --- EXPORTS ---

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
        `Expand and improve this prompt to be highly detailed. Input: "${input}"`, 
        "You are an expert prompt engineer."
    );
};

export const generateChatStream = async function* (history: any[], newMessage: string, systemInstruction?: string) {
    const keys = await fetchActiveKeys('GOOGLE');
    if(keys.length === 0) throw new Error("Missing API Key. Add via Admin Dashboard.");
    
    const currentKey = keys[0]; 

    try {
        const ai = new GoogleGenAI({ apiKey: currentKey.key });
        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            history: history,
            config: { systemInstruction }
        });
        const result = await chat.sendMessageStream({ message: newMessage });
        incrementUsage(currentKey); 

        for await (const chunk of result) {
            const c = chunk as GenerateContentResponse;
            if (c.text) yield c.text;
        }
    } catch (error: any) {
        if (isQuotaError(error)) {
            await rotateKey(currentKey, "Quota Exceeded during Stream");
            throw new Error("Capacity limit reached. Retrying...");
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

// ... SaaS Logic (WhatsApp, Planner, etc.) reuse generateText which now handles the local key ...

export const generateWhatsAppCampaign = async (product: string, audience: string, goal: string, isDemo: boolean): Promise<string> => {
    const prompt = `Create a WhatsApp Marketing Campaign for: Product: ${product}, Audience: ${audience}, Goal: ${goal}.`;
    return generateText(prompt, "WhatsApp Marketing Specialist");
};

export const generateWhatsAppBotConfig = async (business: string, goal: string, tone: string): Promise<string> => {
    const prompt = `Design a WhatsApp Chatbot for ${business} (${tone}). Goal: ${goal}.`;
    return generateText(prompt, "Conversational Designer");
};

export const generateWhatsAppPythonScript = async (task: string): Promise<string> => {
    return analyzeCode(`Python script for WhatsApp: ${task}`);
};

export const analyzeWhatsAppChat = async (chatData: string): Promise<string> => {
    return generateText(`Analyze this chat: ${chatData.substring(0,20000)}`, "Forensic Analyst");
};

export const generateContentCalendar = async (keyword: string, niche: string, isDemo: boolean): Promise<string> => {
    return generateText(`30-day content calendar for ${niche} focusing on ${keyword}`, "Social Media Strategist");
};

export const generateStoreStructure = async (name: string, products: string, isDemo: boolean): Promise<string> => {
    const prompt = `Generate HTML for WhatsApp Store: ${name}. Products: ${products}. Output raw HTML only.`;
    const res = await generateText(prompt, "Frontend Dev");
    return res.replace(/```html/g, '').replace(/```/g, ''); 
};

export const analyzeCode = (p: string) => generateText(p, "Coding Expert");
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
export const generateLegalAdvice = (q: string) => generateText(q, "Legal Advisor");
export const generateFitnessPlan = (q: string) => generateText(q, "Fitness Coach");
export const generateStudyGuide = (q: string, f?: any) => generateText(q, "Study Helper");

export const generateVideo = async (prompt: string) => {
    // Veo requires process.env.API_KEY directly as it is selected by the user via AI Studio
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        config: { numberOfVideos: 1, resolution: '1080p', aspectRatio: '16:9' }
    });
    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({operation: operation});
    }
    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("Video generation completed but returned no URI.");
    return `${videoUri}&key=${process.env.API_KEY}`; 
};

export let activeProvider: AIProvider = 'GOOGLE';
export let apiKey = ''; 
