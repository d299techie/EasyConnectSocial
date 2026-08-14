# EasyConnectSocial — Project Spec

## Overview
End-to-end encrypted chat application built with React Native (Expo SDK 57) and Firebase. Supports one-to-one chats, group chats, broadcast messaging, and ephemeral status updates. Uses invite-based registration and admin-managed password resets.

## Architecture

### Stack
- **Framework**: Expo SDK ~57.0, React Native 0.86.2, React 19.2.3
- **Navigation**: `@react-navigation/native` + `stack` + `bottom-tabs`
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Encryption**: AES-256-GCM via Web Crypto API (`expo-crypto`)
- **Build**: Expo Application Services (EAS), GitHub Actions CI

### Entry Points
| File | Purpose |
|------|---------|
| `index.ts` | Registers root component via `registerRootComponent(App)` |
| `App.tsx` | Root component: `GestureHandlerRootView` > `AuthProvider` > `AppNavigator` |

### Directory Structure
```
src/
  context/       — React context providers (AuthContext)
  navigation/    — Stack + Tab navigators (AppNavigator)
  screens/       — 18 screen components
  services/      — Firebase init, DB abstraction, encryption
  types/         — TypeScript interfaces
```

---

## Auth Flow

### Registration (Invite-Only)
1. Admin generates invite link via Admin Settings → Invite tab
2. User opens `easyconnectsocial://invite/{inviteId}` deep link
3. `InviteScreen` validates invite (exists, not used, not expired)
4. Routes to `RegisterScreen` with `inviteId` param
5. Creates Firebase Auth user with email = `{phone}@easyconnect.app`
6. Creates `AppUser` document in Firestore `users/{uid}`
7. Marks invite as used

### Login
- Phone + password → Firebase `signInWithEmailAndPassword`
- Email mapped as `{phone}@easyconnect.app`
- `onAuthStateChanged` in AuthContext syncs `AppUser` from Firestore

### Password Reset
- Admin generates password-reset invite via Admin → Resets tab
- User opens link → `ResetPasswordScreen` with invite
- Validates invite, calls `signInWithEmailAndPassword` + `updatePassword`

### AuthContext (`src/context/AuthContext.tsx`)
Provides: `{ user: FirebaseUser, appUser: AppUser, loading, refreshUser }`
- `user`: raw Firebase Auth user
- `appUser`: enriched profile from Firestore `users/{uid}`
- `loading`: true until first auth state resolved
- `refreshUser()`: re-fetches `appUser` from Firestore

---

## Navigation

### Unauthenticated Stack
| Route | Component | Description |
|-------|-----------|-------------|
| `Login` | LoginScreen | Phone + password sign in |
| `Register` | RegisterScreen | Invite-based registration |
| `ResetPassword` | ResetPasswordScreen | Admin-invited password reset |
| `Invite` | InviteScreen | Deep link invite handling |

### Authenticated Tabs
| Tab | Component | Icon |
|-----|-----------|------|
| Chats | ChatsScreen | 💬 |
| Groups | GroupsScreen | 👥 |
| Broadcasts | BroadcastsScreen | 📢 |
| Status | StatusScreen | ⏺ |

### Authenticated Stack (from Tabs)
| Route | Component | Description |
|-------|-----------|-------------|
| ChatRoom | ChatRoomScreen | 1-to-1 messaging |
| GroupChat | GroupChatScreen | Group messaging |
| GroupInfo | GroupInfoScreen | Group settings/members |
| BroadcastChat | BroadcastChatScreen | Broadcast thread |
| BroadcastCreate | BroadcastCreateScreen | Create new broadcast |
| StatusViewer | StatusViewerScreen | Story-style status viewer |
| Profile | ProfileScreen | User profile & settings |
| AdminSettings | AdminSettingsScreen | User mgmt, invites, resets |
| UserManagement | UserManagementScreen | User list & role mgmt |

---

## Screens Detail

### Auth Screens

#### LoginScreen
- Inputs: phone, password
- Uses `{phone}@easyconnect.app` email convention
- Links to ResetPassword and Invite screens
- Dark theme: `bg: #1a1a2e`, `accent: #e94560`, `input: #16213e`

#### RegisterScreen
- Reads `inviteId` from route params
- Validates invite on mount (exists, unused, not expired)
- Pre-fills phone from invite
- Creates Firestore `AppUser` doc on success

#### ResetPasswordScreen
- Two modes: with invite (admin-forced reset) or current password
- Validates invite if provided
- Updates password via `updatePassword`

#### InviteScreen
- Parses invite ID from deep link or manual input
- Shows invite details (phone, type, expiry)
- Routes to Register or ResetPassword

### Chat Screens

#### ChatsScreen
- Real-time list of user's 1-to-1 chats (`onSnapshot`)
- FAB (+) opens user picker modal
- Search/filter users by name or phone
- Creates chat on first message, reuses existing

