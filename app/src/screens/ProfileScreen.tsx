import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { getUserById } from '../services/userService';
import { Loading } from '../components/Loading';
import { ChatUser } from '../types/user';

const DEFAULT_PHOTO = 'https://ui-avatars.com/api/?name=User';

export function ProfileScreen({ route }: any) {
  const { uid } = route.params;
  const [user, setUser] = useState<ChatUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserById(uid).then((data) => {
      setUser(data);
      setLoading(false);
    });
  }, [uid]);

  if (loading) return <Loading />;

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.unavailable}>Perfil não disponível</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image source={{ uri: user.photoUrl || DEFAULT_PHOTO }} style={styles.photo} />
      <Text style={styles.name}>{user.name}</Text>

      <View style={styles.field}>
        <Text style={styles.label}>E-mail</Text>
        <Text style={styles.value}>{user.email || 'Não disponível'}</Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Celular</Text>
        <Text style={styles.value}>{user.phoneNumber || 'Não disponível'}</Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Data de nascimento</Text>
        <Text style={styles.value}>{user.birthDate || 'Não disponível'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 24,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e5e7eb',
    marginBottom: 12,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
  },
  field: {
    width: '100%',
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    color: '#6b7280',
  },
  value: {
    fontSize: 16,
  },
  unavailable: {
    marginTop: 40,
    color: '#6b7280',
  },
});
