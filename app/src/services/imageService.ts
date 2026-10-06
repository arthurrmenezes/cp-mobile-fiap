import * as ImagePicker from 'expo-image-picker';
import { getIdToken } from './authTokenService';

const PHOTOS_API_URL = process.env.EXPO_PUBLIC_PHOTOS_API_URL || '';

export async function pickImage(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.6,
  });

  if (result.canceled) return null;
  return result.assets[0].uri;
}

export async function uploadImage(localUri: string): Promise<string> {
  const idToken = await getIdToken();
  if (!idToken) throw new Error('Usuário não autenticado');

  const fileResponse = await fetch(localUri);
  const blob = await fileResponse.blob();

  const response = await fetch(`${PHOTOS_API_URL}/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'image/jpeg',
    },
    body: blob,
  });

  if (!response.ok) {
    throw new Error('Falha ao enviar imagem');
  }

  const data = await response.json();
  return data.url as string;
}
