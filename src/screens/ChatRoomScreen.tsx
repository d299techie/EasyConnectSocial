import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Modal, Image } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/db';
import { ChatMessage } from '../types';

export default function ChatRoomScreen({ route, navigation }: any) {
  const { chatId, chat } = route.params;
  const { user, appUser } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [showActions, setShowActions] = useState<ChatMessage | null>(null);
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    const unsub = dbService.onMessages(chatId, (msgs) => {
      const filtered = msgs.filter(m => !m.deletedFor.includes(user?.uid || '') && !m.deletedForAll);
      setMessages(filtered);
      setLoading(false);
    });
    return unsub;
  }, [chatId]);

  useEffect(() => {
    if (messages.length > 0) setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 200);
  }, [messages.length]);

  const sendText = async () => {
    if (!input.trim()) return;
    const text = input.trim();
    setInput('');
    try {
      await dbService.sendMessage(chatId, user!.uid, appUser?.name || 'User', 'text', text, 'temp-key');
      dbService.updateMessageStatus(chatId, messages[messages.length - 1]?.id || '', 'sent');
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const pickMedia = async (mediaType: 'image' | 'video') => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: mediaType === 'image' ? ['images'] : ['videos'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const url = asset.uri;
      await dbService.sendMessage(chatId, user!.uid, appUser?.name || 'User', mediaType, mediaType === 'image' ? '[Image]' : '[Video]', 'temp-key', url, asset.width, asset.height);
    }
  };

  const pickAudio = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['livePhotos'], quality: 0.8 });
    Alert.alert('Audio', 'Audio recording coming soon. Use image/video for now.');
  };

  const handleCopy = async (msg: ChatMessage) => {
    await Clipboard.setStringAsync(msg.content);
    setShowActions(null);
  };

  const handleShare = async (msg: ChatMessage) => {
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(msg.content);
    setShowActions(null);
  };

  const handleDeleteMe = async (msg: ChatMessage) => {
    await dbService.deleteMessageForMe(chatId, msg.id, user!.uid);
    setShowActions(null);
  };

  const handleDeleteAll = async (msg: ChatMessage) => {
    try {
      await dbService.deleteMessageForAll(chatId, msg.id);
    } catch (e: any) { Alert.alert('Error', e.message); }
    setShowActions(null);
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMine = item.senderId === user?.uid;

    return (
      <TouchableOpacity onLongPress={() => setShowActions(item)}
        style={[styles.msgBubble, isMine ? styles.myMsg : styles.otherMsg]}>
        {item.type === 'image' && item.mediaURL && (
          <Image source={{ uri: item.mediaURL }} style={styles.mediaImage} resizeMode="cover" />
        )}
        {item.type === 'text' && <Text style={[styles.msgText, isMine && styles.myMsgText]}>{item.content}</Text>}
        {item.editedAt && <Text style={styles.edited}>edited</Text>}
        <View style={styles.msgFooter}>
          <Text style={styles.msgTime}>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          {isMine && (
            <Text style={styles.statusIcon}>
              {item.status === 'sent' ? '✓' : item.status === 'received' ? '✓✓' : item.status === 'seen' ? '✓✓' : ''}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) return <View style={styles.container}><ActivityIndicator color="#e94560" style={{ marginTop: 60 }} /></View>;

  return (
    <View style={styles.container}>
      <FlatList ref={flatRef} data={messages} renderItem={renderMessage} keyExtractor={m => m.id}
        contentContainerStyle={{ padding: 12 }} />
      <View style={styles.inputBar}>
        <TouchableOpacity onPress={() => Alert.alert('Attach', '', [
          { text: 'Image', onPress: () => pickMedia('image') },
          { text: 'Video', onPress: () => pickMedia('video') },
          { text: 'Audio', onPress: pickAudio },
          { text: 'Cancel', style: 'cancel' },
        ])} style={styles.attachBtn}>
          <Text style={styles.attachText}>+</Text>
        </TouchableOpacity>
        <TextInput style={styles.textInput} placeholder="Message..." placeholderTextColor="#666"
          value={input} onChangeText={setInput} multiline />
        <TouchableOpacity onPress={sendText} style={styles.sendBtn}>
          <Text style={styles.sendText}>➤</Text>
        </TouchableOpacity>
      </View>
      <Modal visible={!!showActions} transparent animationType="fade">
        <View style={styles.actionOverlay}>
          <View style={styles.actionSheet}>
            <Text style={styles.actionTitle}>Message Actions</Text>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleCopy(showActions!)}>
              <Text style={styles.actionText}>📋 Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleShare(showActions!)}>
              <Text style={styles.actionText}>📤 Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeleteMe(showActions!)}>
              <Text style={[styles.actionText, { color: '#ff6b6b' }]}>🗑 Delete for me</Text>
            </TouchableOpacity>
            {showActions && Date.now() - showActions.timestamp < 10 * 60 * 1000 && (
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeleteAll(showActions!)}>
                <Text style={[styles.actionText, { color: '#ff6b6b' }]}>🗑 Delete for all</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowActions(null)}>
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
  msgBubble: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 8 },
  myMsg: { backgroundColor: '#e94560', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  otherMsg: { backgroundColor: '#16213e', alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  msgText: { color: '#fff', fontSize: 15, lineHeight: 20 },
  myMsgText: { color: '#fff' },
  edited: { color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 2 },
  msgFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4 },
  msgTime: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginRight: 4 },
  statusIcon: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  mediaImage: { width: 200, height: 200, borderRadius: 8, marginBottom: 4 },
  inputBar: { flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: '#16213e', borderTopWidth: 1, borderTopColor: '#0f3460' },
  attachBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#0f3460', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  attachText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  textInput: { flex: 1, backgroundColor: '#1a1a2e', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, color: '#fff', fontSize: 14, maxHeight: 100, borderWidth: 1, borderColor: '#0f3460' },
  sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#e94560', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  sendText: { color: '#fff', fontSize: 16 },
  actionOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  actionSheet: { backgroundColor: '#16213e', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  actionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  actionBtn: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#0f3460' },
  actionText: { color: '#fff', fontSize: 16 },
  cancelBtn: { padding: 16, alignItems: 'center', marginTop: 8 },
  cancelText: { color: '#e94560', fontSize: 16, fontWeight: '600' },
});
