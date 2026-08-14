import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { dbService } from '../services/db';
import { Invite } from '../types';

export default function InviteScreen({ route, navigation }: any) {
  const inviteId = route?.params?.inviteId || '';
  const [invite, setInvite] = useState<Invite | null>(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    if (!inviteId) { setLoading(false); return; }
    dbService.getInvite(inviteId).then(inv => {
      setInvite(inv);
      setLoading(false);
    });
  }, [inviteId]);

  if (loading) return <View style={styles.container}><ActivityIndicator color="#e94560" /></View>;

  if (!invite) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Enter Invite Code</Text>
        <Text style={styles.info}>Paste your invite link or enter the invite ID</Text>
        <TouchableOpacity style={styles.button} onPress={() => { /* handle paste */ Alert.alert('Info', 'Open invite link from the invitation message'); }}>
          <Text style={styles.buttonText}>Open Invite Link</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const expired = invite.expiresAt < Date.now();
  const used = invite.used;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Invitation</Text>
      <Text style={styles.info}>Phone: {invite.phone}</Text>
      <Text style={styles.info}>Type: {invite.type === 'registration' ? 'Registration' : 'Password Reset'}</Text>
      <Text style={styles.info}>Expires: {new Date(invite.expiresAt).toLocaleString()}</Text>
      {expired && <Text style={styles.warning}>This invite has expired</Text>}
      {used && <Text style={styles.warning}>This invite has been used</Text>}
      {!expired && !used && (
        <TouchableOpacity style={styles.button}
          onPress={() => {
            if (invite.type === 'registration') navigation.navigate('Register', { inviteId });
            else navigation.navigate('ResetPassword', { inviteId });
          }}>
          <Text style={styles.buttonText}>
            {invite.type === 'registration' ? 'Register Now' : 'Reset Password'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#e94560', marginBottom: 24 },
  info: { color: '#fff', fontSize: 16, marginBottom: 8, textAlign: 'center' },
  warning: { color: '#ff6b6b', fontSize: 14, marginTop: 8 },
  button: { backgroundColor: '#e94560', borderRadius: 12, padding: 16, paddingHorizontal: 40, marginTop: 24 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});
