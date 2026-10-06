import { initializeApp } from 'firebase/app';
import { initializeAuth } from 'firebase/auth';
// O pacote "firebase" não expõe a tipagem do build React Native deste
// helper mesmo com customConditions configurado; a função existe em runtime
// (é o padrão oficial recomendado pela documentação do Firebase para RN).
// @ts-expect-error — getReactNativePersistence só está tipado no build RN do @firebase/auth
import { getReactNativePersistence } from '@firebase/auth';
import { getDatabase } from 'firebase/database';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firebaseConfig from '../../firebaseConfig.json';

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
