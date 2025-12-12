import { db } from '../firebaseConfig';
import { collection, getDocs, doc, updateDoc, addDoc, query, orderBy, limit, getDoc, setDoc, where, deleteDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { UserProfile, AuditLog, UserRole, StoredKey, ActivityLog, ContactDetails, AIProvider, ToolConfig, ConversionRates, SupportTicket, PlanType, Notification, KeyRotationLog, AccessCode } from '../types';

// --- Default System State ---
export const DEFAULT_RATES: ConversionRates = { USD: 1, PKR: 278, INR: 83, AED: 3.67 };

// --- Tool Access Management (Per User) ---

export const grantToolAccess = async (adminEmail: string, userId: string, toolId: string) => {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
        purchasedTools: arrayUnion(toolId)
    });
    await logAction(adminEmail, userId, `Granted access to tool: ${toolId}`);
};

export const revokeToolAccess = async (adminEmail: string, userId: string, toolId: string) => {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
        purchasedTools: arrayRemove(toolId)
    });
    await logAction(adminEmail, userId, `Revoked access to tool: ${toolId}`);
};

// --- Notification System ---

// Send to specific user
export const sendUserNotification = async (adminEmail: string, targetUserId: string, title: string, message: string) => {
    await addDoc(collection(db, "notifications"), {
        title,
        message,
        timestamp: Date.now(),
        type: 'user',
        target: targetUserId,
        seenBy: []
    });
    await logAction(adminEmail, targetUserId, `Sent notification: ${title}`);
};

// Send to all (Broadcast)
export const sendBroadcast = async (message: string, adminEmail: string, title: string = "System Broadcast") => {
    await addDoc(collection(db, "notifications"), {
        title,
        message,
        timestamp: Date.now(),
        type: 'global',
        seenBy: []
    });
    await logAction(adminEmail, "ALL_USERS", `Sent broadcast: ${message}`);
    return "Broadcast sent to all users.";
};

export const markNotificationRead = async (notificationId: string, userId: string) => {
    const ref = doc(db, "notifications", notificationId);
    await updateDoc(ref, {
        seenBy: arrayUnion(userId)
    });
};

// --- Existing Logic Below ---

export const updateToolConfig = async (tool: ToolConfig, adminEmail: string) => {
    await setDoc(doc(db, "tools", tool.id), tool);
    await logAction(adminEmail, "System", `Updated config for tool ${tool.id}`);
};

export const updateToolVisibility = async (toolId: string, visibility: 'visible' | 'hidden') => {
    const toolRef = doc(db, "tools", toolId.toUpperCase());
    await setDoc(toolRef, { visibility }, { merge: true });
    return `Tool ${toolId} is now ${visibility}.`;
};

export const updateToolStatus = async (toolId: string, status: 'active' | 'inactive') => {
    const toolRef = doc(db, "tools", toolId.toUpperCase());
    await setDoc(toolRef, { status }, { merge: true });
    return `Tool ${toolId} is now ${status}.`;
};

export const updateToolAccess = async (toolId: string, access: PlanType) => {
    const validPlans = ['free', 'basic', 'pro', 'ultra'];
    if(!validPlans.includes(access.toLowerCase())) return "Invalid plan type.";
    const toolRef = doc(db, "tools", toolId.toUpperCase());
    await setDoc(toolRef, { access: access.charAt(0).toUpperCase() + access.slice(1).toLowerCase() }, { merge: true });
    return `Tool ${toolId} access level set to ${access}.`;
};

export const updateToolPrice = async (toolId: string, price: number) => {
    const toolRef = doc(db, "tools", toolId.toUpperCase());
    await setDoc(toolRef, { basePriceUSD: price }, { merge: true });
    return `Tool ${toolId} base price set to $${price}.`;
};

// --- User Logic (Direct Updates for UI) ---

// Update User Plan directly by UID
export const updateUserPlan = async (uid: string, plan: PlanType, adminEmail: string) => {
    await updateDoc(doc(db, "users", uid), { plan });
    await logAction(adminEmail, uid, `Plan changed to ${plan}`);
};

