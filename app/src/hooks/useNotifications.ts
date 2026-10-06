import { useEffect } from 'react';
import { registerForPushNotifications } from '../services/notificationService';

export function useNotifications(uid: string | undefined) {
  useEffect(() => {
    if (!uid) return;
    registerForPushNotifications(uid);
  }, [uid]);
}
