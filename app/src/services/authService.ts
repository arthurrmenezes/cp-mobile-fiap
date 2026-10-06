import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { ChatUser } from '../types/user';

export async function createAccount(email: string, password: string): Promise<string> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  return credential.user.uid;
}

export async function saveUserProfile(
  uid: string,
  email: string,
  profile: Omit<ChatUser, 'uid' | 'email' | 'createdAt'>
): Promise<ChatUser> {
  const chatUser: ChatUser = {
    uid,
    email,
    name: profile.name,
    phoneNumber: profile.phoneNumber,
    birthDate: profile.birthDate,
    photoUrl: profile.photoUrl,
    createdAt: Date.now(),
  };

  await setDoc(doc(db, 'users', uid), chatUser);
  return chatUser;
}

export async function loginUser(email: string, password: string) {
  await signInWithEmailAndPassword(auth, email, password);
}

export async function logoutUser() {
  await signOut(auth);
}

export function observeAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
