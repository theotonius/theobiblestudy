
export interface Song {
  id: string;
  title: string;
  reference: string;
  lyrics: string[];
  category: 'Worship' | 'Praise' | 'Hymn' | 'Kids';
  image: string;
}

export interface UserProfile {
  name: string;
  email: string;
  photo: string;
}

export interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderPhoto: string;
  timestamp: number;
}

export interface SavedStudy {
  id: string;
  reference: string;
  content: string;
  timestamp: number;
}

export interface Reflection {
  text: string;
  verse: string;
}

export enum Theme {
  Light = 'light',
  Dark = 'dark',
  Sepia = 'sepia'
}

export enum AppTab {
  Library = 'library',
  Reader = 'reader',
  Reflections = 'reflections',
  Study = 'study',
  Chat = 'chat',
  Profile = 'profile',
  Developer = 'developer'
}
