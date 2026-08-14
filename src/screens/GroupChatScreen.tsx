import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Modal, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/db';
import { ChatMessage, Chat } from '../types';

export default function GroupChatScreen({ route, navigation }: any) {
  const { chatId, chat } = route.params;
  const { user, appUser } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatData, setChatData] = useState<Chat>(chat);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [showActions, setShowActions] = useState<ChatMessage | null>(null);
  const flatRef = useRef<FlatList>(null);

  const isAdmin = chatData.groupAdmins?.includes(user?.uid || '');
  const isAdminOnly = chatData.adminOnlyPost;

  useEffect(() => {
    const unsub1 = dbService.onMessages(chatId, (msgs) => {
      const filtered = msgs.filter(m => !m.deletedFor.includes(user?.uid || '') && !m.deletedForAll);
      setMessages(filtered);
      setLoading(false);
    });
    const loadChat = async () => {
      const c = await dbService.getChat(chatId);
      if (c) setChatData(c);
    };
    loadChat();
    return () => { unsub1(); };
  }, [chatId]);

  useEffect(() => {
    if (messages.length > 0) setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 200);
  }, [messages.length]);

  const sendText = async () => {
    if (!input.trim()) return;
    if (isAdminOnly && !isAdmin) { Alert.alert('Restricted', 'Only admins can post'); return; }
    setInput('');
    await dbService.sendMessage(chatId, user!.uid, appUser?.name || 'User', 'text', input.trim(), 'group-key');
  };

  const handleCopy = async (msg: ChatMessage) => {
    const expoClipboard = await import('expo-clipboard');
    await expoClipboard.setStringAsync(msg.content);
    setShowActions(null);
  };

  const handleDeleteMe = async (msg: ChatMessage) => {
    await dbService.deleteMessageForMe(chatId, msg.id, user!.uid);
    setShowActions(null);
  };

  const handleDeleteAll = async (msg: ChatMessage) => {
    if (!isAdmin) { Alert.alert('Restricted', 'Only admins can delete messages'); setShowActions(null); return; }
    await dbService.deleteMessageForAll(chatId, msg.id);
    setShowActions(null);
  };

  const canPost = !isAdminOnly || isAdmin;

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMine = item.senderId === user?.uid;
    return (
      <TouchableOpacity onLongPress={() => setShowActions(item)}
        style={[styles.msgBubble, isMine ? styles.myMsg : styles.otherMsg]}>
        {!isMine && <Text style={styles.senderName}>{item.senderName}</Text>}
        {item.type === 'text' && <Text style={[styles.msgText, isMine && styles.myMsgText]}>{item.content}</Text>}
        {item.editedAt && <Text style={styles.edited}>edited</Text>}
        <Text style={styles.msgTime}>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
      </TouchableOpacity>
    );
  };

  if (loading) return <View style={styles.container}><ActivityIndicator color="#e94560" style={{ marginTop: 60 }} /></View>;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.header} onPress={() => navigation.navigate('GroupInfo', { chatId, chat: chatData })}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{chatData.groupName?.[0]?.toUpperCase() || 'G'}</Text></View>
        <View>
          <Text style={styles.headerTitle}>{chatData.groupName || 'Group'}</Text>
          <Text style={styles.headerSub}>{chatData.participants.length} members{isAdminOnly ? ' • Admin only' : ''}</Text>
        </View>
      </TouchableOpacity>
      <FlatList ref={flatRef} data={messages} renderItem={renderMessage} keyExtractor={m => m.id}
        contentContainerStyle={{ padding: 12 }} />
      <View style={styles.inputBar}>
        <TextInput style={styles.textInput} placeholder={canPost ? "Message..." : "Only admins can post"}
          placeholderTextColor="#666" value={input} onChangeText={setInput} multiline editable={canPost} />
        {canPost && (
          <TouchableOpacity onPress={sendText} style={styles.sendBtn}>
            <Text style={styles.sendText}>➤</Text>
          </TouchableOpacity>
        )}
      </View>
      <Modal visible={!!showActions} transparent animationType="fade">
        <View style={styles.actionOverlay}>
          <View style={styles.actionSheet}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleCopy(showActions!)}>
              <Text style={styles.actionText}>📋 Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeleteMe(showActions!)}>
              <Text style={[styles.actionText, { color: '#ff6b6b' }]}>🗑 Delete for me</Text>
            </TouchableOpacity>
            {showActions && (isAdmin || showActions.senderId === user?.uid) && (
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
  header: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#16213e', borderBottomWidth: 1, borderBottomColor: '#0f3460' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#0f3460', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  headerSub: { color: '#aaa', fontSize: 12 },
  msgBubble: { maxWidth: '80%', padding: 10, borderRadius: 14, marginBottom: 8 },
  myMsg: { backgroundColor: '#e94560', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  otherMsg: { backgroundColor: '#16213e', alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  senderName: { color: '#e94560', fontSize: 12, fontWeight: '600', marginBottom: 2 },
  msgText: { color: '#fff', fontSize: 14, lineHeight: 20 },
  myMsgText: { color: '#fff' },
  edited: { color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 2 },
  msgTime: { color: 'rgba(255,255,255,0.6)', fontSize: 10, marginTop: 2, textAlign: 'right' },
  inputBar: { flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: '#16213e', borderTopWidth: 1, borderTopColor: '#0f3460' },
  textInput: { flex: 1, backgroundColor: '#1a1a2e', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, color: '#fff', fontSize: 14, maxHeight: 100, borderWidth: 1, borderColor: '#0f3460' },
  sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#e94560', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  sendText: { color: '#fff', fontSize: 16 },
  actionOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  actionSheet: { backgroundColor: '#16213e', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  actionBtn: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#0f3460' },
  actionText: { color: '#fff', fontSize: 16 },
  cancelBtn: { padding: 16, alignItems: 'center', marginTop: 8 },
  cancelText: { color: '#e94560', fontSize: 16, fontWeight: '600' },
});