#### ChatRoomScreen
- Real-time messages via `onMessages` subcollection listener
- Message actions: copy, share, delete for me, delete for all (10-min window)
- Media: image picker, video picker (placeholder for audio)
- Input bar with text + attachment button
- Long-press on message shows action sheet

### Group Screens

#### GroupsScreen
- Lists user's groups
- FAB (+) opens create group modal
- Multi-select members with checkboxes
- Creator becomes group admin

#### GroupChatScreen
- Shows sender names for non-own messages
- Admin-only posting toggle respected
- Group info header → navigable to GroupInfoScreen
- Delete-for-all restricted to admins

#### GroupInfoScreen
- Displays member list with admin badges
- Admin controls: promote/demote admins, remove members
- "Admin only posts" toggle (Switch)
- Creator always listed first

### Broadcast Screens

#### BroadcastsScreen
- Lists user's broadcast channels
- FAB (+) → `BroadcastCreateScreen`

#### BroadcastCreateScreen
- Name + multi-select recipients
- Creates broadcast `Chat` entry

#### BroadcastChatScreen
- Creator can send; recipients view-only
- Messages sent individually to each recipient
- Read-only bar for non-creators

### Status Screens

#### StatusScreen
- "My Status" horizontal scroll (circular avatars)
- "Recent Updates" grouped by user
- FAB (+) → modal: text input, add image, add video
- Statuses expire after 24 hours
- Text statuses can be edited within 10 min

#### StatusViewerScreen
- Story-style viewer with progress bar
- Auto-advance: 5s text, 10s media
- Tap right side → next, tap left side → previous
- Bottom actions: ❤️ love, 👁️ viewers, ✏️ edit, 🗑️ delete
- Records view automatically for others' statuses
- Viewers modal lists user IDs (by uid)

### Profile & Admin

#### ProfileScreen
- Avatar (initial), name, phone, role badge
- Admin/Super User: "Admin Settings" link
- Deactivate account, Delete account, Sign Out

#### AdminSettingsScreen
- 3 tabs: Users, Invite, Resets
- Users: list all, promote/demote (admin only)
- Invite: create registration invite, copy link
- Resets: view pending password reset requests, generate reset invites
- Role hierarchy: `admin` > `super_user` > `user`

#### UserManagementScreen
- Searchable user list
- Tap user → action sheet: promote, demote, deactivate, activate
- Role color coding: admin=#e94560, super_user=#ffd700

---

## Data Models (`src/types/index.ts`)

### User Roles
```
admin      — Full system control, can promote users
super_user — Elevated privileges (admin settings access)
user       — Standard user
```

### AppUser
| Field | Type | Notes |
|-------|------|-------|
| uid | string | Firebase Auth UID |
| phone | string | Unique identifier |
| name | string | Display name |
| photoURL | string? | Profile photo |
| role | UserRole | admin/super_user/user |
| isActive | boolean | Soft-delete flag |
| createdAt | number | Timestamp |
| fcmTokens | string[]? | Push notification tokens |

### Chat
| Field | Type | Notes |
|-------|------|-------|
| id | string | UUID |
| participants | string[] | User UIDs |
| participantNames | Record<string, string> | uid → name map |
| lastMessage | string? | Preview text |
| lastMessageTime | number? | Timestamp |
| lastMessageSender | string? | UID |
| type | 'one_to_one'|'group'|'broadcast' | Chat type |
| createdAt | number | Timestamp |
| groupName | string? | For group/broadcast |
| groupPhoto | string? | Group avatar |
| groupAdmins | string[]? | Admin UIDs |
| adminOnlyPost | boolean? | Group setting |
| broadcastCreator | string? | Creator UID |

### ChatMessage
| Field | Type | Notes |
|-------|------|-------|
| id | string | UUID |
| chatId | string | Parent chat |
| type | 'text'|'image'|'video'|'audio'|'link' | Content type |
| content | string | AES-256-GCM encrypted |
| senderId | string | UID |
| senderName | string | Display name |
| timestamp | number | ms |
| status | 'sending'|'sent'|'received'|'seen' | Delivery status |
| encrypted | boolean | Always true |
| encryptedData | string? | Ciphertext |
| iv | string? | Initialization vector |
| mediaURL | string? | Storage URL |
| mediaWidth/Height | number? | Image/video dimensions |
| duration | number? | Audio duration |
| deletedFor | string[] | UIDs who deleted |
| deletedForAll | boolean | Global delete |
| editedAt | number? | Last edit timestamp |

### Status
| Field | Type | Notes |
|-------|------|-------|
| id | string | UUID |
| userId | string | Creator UID |
| userName | string | Display name |
| userPhoto | string? | Avatar URL |
| type | MessageType | Content type |
| content | string | Text content |
| mediaURL | string? | Storage URL |
| timestamp | number | ms |
| expiresAt | number | 24h from creation |
| viewers | string[] | UIDs who viewed |
| loves | string[] | UIDs who loved |
| editedAt | number? | Last edit |

