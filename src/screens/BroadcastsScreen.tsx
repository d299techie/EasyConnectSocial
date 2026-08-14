import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/db';
import { Chat } from '../types';

export default function BroadcastsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsub = dbService.onUserChats(user.uid, setChats);
    return unsub;
  }, [user]);

  const broadcasts = chats.filter(c => c.type === 'broadcast');

  return (
    <View style={styles.container}>
      <FlatList data={broadcasts} renderItem={({ item }) => (
        <TouchableOpacity style={styles.item} onPress={() => navigation.navigate('BroadcastChat', { chatId: item.id, chat: item })}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{'📢'}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.groupName || 'Broadcast'}</Text>
            <Text style={styles.count}>{item.participants.length - 1} recipients</Text>
          </View>
        </TouchableOpacity>
      )} keyExtractor={c => c.id}
        ListEmptyComponent={<Text style={styles.empty}>No broadcasts yet. Tap + to create one.</Text>} />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('BroadcastCreate')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  item: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: '#0f3460', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#0f3460', justifyContent: 'center', alignItems: 'center', marginRight: 12, fontSize: 24 },
  avatarText: { fontSize: 24 },
  name: { color: '#fff', fontSize: 16, fontWeight: '600' },
  count: { color: '#aaa', fontSize: 13, marginTop: 2 },
  empty: { color: '#666', textAlign: 'center', marginTop: 60, fontSize: 16 },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#e94560', justifyContent: 'center', alignItems: 'center', elevation: 6 },
  fabText: { color: '#fff', fontSize: 28 },
});
