import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Alert, Modal, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/db';
import { Status } from '../types';

export default function StatusScreen({ navigation }: any) {
  const { user, appUser } = useAuth();
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [statusText, setStatusText] = useState('');

  useEffect(() => {
    const unsub = dbService.onStatuses((sts) => setStatuses(sts));
    return unsub;
  }, []);

  const myStatuses = statuses.filter(s => s.userId === user?.uid).sort((a, b) => b.timestamp - a.timestamp);
  const othersStatuses = statuses.filter(s => s.userId !== user?.uid);
  const groupedByUser = othersStatuses.reduce<Record<string, Status[]>>((acc, s) => {
    if (!acc[s.userId]) acc[s.userId] = [];
    acc[s.userId].push(s);
    return acc;
  }, {});

  const addTextStatus = async () => {
    if (!statusText.trim()) { Alert.alert('Error', 'Enter status text'); return; }
    await dbService.postStatus({
      userId: user!.uid, userName: appUser?.name || 'User', userPhoto: appUser?.photoURL,
      type: 'text', content: statusText.trim(),
      timestamp: Date.now(), expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      viewers: [], loves: [],
    });
    setShowAdd(false); setStatusText('');
  };

  const addMediaStatus = async (type: 'image' | 'video') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: type === 'image' ? ['images'] : ['videos'], quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const url = await dbService.uploadMedia(asset.uri, `status/${user!.uid}/${Date.now()}`);
      await dbService.postStatus({
        userId: user!.uid, userName: appUser?.name || 'User', userPhoto: appUser?.photoURL,
        type, content: type === 'image' ? '[Image]' : '[Video]', mediaURL: url,
        timestamp: Date.now(), expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        viewers: [], loves: [],
      });
    }
  };

  const viewStatuses = (statusList: Status[], index = 0) => {
    navigation.navigate('StatusViewer', { statuses: statusList, initialIndex: index });
  };

  return (
    <View style={styles.container}>
      <ScrollView>
        <Text style={styles.sectionTitle}>My Status</Text>
        {myStatuses.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusRow}>
            {myStatuses.map((s, i) => (
              <TouchableOpacity key={s.id} style={styles.statusCard} onPress={() => viewStatuses(myStatuses, i)}>
                <View style={styles.statusAvatar}>
                  <Text style={styles.statusAvatarText}>{appUser?.name?.[0]?.toUpperCase() || 'U'}</Text>
                </View>
                <Text style={styles.statusType}>{s.type}</Text>
                <Text style={styles.statusTime}>{new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.empty}>No status yet</Text>
        )}

        <Text style={styles.sectionTitle}>Recent Updates</Text>
        {Object.entries(groupedByUser).map(([userId, sts]) => (
          <TouchableOpacity key={userId} style={styles.userStatusRow} onPress={() => viewStatuses(sts)}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>{sts[0].userName[0]?.toUpperCase() || '?'}</Text>
            </View>
            <View>
              <Text style={styles.userStatusName}>{sts[0].userName}</Text>
              <Text style={styles.statusCount}>{sts.length} update{sts.length > 1 ? 's' : ''}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setShowAdd(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Status</Text>
            <TextInput style={styles.textInput} placeholder="What's on your mind?" placeholderTextColor="#666"
              value={statusText} onChangeText={setStatusText} multiline />
            <TouchableOpacity style={styles.addBtn} onPress={addTextStatus}>
              <Text style={styles.addBtnText}>Post Text Status</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mediaBtn} onPress={() => addMediaStatus('image')}>
              <Text style={styles.mediaBtnText}>📷 Add Image</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mediaBtn} onPress={() => addMediaStatus('video')}>
              <Text style={styles.mediaBtnText}>🎥 Add Video</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowAdd(false)}>
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
  sectionTitle: { color: '#aaa', fontSize: 14, padding: 16, paddingBottom: 8, fontWeight: '600' },
  statusRow: { paddingLeft: 12, marginBottom: 16 },
  statusCard: { alignItems: 'center', marginRight: 16, width: 80 },
  statusAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#e94560', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#0f3460' },
  statusAvatarText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  statusType: { color: '#fff', fontSize: 12, marginTop: 4 },
  statusTime: { color: '#666', fontSize: 10 },
  empty: { color: '#666', textAlign: 'center', padding: 20 },
  userStatusRow: { flexDirection: 'row', padding: 12, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#0f3460' },
  userAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#e94560', justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 2, borderColor: '#0f3460' },
  userAvatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  userStatusName: { color: '#fff', fontSize: 16, fontWeight: '500' },
  statusCount: { color: '#aaa', fontSize: 12, marginTop: 2 },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#e94560', justifyContent: 'center', alignItems: 'center', elevation: 6 },
  fabText: { color: '#fff', fontSize: 28 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#16213e', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  textInput: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 14, color: '#fff', fontSize: 15, minHeight: 80, borderWidth: 1, borderColor: '#0f3460', marginBottom: 12 },
  addBtn: { backgroundColor: '#e94560', borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 8 },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  mediaBtn: { backgroundColor: '#0f3460', borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 8 },
  mediaBtnText: { color: '#fff', fontSize: 15 },
  cancelText: { color: '#e94560', textAlign: 'center', marginTop: 12 },
});