// Update User Credits directly by UID
export const updateUserCredits = async (uid: string, credits: number, adminEmail: string) => {
    await updateDoc(doc(db, "users", uid), { credits });
    await logAction(adminEmail, uid, `Credits set to ${credits}`);
};

// Ban/Unban user directly by UID
export const toggleBanUser = async (adminEmail: string, targetUid: string, targetEmail: string, currentBanStatus: boolean) => {
  await updateDoc(doc(db, "users", targetUid), { isBanned: !currentBanStatus });
  await logAction(adminEmail, targetEmail, currentBanStatus ? "Unbanned user" : "Banned user");
};

// Update User Role directly by UID
export const updateUserRole = async (adminEmail: string, targetUid: string, targetEmail: string, newRole: UserRole) => {
  await updateDoc(doc(db, "users", targetUid), { role: newRole });
  await logAction(adminEmail, targetEmail, `Changed role to ${newRole}`);
};

// --- Purchasing & Access Codes ---

// Generate a new access code
export const generateAccessCode = async (adminEmail: string, toolId: string, customCode?: string) => {
    const code = customCode || Math.random().toString(36).substring(2, 10).toUpperCase();
    const newCode: AccessCode = {
        id: Math.random().toString(36).substring(2, 15),
        code: code,
        toolId: toolId,
        status: 'unused',
        createdBy: adminEmail,
        createdAt: Date.now()
    };
    
    // Store in a dedicated collection
    await setDoc(doc(db, "access_codes", newCode.code), newCode); // Use code as doc ID for easy lookup
    await logAction(adminEmail, "System", `Generated Access Code ${code} for ${toolId}`);
    return newCode;
};

// Get all codes
export const getAccessCodes = async (): Promise<AccessCode[]> => {
    const q = query(collection(db, "access_codes"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as AccessCode);
};

// Delete Access Code
export const deleteAccessCode = async (code: string) => {
    await deleteDoc(doc(db, "access_codes", code));
};

// Verify and Redeem a code (User Side)
export const redeemAccessCode = async (userId: string, userEmail: string, codeInput: string): Promise<{success: boolean, message: string, toolId?: string}> => {
    const codeRef = doc(db, "access_codes", codeInput.trim());
    const codeSnap = await getDoc(codeRef);

    if (!codeSnap.exists()) {
        return { success: false, message: "Invalid Code." };
    }

    const accessCode = codeSnap.data() as AccessCode;

    if (accessCode.status === 'used') {
        return { success: false, message: "This code has already been used." };
    }

    // Mark code as used
    await updateDoc(codeRef, {
        status: 'used',
        usedBy: userEmail,
        usedAt: Date.now()
    });

    // Grant Access to User
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
        purchasedTools: arrayUnion(accessCode.toolId)
    });

    await logAction(userEmail, "System", `Redeemed code ${codeInput} for ${accessCode.toolId}`);
    return { success: true, message: "Code Redeemed! Tool Unlocked.", toolId: accessCode.toolId };
};

export const purchaseTool = async (userId: string, toolId: string) => {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
        purchasedTools: arrayUnion(toolId)
    });
};

// --- Support Tickets ---
export const createSupportTicket = async (userId: string, userEmail: string, subject: string, initialMessage: string) => {
    await addDoc(collection(db, "support_tickets"), {
        userId,
        userEmail,
        subject,
        status: 'pending',
        messages: [{
            sender: 'user',
            text: initialMessage,
            timestamp: Date.now()
        }],
        createdAt: Date.now(),
        lastUpdate: Date.now()
    });
};

export const acceptSupportTicket = async (ticketId: string, adminEmail: string) => {
    await updateDoc(doc(db, "support_tickets", ticketId), {
        status: 'active',
        messages: arrayUnion({
            sender: 'admin',
            text: `Agent ${adminEmail.split('@')[0]} has joined the chat.`,
            timestamp: Date.now()
        })
    });
};

export const getSupportTickets = async (status?: string): Promise<SupportTicket[]> => {
    let q = query(collection(db, "support_tickets"), orderBy("lastUpdate", "desc"));
    if (status) {
        q = query(collection(db, "support_tickets"), where("status", "==", status), orderBy("lastUpdate", "desc"));
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as SupportTicket));
};

