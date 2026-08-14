import { db, storage } from './firebase';
import {
  collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where,
  orderBy, limit, onSnapshot, addDoc, Timestamp, arrayUnion, arrayRemove, increment,
  writeBatch,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import * as FileSystem from 'expo-file-system';
import { generateUUID, generateChatKey, encryptMessage, decryptMessage } from './encryption';
import { ChatMessage, Chat, AppUser, Invite, Status, PasswordResetRequest } from '../types';

const USERS_COL = 'users';
const CHATS_COL = 'chats';
const MESSAGES_COL = 'messages';
const INVITES_COL = 'invites';
const STATUSES_COL = 'statuses';
const RESET_REQUESTS_COL = 'resetRequests';

export const dbService = {
  // === Users ===
  async createUser(user: AppUser) {
    await setDoc(doc(db, USERS_COL, user.uid), user);
  },

  async getUser(uid: string): Promise<AppUser | null> {
    const snap = await getDoc(doc(db, USERS_COL, uid));
    return snap.exists() ? (snap.data() as AppUser) : null;
  },

  async updateUser(uid: string, data: Partial<AppUser>) {
    await updateDoc(doc(db, USERS_COL, uid), data);
  },

  async getAllUsers(): Promise<AppUser[]> {
    const snap = await getDocs(collection(db, USERS_COL));
    return snap.docs.map(d => d.data() as AppUser);
  },

  async getUsersByPhone(phone: string): Promise<AppUser | null> {
    const q = query(collection(db, USERS_COL), where('phone', '==', phone));
    const snap = await getDocs(q);
    return snap.empty ? null : (snap.docs[0].data() as AppUser);
  },

  onUsersChange(callback: (users: AppUser[]) => void) {
    return onSnapshot(collection(db, USERS_COL), snap => {
      callback(snap.docs.map(d => ({ ...d.data(), uid: d.id } as AppUser)));
    });
  },

  // === Invites ===
  async createInvite(invite: Omit<Invite, 'id'>): Promise<string> {
    const ref = await addDoc(collection(db, INVITES_COL), invite);
    await updateDoc(ref, { id: ref.id });
    return ref.id;
  },

  async getInvite(id: string): Promise<Invite | null> {
    const snap = await getDoc(doc(db, INVITES_COL, id));
    return snap.exists() ? (snap.data() as Invite) : null;
  },

  async useInvite(id: string, usedBy: string) {
    await updateDoc(doc(db, INVITES_COL, id), { used: true, usedBy });
  },

  // === Chats ===
  async createChat(chat: Omit<Chat, 'id'>): Promise<string> {
    const id = await generateUUID();
    await setDoc(doc(db, CHATS_COL, id), { ...chat, id });
    return id;
  },

  async getChat(id: string): Promise<Chat | null> {
    const snap = await getDoc(doc(db, CHATS_COL, id));
    return snap.exists() ? (snap.data() as Chat) : null;
  },

  async getUserChats(uid: string): Promise<Chat[]> {
    const q = query(collection(db, CHATS_COL), where('participants', 'array-contains', uid));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Chat).sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));
  },

  onUserChats(uid: string, callback: (chats: Chat[]) => void) {
    const q = query(collection(db, CHATS_COL), where('participants', 'array-contains', uid));
    return onSnapshot(q, snap => {
      const chats = snap.docs.map(d => d.data() as Chat).sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));
      callback(chats);
    });
  },

  async updateChat(id: string, data: Partial<Chat>) {
    await updateDoc(doc(db, CHATS_COL, id), data);
  },

  // === Messages ===
  async sendMessage(
    chatId: string,
    senderId: string,
    senderName: string,
    type: ChatMessage['type'],
    content: string,
    key: string,
    mediaURL?: string,
    mediaWidth?: number,
    mediaHeight?: number,
    duration?: number,
  ): Promise<string> {
    const id = await generateUUID();
    const { encrypted, iv } = await encryptMessage(content, key);
    const msg: ChatMessage = {
      id, chatId, type, content: encrypted, senderId, senderName,
      timestamp: Date.now(), status: 'sent', encrypted: true,
      encryptedData: encrypted, iv, mediaURL, mediaWidth, mediaHeight, duration,
      deletedFor: [], deletedForAll: false,
    };
    await setDoc(doc(db, CHATS_COL, chatId, MESSAGES_COL, id), msg);
    await updateDoc(doc(db, CHATS_COL, chatId), {
      lastMessage: type === 'text' ? content.slice(0, 100) : `[${type}]`,
      lastMessageTime: Date.now(),
      lastMessageSender: senderId,
    });
    return id;
  },

  async getMessages(chatId: string): Promise<ChatMessage[]> {
    const q = query(
      collection(db, CHATS_COL, chatId, MESSAGES_COL),
      orderBy('timestamp', 'asc'),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as ChatMessage);
  },

  onMessages(chatId: string, callback: (msgs: ChatMessage[]) => void) {
    const q = query(collection(db, CHATS_COL, chatId, MESSAGES_COL), orderBy('timestamp', 'asc'));
    return onSnapshot(q, snap => {
      callback(snap.docs.map(d => ({ ...d.data(), id: d.id } as ChatMessage)));
    });
  },

  async updateMessageStatus(chatId: string, msgId: string, status: ChatMessage['status']) {
    await updateDoc(doc(db, CHATS_COL, chatId, MESSAGES_COL, msgId), { status });
  },

  async deleteMessageForMe(chatId: string, msgId: string, userId: string) {
    await updateDoc(doc(db, CHATS_COL, chatId, MESSAGES_COL, msgId), {
      deletedFor: arrayUnion(userId),
    });
  },

  async deleteMessageForAll(chatId: string, msgId: string) {
    const msgDoc = await getDoc(doc(db, CHATS_COL, chatId, MESSAGES_COL, msgId));
    const msg = msgDoc.data() as ChatMessage;
    const elapsed = Date.now() - msg.timestamp;
    if (elapsed > 10 * 60 * 1000) throw new Error('Delete window expired');
    await updateDoc(doc(db, CHATS_COL, chatId, MESSAGES_COL, msgId), { deletedForAll: true });
  },

  async editMessage(chatId: string, msgId: string, newContent: string, key: string) {
    const { encrypted } = await encryptMessage(newContent, key);
    await updateDoc(doc(db, CHATS_COL, chatId, MESSAGES_COL, msgId), {
      content: encrypted,
      editedAt: Date.now(),
    });
  },

  // === Decrypt messages helper ===
  async decryptMessages(messages: ChatMessage[], key: string): Promise<ChatMessage[]> {
    return Promise.all(messages.map(async (msg) => {
      if (msg.encrypted && msg.encryptedData && msg.iv) {
        try {
          msg.content = await decryptMessage(msg.encryptedData, msg.iv, key);
        } catch { }
      }
      return msg;
    }));
  },

  // === Status ===
  async postStatus(status: Omit<Status, 'id'>): Promise<string> {
    const id = await generateUUID();
    await setDoc(doc(db, STATUSES_COL, id), { ...status, id });
    return id;
  },

  async getStatuses(userId: string): Promise<Status[]> {
    const q = query(
      collection(db, STATUSES_COL),
      where('expiresAt', '>', Date.now()),
      orderBy('expiresAt', 'desc'),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Status);
  },

  onStatuses(callback: (statuses: Status[]) => void) {
    const q = query(collection(db, STATUSES_COL), where('expiresAt', '>', Date.now()), orderBy('expiresAt', 'desc'));
    return onSnapshot(q, snap => {
      callback(snap.docs.map(d => d.data() as Status));
    });
  },

  async addStatusViewer(statusId: string, userId: string) {
    await updateDoc(doc(db, STATUSES_COL, statusId), { viewers: arrayUnion(userId) });
  },

  async loveStatus(statusId: string, userId: string) {
    await updateDoc(doc(db, STATUSES_COL, statusId), { loves: arrayUnion(userId) });
  },

  async deleteStatus(statusId: string) {
    await deleteDoc(doc(db, STATUSES_COL, statusId));
  },

  async editStatus(statusId: string, content: string) {
    await updateDoc(doc(db, STATUSES_COL, statusId), { content, editedAt: Date.now() });
  },

  // === Reset Requests ===
  async createResetRequest(req: Omit<PasswordResetRequest, 'id'>): Promise<string> {
    const ref = await addDoc(collection(db, RESET_REQUESTS_COL), req);
    await updateDoc(ref, { id: ref.id });
    return ref.id;
  },

  async getResetRequests(): Promise<PasswordResetRequest[]> {
    const snap = await getDocs(query(collection(db, RESET_REQUESTS_COL), where('resolved', '==', false)));
    return snap.docs.map(d => d.data() as PasswordResetRequest);
  },

  onResetRequests(callback: (reqs: PasswordResetRequest[]) => void) {
    const q = query(collection(db, RESET_REQUESTS_COL), where('resolved', '==', false));
    return onSnapshot(q, snap => {
      callback(snap.docs.map(d => d.data() as PasswordResetRequest));
    });
  },

  async resolveResetRequest(id: string, resolvedBy: string) {
    await updateDoc(doc(db, RESET_REQUESTS_COL, id), { resolved: true, resolvedBy, resolvedAt: Date.now() });
  },

  // === Media Upload ===
  async uploadMedia(uri: string, path: string): Promise<string> {
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    const blob = new Blob([Uint8Array.from(atob(base64), c => c.charCodeAt(0))], { type: 'image/jpeg' });
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
  },
};
