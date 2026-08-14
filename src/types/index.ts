export type UserRole = 'admin' | 'super_user' | 'user';

export interface AppUser {
  uid: string;
  phone: string;
  name: string;
  photoURL?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: number;
  fcmTokens?: string[];
}

export interface Invite {
  id: string;
  phone: string;
  type: 'registration' | 'password_reset';
  createdBy: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
  usedBy?: string;
}

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'link';
export type MessageStatus = 'sending' | 'sent' | 'received' | 'seen';

export interface ChatMessage {
  id: string;
  chatId: string;
  type: MessageType;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: number;
  status: MessageStatus;
  encrypted: boolean;
  encryptedData?: string;
  iv?: string;
  mediaURL?: string;
  mediaWidth?: number;
  mediaHeight?: number;
  duration?: number;
  deletedFor: string[];
  deletedForAll: boolean;
  editedAt?: number;
}

export interface Chat {
  id: string;
  participants: string[];
  participantNames: Record<string, string>;
  lastMessage?: string;
  lastMessageTime?: number;
  lastMessageSender?: string;
  type: 'one_to_one' | 'group' | 'broadcast';
  createdAt: number;
  groupName?: string;
  groupPhoto?: string;
  groupAdmins?: string[];
  adminOnlyPost?: boolean;
  broadcastCreator?: string;
}

export interface Status {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  type: MessageType;
  content: string;
  mediaURL?: string;
  timestamp: number;
  expiresAt: number;
  viewers: string[];
  loves: string[];
  editedAt?: number;
}

export interface PasswordResetRequest {
  id: string;
  userId: string;
  userName: string;
  phone: string;
  requestedAt: number;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: number;
}
