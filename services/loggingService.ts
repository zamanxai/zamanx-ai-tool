
import { db } from '../firebaseConfig';
import { collection, addDoc } from 'firebase/firestore';

export const logActivity = async (userId: string, userEmail: string, tool: string, prompt: string, metadata?: any) => {
  try {
    // Truncate very long prompts to save DB space
    const safePrompt = prompt.length > 500 ? prompt.substring(0, 500) + '...' : prompt;
    
    await addDoc(collection(db, "user_activity"), {
      userId,
      userEmail,
      tool,
      prompt: safePrompt,
      timestamp: Date.now(),
      metadata: metadata || {}
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
};
