import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import ChatsScreen from '../screens/ChatsScreen';
import ChatRoomScreen from '../screens/ChatRoomScreen';
import GroupsScreen from '../screens/GroupsScreen';
import GroupChatScreen from '../screens/GroupChatScreen';
import GroupInfoScreen from '../screens/GroupInfoScreen';
import BroadcastsScreen from '../screens/BroadcastsScreen';
import BroadcastChatScreen from '../screens/BroadcastChatScreen';
import BroadcastCreateScreen from '../screens/BroadcastCreateScreen';
import StatusScreen from '../screens/StatusScreen';
import StatusViewerScreen from '../screens/StatusViewerScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AdminSettingsScreen from '../screens/AdminSettingsScreen';
import UserManagementScreen from '../screens/UserManagementScreen';
import InviteScreen from '../screens/InviteScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Chats: '💬', Groups: '👥', Broadcasts: '📢', Status: '⏺',
  };
  return (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>
      {icons[name] || '📄'}
    </Text>
  );
}

function MainTabs() {
  const navigation = useNavigation();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
        tabBarStyle: { backgroundColor: '#16213e', borderTopColor: '#0f3460', height: 60, paddingBottom: 8 },
        tabBarActiveTintColor: '#e94560',
        tabBarInactiveTintColor: '#aaa',
        headerStyle: { backgroundColor: '#1a1a2e' },
        headerTintColor: '#fff',
        headerRight: () => (
          <TouchableOpacity onPress={() => (navigation as any).navigate('Profile')} style={{ marginRight: 16 }}>
            <Text style={{ color: '#e94560', fontSize: 14, fontWeight: '600' }}>Profile</Text>
          </TouchableOpacity>
        ),
      })}
    >
      <Tab.Screen name="Chats" component={ChatsScreen} />
      <Tab.Screen name="Groups" component={GroupsScreen} />
      <Tab.Screen name="Broadcasts" component={BroadcastsScreen} />
      <Tab.Screen name="Status" component={StatusScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, appUser, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#e94560" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#1a1a2e' },
          headerTintColor: '#fff',
          cardStyle: { backgroundColor: '#1a1a2e' },
        }}
      >
        {!user || !appUser ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Register' }} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ title: 'Reset Password' }} />
            <Stack.Screen name="Invite" component={InviteScreen} options={{ title: 'Invite' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen name="ChatRoom" component={ChatRoomScreen} options={{ title: 'Chat' }} />
            <Stack.Screen name="GroupChat" component={GroupChatScreen} options={{ title: 'Group' }} />
            <Stack.Screen name="GroupInfo" component={GroupInfoScreen} options={{ title: 'Group Info' }} />
            <Stack.Screen name="BroadcastChat" component={BroadcastChatScreen} options={{ title: 'Broadcast' }} />
            <Stack.Screen name="BroadcastCreate" component={BroadcastCreateScreen} options={{ title: 'New Broadcast' }} />
            <Stack.Screen name="StatusViewer" component={StatusViewerScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
            <Stack.Screen name="AdminSettings" component={AdminSettingsScreen} options={{ title: 'Admin Settings' }} />
            <Stack.Screen name="UserManagement" component={UserManagementScreen} options={{ title: 'Users' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
