import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { ChatUser } from '../types/user';

export async function getUserById(uid: string): Promise<ChatUser | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return snap.data() as ChatUser;
}

export async function getAllUsers(): Promise<ChatUser[]> {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map((d) => d.data() as ChatUser);
}

export async function saveDeviceToken(uid: string, token: string, platform: string) {
  await setDoc(doc(db, 'users', uid, 'devices', token), {
    token,
    platform,
    enabled: true,
    updatedAt: Date.now(),
  });
}
