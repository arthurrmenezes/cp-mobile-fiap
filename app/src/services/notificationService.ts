import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { getIdToken } from './authTokenService';
import { saveDeviceToken } from './userService';

const API_URL = process.env.EXPO_PUBLIC_NOTIFICATIONS_API_URL || 'https://SUA-API-AQUI.exemplo.com';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(uid: string): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return null;

  const tokenResponse = await Notifications.getExpoPushTokenAsync();
  const token = tokenResponse.data;

  await saveDeviceToken(uid, token, Platform.OS);

  return token;
}

export async function notifyNewMessage(conversationId: string, messageId: string) {
  const idToken = await getIdToken();
  if (!idToken) return;

  await fetch(`${API_URL}/notifications/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ conversationId, messageId }),
  });
}

export function addNotificationResponseListener(
  callback: (conversationId: string, conversationType: string) => void
) {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as {
      conversationId?: string;
      conversationType?: string;
    };
    if (data.conversationId && data.conversationType) {
      callback(data.conversationId, data.conversationType);
    }
  });
}
