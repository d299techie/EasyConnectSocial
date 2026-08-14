import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, Image } from 'react-native';
import { signOut, deleteUser } from 'firebase/auth';
import { auth } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/db';

export default function ProfileScreen({ navigation }: any) {
  const { appUser, refreshUser } = useAuth();

  if (!appUser) return null;

  const handleDeactivate = () => {
    Alert.alert('Deactivate Account', 'Your account will be deactivated. Your data remains. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Deactivate', style: 'destructive', onPress: async () => {
        await dbService.updateUser(appUser.uid, { isActive: false });
        await signOut(auth);
      }},
    ]);
  };

  const handleDelete = () => {
    Alert.alert('Delete Account', 'Your account and all data will be permanently deleted. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        if (auth.currentUser) {
          await dbService.updateUser(appUser.uid, { isActive: false });
          await deleteUser(auth.currentUser);
        }
      }},
    ]);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', onPress: () => signOut(auth) },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24, alignItems: 'center' }}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{appUser.name[0]?.toUpperCase() || 'U'}</Text>
      </View>
      <Text style={styles.name}>{appUser.name}</Text>
      <Text style={styles.phone}>{appUser.phone}</Text>
      <View style={styles.roleBadge}>
        <Text style={styles.roleText}>{appUser.role.toUpperCase().replace('_', ' ')}</Text>
      </View>

      {appUser.role === 'admin' || appUser.role === 'super_user' ? (
        <TouchableOpacity style={styles.adminBtn} onPress={() => navigation.navigate('AdminSettings')}>
          <Text style={styles.adminBtnText}>⚙️ Admin Settings</Text>
        </TouchableOpacity>
      ) : null}

      <View style={styles.divider} />

      <TouchableOpacity style={styles.dangerBtn} onPress={handleDeactivate}>
        <Text style={styles.dangerBtnText}>Deactivate Account</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.dangerBtn} onPress={handleDelete}>
        <Text style={[styles.dangerBtnText, { color: '#ff4444' }]}>Delete Account</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#e94560', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  avatarText: { color: '#fff', fontSize: 40, fontWeight: 'bold' },
  name: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  phone: { color: '#aaa', fontSize: 16, marginTop: 4 },
  roleBadge: { backgroundColor: '#0f3460', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 6, marginTop: 12 },
  roleText: { color: '#e94560', fontSize: 12, fontWeight: '600' },
  adminBtn: { backgroundColor: '#0f3460', borderRadius: 12, padding: 14, paddingHorizontal: 32, marginTop: 24 },
  adminBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#0f3460', width: '100%', marginVertical: 32 },
  dangerBtn: { padding: 14, marginBottom: 8, width: '100%', alignItems: 'center' },
  dangerBtnText: { color: '#ff6b6b', fontSize: 16 },
  signOutBtn: { padding: 14, marginTop: 16, width: '100%', alignItems: 'center', backgroundColor: '#16213e', borderRadius: 12 },
  signOutText: { color: '#aaa', fontSize: 16 },
});
