import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image, ScrollView } from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';
import { dbService } from '../services/db';
import { Invite, AppUser } from '../types';

export default function RegisterScreen({ route, navigation }: any) {
  const inviteId = route?.params?.inviteId || '';
  const [invite, setInvite] = useState<Invite | null>(null);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  React.useEffect(() => {
    if (inviteId) {
      dbService.getInvite(inviteId).then(inv => {
        if (!inv) { Alert.alert('Invalid', 'Invite not found'); return; }
        if (inv.used) { Alert.alert('Used', 'This invite has been used'); return; }
        if (inv.expiresAt < Date.now()) { Alert.alert('Expired', 'This invite has expired'); return; }
        setInvite(inv);
        setPhone(inv.phone);
      }).finally(() => setChecking(false));
    } else {
      setChecking(false);
    }
  }, [inviteId]);

  const handleRegister = async () => {
    if (!name.trim()) { Alert.alert('Error', 'Enter your name'); return; }
    if (password.length < 6) { Alert.alert('Error', 'Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const email = `${phone}@easyconnect.app`;
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user: AppUser = {
        uid: cred.user.uid,
        phone,
        name: name.trim(),
        role: 'user',
        isActive: true,
        createdAt: Date.now(),
      };
      await dbService.createUser(user);
      if (invite && inviteId) await dbService.useInvite(inviteId, cred.user.uid);
    } catch (e: any) {
      Alert.alert('Registration Failed', e.message);
    }
    setLoading(false);
  };

  if (checking) return <View style={styles.container}><ActivityIndicator color="#e94560" /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24, flexGrow: 1, justifyContent: 'center' }}>
      <Text style={styles.title}>Create Account</Text>
      {invite && <Text style={styles.info}>Invited phone: {invite.phone}</Text>}
      <TextInput style={styles.input} placeholder="Phone number" placeholderTextColor="#666"
        value={phone} onChangeText={setPhone} keyboardType="phone-pad" editable={!invite} />
      <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor="#666"
        value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Password (min 6 chars)" placeholderTextColor="#666"
        value={password} onChangeText={setPassword} secureTextEntry />
      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Register</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>Already have an account? Sign in</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#e94560', textAlign: 'center', marginBottom: 24 },
  info: { color: '#aaa', textAlign: 'center', marginBottom: 16 },
  input: { backgroundColor: '#16213e', borderRadius: 12, padding: 16, fontSize: 16, color: '#fff', marginBottom: 16, borderWidth: 1, borderColor: '#0f3460' },
  button: { backgroundColor: '#e94560', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  link: { color: '#e94560', textAlign: 'center', marginTop: 8 },
});
