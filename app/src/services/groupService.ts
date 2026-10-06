import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { ChatGroup, NotificationPolicy } from '../types/group';

export async function createGroup(
  name: string,
  photoUrl: string,
  ownerId: string,
  memberIds: string[],
  memberLimit: number
): Promise<ChatGroup> {
  const id = doc(collection(db, 'groups')).id;

  const group: ChatGroup = {
    id,
    name,
    photoUrl,
    ownerId,
    memberIds: Array.from(new Set([ownerId, ...memberIds])),
    memberLimit,
    notificationPolicy: 'all_group_messages',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await setDoc(doc(db, 'groups', id), group);
  return group;
}

export async function getGroupById(groupId: string): Promise<ChatGroup | null> {
  const snap = await getDoc(doc(db, 'groups', groupId));
  if (!snap.exists()) return null;
  return snap.data() as ChatGroup;
}

export async function getUserGroups(uid: string): Promise<ChatGroup[]> {
  const snap = await getDocs(
    query(collection(db, 'groups'), where('memberIds', 'array-contains', uid))
  );
  return snap.docs.map((d) => d.data() as ChatGroup);
}

export async function addMemberToGroup(groupId: string, memberId: string) {
  const groupRef = doc(db, 'groups', groupId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(groupRef);
    if (!snap.exists()) throw new Error('Grupo não encontrado');

    const group = snap.data() as ChatGroup;

    if (group.memberIds.includes(memberId)) return;

    if (group.memberIds.length >= group.memberLimit) {
      throw new Error('O grupo já atingiu o limite de integrantes');
    }

    transaction.update(groupRef, {
      memberIds: [...group.memberIds, memberId],
      updatedAt: Date.now(),
    });
  });
}

export async function removeMemberFromGroup(groupId: string, memberId: string) {
  const group = await getGroupById(groupId);
  if (!group) throw new Error('Grupo não encontrado');

  await updateDoc(doc(db, 'groups', groupId), {
    memberIds: group.memberIds.filter((id) => id !== memberId),
    updatedAt: Date.now(),
  });
}

export async function updateMemberLimit(groupId: string, newLimit: number) {
  const group = await getGroupById(groupId);
  if (!group) throw new Error('Grupo não encontrado');

  if (newLimit < group.memberIds.length) {
    throw new Error('O novo limite não pode ser menor que a quantidade atual de integrantes');
  }

  await updateDoc(doc(db, 'groups', groupId), {
    memberLimit: newLimit,
    updatedAt: Date.now(),
  });
}

export async function updateNotificationPolicy(groupId: string, policy: NotificationPolicy) {
  await updateDoc(doc(db, 'groups', groupId), {
    notificationPolicy: policy,
    updatedAt: Date.now(),
  });
}