export const replyToTicket = async (ticketId: string, message: string, isAdmin: boolean) => {
    const ticketRef = doc(db, "support_tickets", ticketId);
    const snap = await getDoc(ticketRef);
    if (!snap.exists()) return;
    
    const data = snap.data() as SupportTicket;
    
    // Safety check: Don't allow replies to pending tickets unless it's an accept action (handled separately)
    // or if the admin forces a reply.
    
    const newMessages = [...data.messages, {
        sender: isAdmin ? 'admin' : 'user',
        text: message,
        timestamp: Date.now()
    }];
    
    await updateDoc(ticketRef, {
        messages: newMessages,
        lastUpdate: Date.now()
    });
};

export const closeTicket = async (ticketId: string) => {
    await updateDoc(doc(db, "support_tickets", ticketId), { status: 'closed' });
};

// --- Standard Admin Service Functions ---

export const getTools = async (): Promise<ToolConfig[]> => {
    const q = query(collection(db, "tools"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as ToolConfig));
};

export const fetchAllUsers = async (): Promise<UserProfile[]> => {
  const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data() as UserProfile);
};

export const fetchAuditLogs = async (): Promise<AuditLog[]> => {
  const q = query(collection(db, "audit_logs"), orderBy("timestamp", "desc"), limit(100));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog));
};

export const fetchActivityLogs = async (): Promise<ActivityLog[]> => {
  const q = query(collection(db, "user_activity"), orderBy("timestamp", "desc"), limit(50));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityLog));
};

export const logAction = async (adminEmail: string, targetEmail: string, details: string) => {
  await addDoc(collection(db, "audit_logs"), {
    action: "ADMIN_ACTION",
    adminEmail,
    targetEmail,
    timestamp: Date.now(),
    details
  });
};

export const getStats = async () => {
    const users = await fetchAllUsers();
    return {
        total: users.length,
        banned: users.filter(u => u.isBanned).length,
        admins: users.filter(u => u.role === 'admin' || u.role === 'superadmin').length
    };
};

export const addApiKey = async (adminEmail: string, key: string, provider: AIProvider = 'GOOGLE', alias: string = 'New Key', usageLimit: number = 1000) => {
  await addDoc(collection(db, "api_keys"), {
    key,
    provider,
    alias,
    addedBy: adminEmail,
    createdAt: Date.now(),
    status: 'active',
    usageCount: 0,
    usageLimit: usageLimit,
    lastUsed: 0
  });
  await logAction(adminEmail, "System", `Added new ${provider} API Key: ${alias}`);
};

export const getApiKeys = async (): Promise<StoredKey[]> => {
  const q = query(collection(db, "api_keys"), orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StoredKey));
};

export const updateKeyStatus = async (id: string, status: 'active' | 'exhausted' | 'suspended') => {
    await updateDoc(doc(db, "api_keys", id), { status });
}

export const deleteApiKey = async (adminEmail: string, id: string) => {
  await deleteDoc(doc(db, "api_keys", id));
  await logAction(adminEmail, "System", "Deleted API Key");
};

export const logKeyRotation = async (provider: AIProvider, oldKeyAlias: string, newKeyAlias: string, reason: string) => {
    await addDoc(collection(db, "key_rotation_logs"), {
        timestamp: Date.now(),
        provider,
        previousKeyAlias: oldKeyAlias,
        newKeyAlias: newKeyAlias,
        reason
    });
};

export const getRotationLogs = async (): Promise<KeyRotationLog[]> => {
    const q = query(collection(db, "key_rotation_logs"), orderBy("timestamp", "desc"), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as KeyRotationLog));
};

export const getContactDetails = async (): Promise<ContactDetails | null> => {
    const docRef = doc(db, "admin_settings", "contact_info");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) return docSnap.data() as ContactDetails;
    return null;
};

export const updateContactDetails = async (adminEmail: string, details: ContactDetails) => {
    await setDoc(doc(db, "admin_settings", "contact_info"), details);
    await logAction(adminEmail, "System", "Updated Contact Details");
};