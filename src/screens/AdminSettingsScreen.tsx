import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Alert, ScrollView } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/db';
import { AppUser, PasswordResetRequest } from '../types';

export default function AdminSettingsScreen({ navigation }: any) {
  const { appUser } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [resetReqs, setResetReqs] = useState<PasswordResetRequest[]>([]);
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [tab, setTab] = useState<'users' | 'invite' | 'resets'>('users');

  const isSuperUser = appUser?.role === 'super_user' || appUser?.role === 'admin';

  useEffect(() => {
    const unsub = dbService.onUsersChange(setUsers);
    const unsub2 = dbService.onResetRequests(setResetReqs);
    return () => { unsub(); unsub2(); };
  }, []);

  const createInvite = async () => {
    if (!invitePhone.trim()) { Alert.alert('Error', 'Enter a phone number'); return; }
    const id = await dbService.createInvite({
      phone: invitePhone.trim(),
      type: 'registration',
      createdBy: appUser!.uid,
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      used: false,
    });
    const link = `easyconnectsocial://invite/${id}`;
    setInviteLink(link);
    await Clipboard.setStringAsync(link);
    Alert.alert('Invite Created', `Link copied to clipboard: ${link}`);
    setInvitePhone('');
  };

  const promoteToSuper = async (uid: string) => {
    if (appUser?.role !== 'admin') { Alert.alert('Restricted', 'Only admin can promote'); return; }
    await dbService.updateUser(uid, { role: 'super_user' });
  };

  const demoteToUser = async (uid: string) => {
    await dbService.updateUser(uid, { role: 'user' });
  };

  const handleResetRequest = async (req: PasswordResetRequest) => {
    const id = await dbService.createInvite({
      phone: req.phone,
      type: 'password_reset',
      createdBy: appUser!.uid,
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      used: false,
    });
    await dbService.resolveResetRequest(req.id, appUser!.uid);
    const link = `easyconnectsocial://invite/${id}`;
    await Clipboard.setStringAsync(link);
    Alert.alert('Reset Link', `Password reset link copied to clipboard: ${link}`);
  };

  if (!isSuperUser) {
    return (
      <View style={styles.container}>
        <Text style={styles.restricted}>Access restricted to admin and super users</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'users' && styles.activeTab]} onPress={() => setTab('users')}>
          <Text style={[styles.tabText, tab === 'users' && styles.activeTabText]}>Users</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'invite' && styles.activeTab]} onPress={() => setTab('invite')}>
          <Text style={[styles.tabText, tab === 'invite' && styles.activeTabText]}>Invite</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'resets' && styles.activeTab]} onPress={() => setTab('resets')}>
          <Text style={[styles.tabText, tab === 'resets' && styles.activeTabText]}>Resets</Text>
        </TouchableOpacity>
      </View>

      {tab === 'users' && (
        <FlatList data={users} renderItem={({ item }) => {
          const isMe = item.uid === appUser?.uid;
          return (
            <View style={styles.userRow}>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.name} {isMe && '(You)'}</Text>
                <Text style={styles.userPhone}>{item.phone} — {item.role.replace('_', ' ')}</Text>
              </View>
              {!isMe && appUser?.role === 'admin' && (
                <View style={{ flexDirection: 'row' }}>
                  {item.role !== 'super_user' && (
                    <TouchableOpacity style={styles.smallBtn} onPress={() => promoteToSuper(item.uid)}>
                      <Text style={styles.smallBtnText}>Promote</Text>
                    </TouchableOpacity>
                  )}
                  {item.role === 'super_user' && (
                    <TouchableOpacity style={[styles.smallBtn, { backgroundColor: '#ff6b6b' }]} onPress={() => demoteToUser(item.uid)}>
                      <Text style={styles.smallBtnText}>Demote</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        }} keyExtractor={u => u.uid} />
      )}

      {tab === 'invite' && (
        <View style={{ padding: 16 }}>
          <Text style={styles.sectionTitle}>Create Invitation Link</Text>
          <TextInput style={styles.input} placeholder="Enter phone number" placeholderTextColor="#666"
            value={invitePhone} onChangeText={setInvitePhone} keyboardType="phone-pad" />
          <TouchableOpacity style={styles.createBtn} onPress={createInvite}>
            <Text style={styles.createBtnText}>Generate Invite Link</Text>
          </TouchableOpacity>
          {inviteLink ? (
            <View style={styles.linkBox}>
              <Text style={styles.linkLabel}>Invite link (copied):</Text>
              <Text style={styles.linkText} selectable>{inviteLink}</Text>
              <TouchableOpacity onPress={() => { Clipboard.setStringAsync(inviteLink); Alert.alert('Copied!'); }}>
                <Text style={styles.copyBtn}>Copy again</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      )}

      {tab === 'resets' && (
        <FlatList data={resetReqs} renderItem={({ item, index }) => (
          <View style={styles.userRow}>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{item.userName}</Text>
              <Text style={styles.userPhone}>{item.phone} — {new Date(item.requestedAt).toLocaleString()}</Text>
            </View>
            <TouchableOpacity style={styles.resolveBtn} onPress={() => handleResetRequest(item)}>
              <Text style={styles.resolveBtnText}>Resolve</Text>
            </TouchableOpacity>
          </View>
        )} keyExtractor={(item, index) => item.id || `req-${index}`}
          ListEmptyComponent={<Text style={styles.empty}>No pending reset requests</Text>} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  restricted: { color: '#aaa', textAlign: 'center', marginTop: 60, fontSize: 16 },
  tabs: { flexDirection: 'row', backgroundColor: '#16213e', borderBottomWidth: 1, borderBottomColor: '#0f3460' },
  tab: { flex: 1, padding: 14, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#e94560' },
  tabText: { color: '#aaa', fontSize: 14 },
  activeTabText: { color: '#e94560', fontWeight: '600' },
  userRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#0f3460' },
  userInfo: { flex: 1 },
  userName: { color: '#fff', fontSize: 15, fontWeight: '500' },
  userPhone: { color: '#aaa', fontSize: 12, marginTop: 2 },
  smallBtn: { backgroundColor: '#0f3460', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, marginLeft: 4 },
  smallBtnText: { color: '#fff', fontSize: 12 },
  resolveBtn: { backgroundColor: '#e94560', borderRadius: 6, paddingHorizontal: 14, paddingVertical: 8 },
  resolveBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  input: { backgroundColor: '#16213e', borderRadius: 10, padding: 14, color: '#fff', fontSize: 15, borderWidth: 1, borderColor: '#0f3460', marginBottom: 12 },
  createBtn: { backgroundColor: '#e94560', borderRadius: 10, padding: 14, alignItems: 'center' },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  linkBox: { backgroundColor: '#16213e', borderRadius: 10, padding: 16, marginTop: 16 },
  linkLabel: { color: '#aaa', fontSize: 13, marginBottom: 8 },
  linkText: { color: '#e94560', fontSize: 14 },
  copyBtn: { color: '#e94560', fontSize: 14, marginTop: 8, fontWeight: '600' },
  empty: { color: '#666', textAlign: 'center', marginTop: 40, fontSize: 14 },
});
