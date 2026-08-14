import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal, FlatList, Dimensions, TextInput } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/db';
import { Status } from '../types';

const { width, height } = Dimensions.get('window');

export default function StatusViewerScreen({ route, navigation }: any) {
  const { statuses, initialIndex = 0 } = route.params;
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showViewers, setShowViewers] = useState(false);
  const [progress, setProgress] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const status = statuses[currentIndex];
  const isMine = status.userId === user?.uid;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isMine && status?.id) dbService.addStatusViewer(status.id, user!.uid);
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [currentIndex]);

  const startTimer = () => {
    setProgress(0);
    const duration = status.type === 'text' ? 5000 : 10000;
    const interval = 100;
    timerRef.current = setInterval(() => {
      setProgress(prev => {
        const next = prev + (interval / duration) * 100;
        if (next >= 100) {
          clearInterval(timerRef.current);
          goNext();
        }
        return next;
      });
    }, interval);
  };

  const goNext = () => {
    if (currentIndex < statuses.length - 1) setCurrentIndex(currentIndex + 1);
    else navigation.goBack();
  };

  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const toggleLove = async () => {
    await dbService.loveStatus(status.id, user!.uid);
  };

  const handleEdit = async () => {
    if (!editText.trim()) return;
    const elapsed = Date.now() - status.timestamp;
    if (elapsed > 10 * 60 * 1000) { Alert.alert('Expired', 'Can only edit within 10 minutes'); return; }
    if (status.type !== 'text') { Alert.alert('Error', 'Only text statuses can be edited'); return; }
    await dbService.editStatus(status.id, editText.trim());
    setEditing(false);
  };

  const handleDelete = () => {
    Alert.alert('Delete', 'Delete this status?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await dbService.deleteStatus(status.id);
        navigation.goBack();
      }},
    ]);
  };

  const hasLoved = status.loves?.includes(user?.uid || '');

  return (
    <View style={styles.container}>
      <View style={styles.progressBar}>
        {statuses.map((s: Status, i: number) => (
          <View key={s.id} style={[styles.progressSegment, i === currentIndex && { flex: 1, backgroundColor: '#fff' }]} />
        ))}
      </View>

      <View style={styles.topBar}>
        <Text style={styles.userName}>{status.userName}</Text>
        <Text style={styles.time}>{new Date(status.timestamp).toLocaleTimeString()}</Text>
      </View>

      <TouchableOpacity style={styles.contentArea} activeOpacity={1} onPress={goNext} onLongPress={() => {}}>
        <Text style={styles.statusText}>{status.content}</Text>
        {status.editedAt && <Text style={styles.edited}>edited</Text>}
      </TouchableOpacity>

      <View style={styles.bottomBar}>
        <TouchableOpacity onPress={toggleLove} style={styles.action}>
          <Text style={[styles.actionIcon, hasLoved && { color: '#e94560' }]}>❤️</Text>
          <Text style={styles.actionCount}>{status.loves?.length || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowViewers(true)} style={styles.action}>
          <Text style={styles.actionIcon}>👁️</Text>
          <Text style={styles.actionCount}>{status.viewers?.length || 0}</Text>
        </TouchableOpacity>
        {isMine && status.type === 'text' && (
          <TouchableOpacity onPress={() => { setEditText(status.content); setEditing(true); }} style={styles.action}>
            <Text style={styles.actionIcon}>✏️</Text>
          </TouchableOpacity>
        )}
        {isMine && (
          <TouchableOpacity onPress={handleDelete} style={styles.action}>
            <Text style={styles.actionIcon}>🗑️</Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal visible={showViewers} transparent>
        <View style={styles.viewerOverlay}>
          <View style={styles.viewerContent}>
            <Text style={styles.viewerTitle}>Viewers</Text>
            {status.viewers?.map((v: string) => (
              <Text key={v} style={styles.viewerName}>{v}</Text>
            ))}
            {(!status.viewers || status.viewers.length === 0) && (
              <Text style={styles.noViewers}>No views yet</Text>
            )}
            <TouchableOpacity onPress={() => setShowViewers(false)}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={editing} transparent>
        <View style={styles.viewerOverlay}>
          <View style={styles.viewerContent}>
            <Text style={styles.viewerTitle}>Edit Status</Text>
            <TextInput style={styles.editInput} value={editText} onChangeText={setEditText} multiline />
            <TouchableOpacity style={styles.saveBtn} onPress={handleEdit}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setEditing(false)}>
              <Text style={styles.closeText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
        <Text style={styles.closeBtnText}>✕</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.prevArea} onPress={goPrev} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  progressBar: { flexDirection: 'row', paddingHorizontal: 8, paddingTop: 50, gap: 4 },
  progressSegment: { flex: 1, height: 3, backgroundColor: '#333', borderRadius: 2 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, alignItems: 'center' },
  userName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  time: { color: '#aaa', fontSize: 12 },
  contentArea: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  statusText: { color: '#fff', fontSize: 24, textAlign: 'center', lineHeight: 34 },
  edited: { color: '#666', fontSize: 12, marginTop: 8 },
  bottomBar: { flexDirection: 'row', justifyContent: 'center', padding: 20, gap: 32 },
  action: { alignItems: 'center' },
  actionIcon: { fontSize: 24 },
  actionCount: { color: '#aaa', fontSize: 12, marginTop: 2 },
  viewerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  viewerContent: { backgroundColor: '#16213e', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '60%' },
  viewerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  viewerName: { color: '#aaa', fontSize: 14, paddingVertical: 6 },
  noViewers: { color: '#666', fontSize: 14, paddingVertical: 12 },
  closeText: { color: '#e94560', textAlign: 'center', marginTop: 16, fontSize: 16 },
  editInput: { backgroundColor: '#1a1a2e', borderRadius: 10, padding: 12, color: '#fff', fontSize: 15, minHeight: 60, borderWidth: 1, borderColor: '#0f3460' },
  saveBtn: { backgroundColor: '#e94560', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 12 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  closeBtn: { position: 'absolute', top: 50, right: 16 },
  closeBtnText: { color: '#fff', fontSize: 24 },
  prevArea: { position: 'absolute', left: 0, top: 100, bottom: 100, width: width * 0.3 },
});
