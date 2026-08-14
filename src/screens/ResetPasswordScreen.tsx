import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { updatePassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';
import { dbService } from '../services/db';

export default function ResetPasswordScreen({ route, navigation }: any) {
  const inviteId = route?.params?.inviteId || '';
  const [phone, setPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (newPassword.length < 6) { Alert.alert('Error', 'Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const email = `${phone}@easyconnect.app`;
      if (inviteId) {
        const invite = await dbService.getInvite(inviteId);
        if (!invite || invite.used || invite.expiresAt < Date.now()) {
          Alert.alert('Invalid', 'Invite is invalid or expired'); setLoading(false); return;
        }
        const cred = await signInWithEmailAndPassword(auth, email, currentPassword || 'temporary');
        await updatePassword(cred.user, newPassword);
        await dbService.useInvite(inviteId, cred.user.uid);
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, currentPassword);
        await updatePassword(cred.user, newPassword);
      }
      Alert.alert('Success', 'Password reset successfully');
      navigation.navigate('Login');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset Password</Text>
      <TextInput style={styles.input} placeholder="Phone number" placeholderTextColor="#666"
        value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <TextInput style={styles.input} placeholder="Current password" placeholderTextColor="#666"
        value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />
      <TextInput style={styles.input} placeholder="New password (min 6 chars)" placeholderTextColor="#666"
        value={newPassword} onChangeText={setNewPassword} secureTextEntry />
      <TouchableOpacity style={styles.button} onPress={handleReset} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Reset Password</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>Back to Sign In</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e', justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#e94560', textAlign: 'center', marginBottom: 40 },
  input: { backgroundColor: '#16213e', borderRadius: 12, padding: 16, fontSize: 16, color: '#fff', marginBottom: 16, borderWidth: 1, borderColor: '#0f3460' },
  button: { backgroundColor: '#e94560', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  link: { color: '#e94560', textAlign: 'center', marginTop: 20 },
});
