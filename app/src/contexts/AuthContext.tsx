import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { observeAuthState } from '../services/authService';
import { getUserById } from '../services/userService';
import { ChatUser } from '../types/user';

type AuthContextValue = {
  firebaseUser: User | null;
  chatUser: ChatUser | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  chatUser: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [chatUser, setChatUser] = useState<ChatUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = observeAuthState(async (user) => {
      setFirebaseUser(user);

      if (user) {
        const profile = await getUserById(user.uid);
        setChatUser(profile);
      } else {
        setChatUser(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ firebaseUser, chatUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
