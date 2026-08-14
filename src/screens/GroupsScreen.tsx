import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/db';
import { Chat, AppUser } from '../types';

export default function GroupsScreen({ navigation }: any) {
  const { user, appUser } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsub = dbService.onUserChats(user.uid, setChats);
    const unsub2 = dbService.onUsersChange(setAllUsers);
    return () => { unsub(); unsub2(); };
  }, [user]);

  const toggleUser = (uid: string) => {
    setSelected(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);
  };

  const createGroup = async () => {
    if (!groupName.trim()) { Alert.alert('Error', 'Enter group name'); return; }
    if (selected.length === 0) { Alert.alert('Error', 'Select at least one member'); return; }
    const participants = [user!.uid, ...selected];
    const names: Record<string, string> = { [user!.uid]: appUser?.name || 'Admin' };
    allUsers.filter(u => participants.includes(u.uid)).forEach(u => { names[u.uid] = u.name; });
    await dbService.createChat({
      participants, participantNames: names,
      type: 'group', createdAt: Date.now(),
      groupName: groupName.trim(), groupAdmins: [user!.uid],
    });
    setShowCreate(false); setGroupName(''); setSelected([]);
  };

  const groups = chats.filter(c => c.type === 'group');

  return (
    <View style={styles.container}>
      <FlatList data={groups} renderItem={({ item }) => (
        <TouchableOpacity style={styles.groupItem} onPress={() => navigation.navigate('GroupChat', { chatId: item.id, chat: item })}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{item.groupName?.[0]?.toUpperCase() || 'G'}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.groupName}>{item.groupName || 'Unnamed'}</Text>
            <Text style={styles.memberCount}>{item.participants.length} members</Text>
          </View>
        </TouchableOpacity>
      )} keyExtractor={c => c.id}
        ListEmptyComponent={<Text style={styles.empty}>No groups yet. Tap + to create one.</Text>} />
      <TouchableOpacity style={styles.fab} onPress={() => setShowCreate(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
      <Modal visible={showCreate} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Group</Text>
            <TextInput style={styles.input} placeholder="Group name" placeholderTextColor="#666"
              value={groupName} onChangeText={setGroupName} />
            <Text style={styles.sectionTitle}>Add Members</Text>
            <FlatList data={allUsers.filter(u => u.uid !== user?.uid && u.isActive)}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.userRow} onPress={() => toggleUser(item.uid)}>
                  <View style={[styles.checkbox, selected.includes(item.uid) && styles.checked]}>
                    {selected.includes(item.uid) && <Text style={styles.checkMark}>✓</Text>}
                  </View>
                  <Text style={styles.userName}>{item.name}</Text>
                  <Text style={styles.userPhone}>{item.phone}</Text>
                </TouchableOpacity>
              )} keyExtractor={u => u.uid} style={{ maxHeight: 300 }} />
            <TouchableOpacity style={styles.createBtn} onPress={createGroup}>
              <Text style={styles.createBtnText}>Create Group</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowCreate(false)}>
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
  groupItem: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: '#0f3460', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#0f3460', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  groupName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  memberCount: { color: '#aaa', fontSize: 13, marginTop: 2 },
  empty: { color: '#666', textAlign: 'center', marginTop: 60, fontSize: 16 },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#e94560', justifyContent: 'center', alignItems: 'center', elevation: 6 },
  fabText: { color: '#fff', fontSize: 28 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#16213e', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  input: { backgroundColor: '#1a1a2e', borderRadius: 10, padding: 12, color: '#fff', fontSize: 14, marginBottom: 12, borderWidth: 1, borderColor: '#0f3460' },
  sectionTitle: { color: '#aaa', fontSize: 14, marginBottom: 8 },
  userRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderBottomColor: '#0f3460' },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: '#e94560', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  checked: { backgroundColor: '#e94560' },
  checkMark: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  userName: { color: '#fff', fontSize: 15, flex: 1 },
  userPhone: { color: '#aaa', fontSize: 12 },
  createBtn: { backgroundColor: '#e94560', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 12 },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelText: { color: '#e94560', textAlign: 'center', marginTop: 12, fontSize: 14 },
});
