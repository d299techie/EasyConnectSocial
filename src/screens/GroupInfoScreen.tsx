import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Switch, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/db';
import { AppUser } from '../types';

export default function GroupInfoScreen({ route, navigation }: any) {
  const { chatId, chat } = route.params;
  const { user, appUser } = useAuth();
  const [members, setMembers] = useState<AppUser[]>([]);
  const [isAdminOnly, setIsAdminOnly] = useState(chat.adminOnlyPost || false);
  const isAdmin = chat.groupAdmins?.includes(user?.uid || '');
  const isCreator = chat.participants[0] === user?.uid;

  useEffect(() => {
    Promise.all(chat.participants.map((uid: string) => dbService.getUser(uid)))
      .then(users => setMembers(users.filter(Boolean) as AppUser[]));
  }, []);

  const toggleAdmin = async (uid: string) => {
    if (!isAdmin) { Alert.alert('Restricted', 'Only admins can manage'); return; }
    const admins = chat.groupAdmins || [];
    const updated = admins.includes(uid) ? admins.filter((a: string) => a !== uid) : [...admins, uid];
    await dbService.updateChat(chatId, { groupAdmins: updated });
    chat.groupAdmins = updated;
  };

  const removeMember = async (uid: string) => {
    if (!isAdmin) { Alert.alert('Restricted', 'Only admins can remove members'); return; }
    Alert.alert('Remove', 'Remove this member?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        const updated = chat.participants.filter((p: string) => p !== uid);
        await dbService.updateChat(chatId, { participants: updated });
        chat.participants = updated;
      }},
    ]);
  };

  const toggleAdminPost = async (val: boolean) => {
    if (!isAdmin) return;
    setIsAdminOnly(val);
    await dbService.updateChat(chatId, { adminOnlyPost: val });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.bigAvatar}>
          <Text style={styles.bigAvatarText}>{chat.groupName?.[0]?.toUpperCase() || 'G'}</Text>
        </View>
        <Text style={styles.groupName}>{chat.groupName || 'Group'}</Text>
        <Text style={styles.memberCount}>{members.length} members</Text>
      </View>
      {isAdmin && (
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Admin only posts</Text>
          <Switch value={isAdminOnly} onValueChange={toggleAdminPost} trackColor={{ false: '#0f3460', true: '#e94560' }} />
        </View>
      )}
      <Text style={styles.sectionTitle}>Members</Text>
      <FlatList data={members} renderItem={({ item }) => {
        const isMemberAdmin = chat.groupAdmins?.includes(item.uid);
        return (
          <View style={styles.memberRow}>
            <View style={styles.memberAvatar}>
              <Text style={styles.memberAvatarText}>{item.name[0]?.toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.memberName}>{item.name} {isMemberAdmin && '(Admin)'}</Text>
              <Text style={styles.memberPhone}>{item.phone}</Text>
            </View>
            {isAdmin && item.uid !== user?.uid && (
              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity style={styles.smallBtn} onPress={() => toggleAdmin(item.uid)}>
                  <Text style={styles.smallBtnText}>{isMemberAdmin ? 'Demote' : 'Admin'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.smallBtn, { backgroundColor: '#ff6b6b', marginLeft: 4 }]} onPress={() => removeMember(item.uid)}>
                  <Text style={styles.smallBtnText}>Remove</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      }} keyExtractor={item => item.uid} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  header: { alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: '#0f3460' },
  bigAvatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#0f3460', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  bigAvatarText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  groupName: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  memberCount: { color: '#aaa', fontSize: 14, marginTop: 4 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#0f3460' },
  settingLabel: { color: '#fff', fontSize: 16 },
  sectionTitle: { color: '#aaa', fontSize: 14, padding: 16, paddingBottom: 8 },
  memberRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#0f3460' },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e94560', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  memberAvatarText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  memberName: { color: '#fff', fontSize: 15, fontWeight: '500' },
  memberPhone: { color: '#aaa', fontSize: 12 },
  smallBtn: { backgroundColor: '#0f3460', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  smallBtnText: { color: '#fff', fontSize: 12 },
});
