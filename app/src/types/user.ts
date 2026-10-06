export type ChatUser = {
  uid: string;
  name: string;
  email: string;
  phoneNumber: string;
  birthDate: string;
  photoUrl: string;
  createdAt: number;
};

export type DeviceToken = {
  token: string;
  platform: 'android' | 'ios' | 'web';
  enabled: boolean;
  updatedAt: number;
};
