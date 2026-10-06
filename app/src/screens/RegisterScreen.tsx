import React, { useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { createAccount, saveUserProfile } from '../services/authService';
import { pickImage, uploadImage } from '../services/imageService';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';

const DEFAULT_PHOTO = 'https://ui-avatars.com/api/?name=User';

export function RegisterScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePickPhoto() {
    const uri = await pickImage();
    if (uri) setPhotoUri(uri);
  }

  async function handleRegister() {
    setError(null);

    if (!name || !email || !password || !phoneNumber || !birthDate) {
      setError('Preencha todos os campos');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    setLoading(true);
    try {
      const uid = await createAccount(email, password);

      let photoUrl = DEFAULT_PHOTO;
      if (photoUri) {
        photoUrl = await uploadImage(photoUri);
      }

      await saveUserProfile(uid, email, {
        name,
        phoneNumber,
        birthDate,
        photoUrl,
      });
    } catch (err) {
      setError('Não foi possível criar a conta');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <Loading />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Criar conta</Text>

      <TouchableOpacity onPress={handlePickPhoto} style={styles.photoContainer}>
        <Image source={{ uri: photoUri || DEFAULT_PHOTO }} style={styles.photo} />
        <Text style={styles.photoText}>Escolher foto</Text>
      </TouchableOpacity>

      <TextInput style={styles.input} placeholder="Nome" value={name} onChangeText={setName} />
      <TextInput
        style={styles.input}
        placeholder="E-mail"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Senha"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TextInput
        style={styles.input}
        placeholder="Confirmar senha"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />
      <TextInput
        style={styles.input}
        placeholder="Celular"
        keyboardType="phone-pad"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
      />
      <TextInput
        style={styles.input}
        placeholder="Data de nascimento (DD/MM/AAAA)"
        value={birthDate}
        onChangeText={setBirthDate}
      />

      {error ? <ErrorMessage message={error} /> : null}

      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Cadastrar</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.link}>Já tenho conta</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 24,
    textAlign: 'center',
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  photo: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#e5e7eb',
  },
  photoText: {
    color: '#2563eb',
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  link: {
    color: '#2563eb',
    textAlign: 'center',
    marginTop: 16,
  },
});