### Invite
| Field | Type | Notes |
|-------|------|-------|
| id | string | Auto-generated |
| phone | string | Target phone |
| type | 'registration'|'password_reset' | Purpose |
| createdBy | string | Admin UID |
| createdAt | number | Timestamp |
| expiresAt | number | 24h validity |
| used | boolean | Single-use |
| usedBy | string? | UID who consumed |

### PasswordResetRequest
| Field | Type | Notes |
|-------|------|-------|
| id | string | Auto-generated |
| userId | string | Requester UID |
| userName | string | Display name |
| phone | string | Phone |
| requestedAt | number | Timestamp |
| resolved | boolean | Handled |
| resolvedBy | string? | Admin UID |
| resolvedAt | number? | Resolution time |

---

## Services

### Firebase (`src/services/firebase.ts`)
- Initializes single Firebase app instance (`getApps` guard)
- Exports `auth`, `db`, `storage`
- Config reads `EXPO_PUBLIC_FIREBASE_*` env vars
- Fallback placeholders: `'YOUR_API_KEY'`, etc.

### Database (`src/services/db.ts`)
Firestore operations organized by domain:
- **Users**: CRUD, phone lookup, real-time snapshot (`onUsersChange`)
- **Invites**: create, get, use (mark consumed)
- **Chats**: create, get, list by participant, real-time listener (`onUserChats`), update
- **Messages**: send (encrypted), get, real-time (`onMessages`), status update, delete-for-me/for-all, edit, batch decrypt helper
- **Status**: post, get (non-expired), real-time (`onStatuses`), view, love, delete, edit
- **Reset Requests**: create, get pending, real-time (`onResetRequests`), resolve
- **Media**: upload via `expo-file-system` (base64 → Blob → Firebase Storage)

Collections:
- `users/{uid}`
- `invites/{id}`
- `chats/{chatId}`
- `chats/{chatId}/messages/{msgId}`
- `statuses/{statusId}`
- `resetRequests/{id}`

### Encryption (`src/services/encryption.ts`)
- Algorithm: AES-256-GCM
- `generateChatKey()` → random 256-bit key (base64)
- `encryptMessage(text, keyBase64)` → `{ encrypted, iv }`
- `decryptMessage(encryptedData, ivBase64, keyBase64)` → plaintext
- Key derivation from password via raw import (for future use)
- `generateUUID()` via `expo-crypto.randomUUID()`

---

## Configuration

### `app.json`
- Name: "EasyConnectSocial", slug: "easyconnectsocial"
- Dark UI (userInterfaceStyle: "dark")
- Deep link scheme: `easyconnectsocial`
- Owner: `d299techie`
- EAS project ID: `dbd043bf-e8f7-4242-bf77-66e554fa6804`
- Plugins: secure-store, image-picker, sharing, av, notifications
- Android permissions: `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`

### `eas.json`
- Profiles: development (dev client), preview (APK), production (APK)
- EAS CLI ≥ 3.0.0, `cli.appVersionSource: "local"`

### Environment Variables (`.env.example`)
```
EXPO_PUBLIC_FIREBASE_API_KEY
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
EXPO_PUBLIC_FIREBASE_PROJECT_ID
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
EXPO_PUBLIC_FIREBASE_APP_ID
```

### CI/CD (`.github/workflows/build-apk.yml`)
- Triggers: push to main/master, manual dispatch
- Steps: checkout → setup Node → Expo/EAS setup → `npm ci` → `eas build --platform android --profile preview`
- Requires `EXPO_TOKEN` and `FIREBASE_*` GitHub secrets
- Expo project: https://expo.dev/accounts/d299techie/projects/easyconnectsocial

### Dependencies (Key)
- `expo`, `react-native`, `react`
- `firebase` (v12)
- `@react-navigation/*` (v7)
- `react-native-gesture-handler`, `react-native-reanimated`, `react-native-screens`
- `expo-av`, `expo-clipboard`, `expo-crypto`, `expo-file-system`, `expo-image-picker`, `expo-modules-core`, `expo-notifications`, `expo-secure-store`, `expo-sharing`

---

## Known Issues / TODOs
1. **Encryption keys** — Chat messages use hardcoded `'temp-key'` / `'group-key'` in send methods; key exchange not implemented
2. **Encryption not fully wired** — `decryptMessages` helper exists but isn't called in message listeners
3. **Media upload** — `uploadMedia` assumes JPEG; no progress tracking; no content-type support
4. **Deep linking** — `easyconnectsocial://invite/{id}` scheme configured but no explicit linking handler
5. **FCM/Push** — `fcmTokens` field exists on `AppUser` but no push notification logic
6. **Audio recording** — Placeholder alert "coming soon"
7. **Status viewer** — Shows raw UIDs instead of user names
8. **Delete-for-All** — 10-minute window hardcoded; group delete-for-all restricted to admins
9. **Admin vs super_user** — Slightly overlapping/confusing permission boundaries between screens
