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
import { useAuth } from '../contexts/AuthContext';
import { createGroup } from '../services/groupService';
import { pickImage, uploadImage } from '../services/imageService';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { GroupMemberItem } from '../components/GroupMemberItem';
import { ChatUser } from '../types/user';

const DEFAULT_PHOTO = 'https://ui-avatars.com/api/?name=Group';

export function GroupFormScreen({ navigation }: any) {
  const { chatUser } = useAuth();
  const [name, setName] = useState('');
  const [memberLimit, setMemberLimit] = useState('5');
  const [members, setMembers] = useState<ChatUser[]>([]);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePickPhoto() {
    const uri = await pickImage();
    if (uri) setPhotoUri(uri);
  }

  function handleAddMembers() {
    navigation.navigate('Users', {
      selectMode: true,
      onSelectUser: (user: ChatUser) => {
        setMembers((prev) =>
          prev.find((m) => m.uid === user.uid) ? prev : [...prev, user]
        );
      },
    });
  }

  async function handleCreateGroup() {
    setError(null);

    if (!chatUser) return;

    const limit = parseInt(memberLimit, 10);

    if (!name.trim()) {
      setError('Informe o nome do grupo');
      return;
    }

    if (!Number.isInteger(limit) || limit < 2) {
      setError('O limite deve ser um número inteiro maior ou igual a 2');
      return;
    }

    if (members.length + 1 > limit) {
      setError('A quantidade de integrantes selecionados ultrapassa o limite');
      return;
    }

    setLoading(true);
    try {
      let photoUrl = DEFAULT_PHOTO;

      if (photoUri) {
        photoUrl = await uploadImage(photoUri);
      }

      await createGroup(
        name.trim(),
        photoUrl,
        chatUser.uid,
        members.map((m) => m.uid),
        limit
      );

      navigation.goBack();
    } catch (err) {
      setError('Não foi possível criar o grupo');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <Loading />;

  const spotsLeft = parseInt(memberLimit, 10) - members.length - 1;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Novo grupo</Text>

      <TouchableOpacity onPress={handlePickPhoto} style={styles.photoContainer}>
        <Image source={{ uri: photoUri || DEFAULT_PHOTO }} style={styles.photo} />
        <Text style={styles.photoText}>Escolher foto do grupo</Text>
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder="Nome do grupo"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Limite de integrantes"
        keyboardType="numeric"
        value={memberLimit}
        onChangeText={setMemberLimit}
      />

      <Text style={styles.spots}>
        Vagas disponíveis: {Number.isNaN(spotsLeft) ? '-' : spotsLeft}
      </Text>

      <TouchableOpacity style={styles.secondaryButton} onPress={handleAddMembers}>
        <Text style={styles.secondaryButtonText}>Adicionar integrantes</Text>
      </TouchableOpacity>

      {members.map((member) => (
        <GroupMemberItem key={member.uid} user={member} />
      ))}

      {error ? <ErrorMessage message={error} /> : null}

      <TouchableOpacity style={styles.button} onPress={handleCreateGroup}>
        <Text style={styles.buttonText}>Criar grupo</Text>
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
  spots: {
    color: '#6b7280',
    marginBottom: 12,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#2563eb',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: '#2563eb',
    fontWeight: '600',
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
});
