import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { Loading } from './src/components/Loading';
import { addNotificationResponseListener } from './src/services/notificationService';

import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { ConversationsScreen } from './src/screens/ConversationsScreen';
import { UsersScreen } from './src/screens/UsersScreen';
import { GroupFormScreen } from './src/screens/GroupFormScreen';
import { ChatScreen } from './src/screens/ChatScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { GroupMembersScreen } from './src/screens/GroupMembersScreen';

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const { firebaseUser, loading } = useAuth();

  useEffect(() => {
    const subscription = addNotificationResponseListener((conversationId, conversationType) => {
      // o navegador de notificações toca aqui quando o usuário abre uma notificação
    });
    return () => subscription.remove();
  }, []);

  if (loading) return <Loading />;

  return (
    <Stack.Navigator>
      {!firebaseUser ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Criar conta' }} />
        </>
      ) : (
        <>
          <Stack.Screen
            name="Conversations"
            component={ConversationsScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen name="Users" component={UsersScreen} options={{ title: 'Usuários' }} />
          <Stack.Screen
            name="GroupForm"
            component={GroupFormScreen}
            options={{ title: 'Novo grupo' }}
          />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Perfil' }} />
          <Stack.Screen
            name="GroupMembers"
            component={GroupMembersScreen}
            options={{ title: 'Integrantes' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
