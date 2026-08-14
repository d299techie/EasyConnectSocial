import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/db';
import { ChatMessage, Chat } from '../types';

export default function BroadcastChatScreen({ route, navigation }: any) {
  const { chatId, chat } = route.params;
  const { user, appUser } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const flatRef = useRef<FlatList>(null);

  const isCreator = chat.broadcastCreator === user?.uid || chat.participants[0] === user?.uid;
  const recipients = chat.participants.filter((p: string) => p !== user?.uid);

  useEffect(() => {
    const unsub = dbService.onMessages(chatId, (msgs) => {
      setMessages(msgs.filter(m => !m.deletedFor.includes(user?.uid || '')));
      setLoading(false);
    });
    return unsub;
  }, [chatId]);

  const sendBroadcast = async () => {
    if (!input.trim() || !isCreator) return;
    const text = input.trim();
    setInput('');
    try {
      for (const recipientId of recipients) {
        const chatKey = `broadcast-${chatId}`;
        await dbService.sendMessage(chatId, user!.uid, appUser?.name || 'Broadcast', 'text', text, chatKey);
      }
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <View style={[styles.msgBubble, item.senderId === user?.uid ? styles.myMsg : styles.otherMsg]}>
      <Text style={styles.msgText}>{item.content}</Text>
      <Text style={styles.msgTime}>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
    </View>
  );

  if (loading) return <View style={styles.container}><ActivityIndicator color="#e94560" style={{ marginTop: 60 }} /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{chat.groupName || 'Broadcast'}</Text>
        <Text style={styles.headerSub}>{recipients.length} recipients</Text>
      </View>
      <FlatList ref={flatRef} data={messages} renderItem={renderMessage} keyExtractor={m => m.id}
        contentContainerStyle={{ padding: 12 }} />
      {isCreator ? (
        <View style={styles.inputBar}>
          <TextInput style={styles.textInput} placeholder="Broadcast message..." placeholderTextColor="#666"
            value={input} onChangeText={setInput} multiline />
          <TouchableOpacity onPress={sendBroadcast} style={styles.sendBtn}>
            <Text style={styles.sendText}>➤</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.readOnlyBar}>
          <Text style={styles.readOnlyText}>Broadcast - view only</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  header: { padding: 16, backgroundColor: '#16213e', borderBottomWidth: 1, borderBottomColor: '#0f3460' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  headerSub: { color: '#aaa', fontSize: 13 },
  msgBubble: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 8 },
  myMsg: { backgroundColor: '#e94560', alignSelf: 'flex-end' },
  otherMsg: { backgroundColor: '#16213e', alignSelf: 'flex-start' },
  msgText: { color: '#fff', fontSize: 15 },
  msgTime: { color: 'rgba(255,255,255,0.6)', fontSize: 10, marginTop: 4, textAlign: 'right' },
  inputBar: { flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: '#16213e', borderTopWidth: 1, borderTopColor: '#0f3460' },
  textInput: { flex: 1, backgroundColor: '#1a1a2e', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, color: '#fff', fontSize: 14, borderWidth: 1, borderColor: '#0f3460' },
  sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#e94560', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  sendText: { color: '#fff', fontSize: 16 },
  readOnlyBar: { padding: 12, backgroundColor: '#16213e', borderTopWidth: 1, borderTopColor: '#0f3460', alignItems: 'center' },
  readOnlyText: { color: '#666', fontSize: 13 },
});
