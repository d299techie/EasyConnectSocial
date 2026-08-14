import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, Modal, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/db';
import { Chat, AppUser } from '../types';

export default function ChatsScreen({ navigation }: any) {
  const { user, appUser } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;
    const unsub = dbService.onUserChats(user.uid, setChats);
    const unsub2 = dbService.onUsersChange(setAllUsers);
    return () => { unsub(); unsub2(); };
  }, [user]);

  const getChatName = (chat: Chat): string => {
    if (chat.participantNames) {
      const otherUid = chat.participants.find(p => p !== user?.uid);
      return otherUid ? chat.participantNames[otherUid] || otherUid : 'Unknown';
    }
    return chat.participants.find(p => p !== user?.uid) || 'Unknown';
  };

  const filteredUsers = allUsers.filter(u =>
    u.uid !== user?.uid && u.isActive &&
    (u.name.toLowerCase().includes(search.toLowerCase()) || u.phone.includes(search))
  );

  const startChat = async (otherUser: AppUser) => {
    setShowPicker(false);
    const existing = chats.find(c =>
      c.type === 'one_to_one' &&
      c.participants.includes(user!.uid) &&
      c.participants.includes(otherUser.uid)
    );
    if (existing) {
      navigation.navigate('ChatRoom', { chatId: existing.id, chat: existing });
    } else {
      const chatId = await dbService.createChat({
        participants: [user!.uid, otherUser.uid],
        participantNames: { [user!.uid]: appUser?.name || user!.uid, [otherUser.uid]: otherUser.name },
        type: 'one_to_one',
        createdAt: Date.now(),
      });
      const newChat: Chat = { id: chatId, participants: [user!.uid, otherUser.uid], participantNames: { [user!.uid]: appUser?.name || '', [otherUser.uid]: otherUser.name }, type: 'one_to_one', createdAt: Date.now() };
      navigation.navigate('ChatRoom', { chatId, chat: newChat });
    }
  };

  const renderItem = ({ item }: { item: Chat }) => (
    <TouchableOpacity style={styles.chatItem}
      onPress={() => navigation.navigate('ChatRoom', { chatId: item.id, chat: item })}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getChatName(item)[0]?.toUpperCase() || '?'}</Text>
      </View>
      <View style={styles.chatInfo}>
        <Text style={styles.chatName}>{getChatName(item)}</Text>
        <Text style={styles.lastMsg} numberOfLines={1}>{item.lastMessage || 'No messages yet'}</Text>
      </View>
      {item.lastMessageTime && (
        <Text style={styles.time}>{new Date(item.lastMessageTime).toLocaleDateString()}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList data={chats.filter(c => c.type === 'one_to_one')} renderItem={renderItem} keyExtractor={c => c.id}
        ListEmptyComponent={<Text style={styles.empty}>No chats yet. Tap + to start one.</Text>} />
      <TouchableOpacity style={styles.fab} onPress={() => setShowPicker(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
      <Modal visible={showPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Chat</Text>
            <TextInput style={styles.searchInput} placeholder="Search users..." placeholderTextColor="#666"
              value={search} onChangeText={setSearch} />
            <FlatList data={filteredUsers} renderItem={({ item }) => (
              <TouchableOpacity style={styles.userItem} onPress={() => startChat(item)}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{item.name[0]?.toUpperCase()}</Text></View>
                <View>
                  <Text style={styles.chatName}>{item.name}</Text>
                  <Text style={styles.lastMsg}>{item.phone}</Text>
                </View>
              </TouchableOpacity>
            )} keyExtractor={u => u.uid} />
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowPicker(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  chatItem: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: '#0f3460', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#e94560', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  chatInfo: { flex: 1 },
  chatName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  lastMsg: { color: '#aaa', fontSize: 13, marginTop: 2 },
  time: { color: '#666', fontSize: 11 },
  empty: { color: '#666', textAlign: 'center', marginTop: 60, fontSize: 16 },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#e94560', justifyContent: 'center', alignItems: 'center', elevation: 6 },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '300' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#16213e', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  searchInput: { backgroundColor: '#1a1a2e', borderRadius: 10, padding: 12, color: '#fff', fontSize: 14, marginBottom: 12, borderWidth: 1, borderColor: '#0f3460' },
  userItem: { flexDirection: 'row', padding: 12, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#0f3460' },
  cancelBtn: { padding: 16, alignItems: 'center', marginTop: 8 },
  cancelText: { color: '#e94560', fontSize: 16 },
});
