import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/db';
import { AppUser } from '../types';

export default function BroadcastCreateScreen({ navigation }: any) {
  const { user, appUser } = useAuth();
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [name, setName] = useState('');

  React.useEffect(() => {
    const unsub = dbService.onUsersChange(setAllUsers);
    return unsub;
  }, []);

  const toggle = (uid: string) => {
    setSelected(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);
  };

  const create = async () => {
    if (!name.trim()) { Alert.alert('Error', 'Enter broadcast name'); return; }
    if (selected.length === 0) { Alert.alert('Error', 'Select at least one recipient'); return; }
    const participants = [user!.uid, ...selected];
    const names: Record<string, string> = { [user!.uid]: appUser?.name || 'Broadcaster' };
    allUsers.filter(u => participants.includes(u.uid)).forEach(u => { names[u.uid] = u.name; });
    await dbService.createChat({
      participants, participantNames: names,
      type: 'broadcast', createdAt: Date.now(),
      groupName: name.trim(), broadcastCreator: user!.uid,
    });
    navigation.goBack();
  };

  const available = allUsers.filter(u => u.uid !== user?.uid && u.isActive);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>New Broadcast</Text>
      <TextInput style={styles.input} placeholder="Broadcast name" placeholderTextColor="#666"
        value={name} onChangeText={setName} />
      <Text style={styles.sectionTitle}>Select Recipients ({selected.length})</Text>
      <FlatList data={available} renderItem={({ item }) => (
        <TouchableOpacity style={styles.userRow} onPress={() => toggle(item.uid)}>
          <View style={[styles.checkbox, selected.includes(item.uid) && styles.checked]}>
            {selected.includes(item.uid) && <Text style={styles.checkMark}>✓</Text>}
          </View>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userPhone}>{item.phone}</Text>
        </TouchableOpacity>
      )} keyExtractor={u => u.uid} />
      <TouchableOpacity style={styles.createBtn} onPress={create}>
        <Text style={styles.createBtnText}>Create Broadcast</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e', padding: 16 },
  title: { color: '#e94560', fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  input: { backgroundColor: '#16213e', borderRadius: 10, padding: 14, color: '#fff', fontSize: 15, marginBottom: 16, borderWidth: 1, borderColor: '#0f3460' },
  sectionTitle: { color: '#aaa', fontSize: 14, marginBottom: 8 },
  userRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#0f3460' },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: '#e94560', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  checked: { backgroundColor: '#e94560' },
  checkMark: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  userName: { color: '#fff', fontSize: 15, flex: 1 },
  userPhone: { color: '#aaa', fontSize: 12 },
  createBtn: { backgroundColor: '#e94560', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 20 },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
