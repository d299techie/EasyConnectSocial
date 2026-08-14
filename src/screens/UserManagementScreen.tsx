import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/db';
import { AppUser } from '../types';

export default function UserManagementScreen({ navigation }: any) {
  const { appUser } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const unsub = dbService.onUsersChange(setUsers);
    return unsub;
  }, []);

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.phone.includes(search)
  );

  const handleAction = (user: AppUser) => {
    if (appUser?.role !== 'admin') { Alert.alert('Restricted', 'Only admin can manage users'); return; }
    Alert.alert(user.name, `Role: ${user.role}\nActive: ${user.isActive}`, [
      { text: 'Cancel', style: 'cancel' },
      ...(user.role !== 'super_user' ? [{ text: 'Promote to Super', onPress: () => dbService.updateUser(user.uid, { role: 'super_user' }) }] : []),
      ...(user.role === 'super_user' ? [{ text: 'Demote to User', onPress: () => dbService.updateUser(user.uid, { role: 'user' }) }] : []),
      ...(user.isActive ? [{ text: 'Deactivate', style: 'destructive' as const, onPress: () => dbService.updateUser(user.uid, { isActive: false }) }] : []),
      ...(!user.isActive ? [{ text: 'Activate', onPress: () => dbService.updateUser(user.uid, { isActive: true }) }] : []),
    ]);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return '#e94560';
      case 'super_user': return '#ffd700';
      default: return '#0f3460';
    }
  };

  return (
    <View style={styles.container}>
      <TextInput style={styles.searchInput} placeholder="Search by name or phone..." placeholderTextColor="#666"
        value={search} onChangeText={setSearch} />
      <FlatList data={filtered} renderItem={({ item }) => (
        <TouchableOpacity style={styles.userRow} onPress={() => handleAction(item)}>
          <View style={[styles.avatar, { backgroundColor: getRoleColor(item.role) }]}>
            <Text style={styles.avatarText}>{item.name[0]?.toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{item.name}</Text>
            <Text style={styles.userPhone}>{item.phone}</Text>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) }]}>
            <Text style={styles.roleText}>{item.role.replace('_', ' ')}</Text>
          </View>
          {!item.isActive && <Text style={styles.inactive}>Inactive</Text>}
        </TouchableOpacity>
      )} keyExtractor={u => u.uid} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e', padding: 12 },
  searchInput: { backgroundColor: '#16213e', borderRadius: 10, padding: 12, color: '#fff', fontSize: 14, marginBottom: 12, borderWidth: 1, borderColor: '#0f3460' },
  userRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#0f3460' },
  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  userName: { color: '#fff', fontSize: 15, fontWeight: '500' },
  userPhone: { color: '#aaa', fontSize: 12 },
  roleBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 8 },
  roleText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  inactive: { color: '#ff6b6b', fontSize: 11, marginLeft: 8 },
});
