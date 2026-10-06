import { useCallback, useEffect, useState } from 'react';
import { getUserGroups } from '../services/groupService';
import { ChatGroup } from '../types/group';

export function useGroups(uid: string | undefined) {
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const loadGroups = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    const data = await getUserGroups(uid);
    setGroups(data);
    setLoading(false);
  }, [uid]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  return { groups, loading, reloadGroups: loadGroups };
}
