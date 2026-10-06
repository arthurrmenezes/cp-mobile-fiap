import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
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

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function uploadImage(localUri: string): Promise<string> {
  const idToken = await getIdToken();
  if (!idToken) throw new Error('Usuário não autenticado');

  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const bytes = base64ToBytes(base64);

  const response = await fetch(`${PHOTOS_API_URL}/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'image/jpeg',
    },
    body: bytes.buffer as ArrayBuffer,
  });

  if (!response.ok) {
    throw new Error('Falha ao enviar imagem');
  }

  const data = await response.json();
  return data.url as string;
}
