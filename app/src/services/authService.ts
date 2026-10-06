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
  // Garante que o token de autenticação já está pronto antes de qualquer
  // escrita no Firestore logo em seguida (evita "permission-denied" por
  // uma corrida entre o login e a propagação do token).
  await credential.user.getIdToken();
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
  const credential = await signInWithEmailAndPassword(auth, email, password);
  await credential.user.getIdToken();
}

export async function logoutUser() {
  await signOut(auth);
}

export function observeAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
