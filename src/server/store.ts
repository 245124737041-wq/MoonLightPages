import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  JourneyStage,
  PrivacySettings,
  ReaderSettings,
  ReadingProgressItem,
  ShelfStatus,
  UserPreferences,
  UserState,
  VocabularyItem,
  JournalEntry,
} from '../types.ts';

interface StoredAccount {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
  state: UserState;
}

interface DataFileSchema {
  accounts: Record<string, StoredAccount>;
  sessions: Record<string, string>; // token -> accountId
}

const DATA_FILE = path.resolve(process.cwd(), '.vellum-store.json');

function createDefaultJourney(): JourneyStage[] {
  return [
    {
      level: 1,
      label: 'Level 1 — Short & Gentle Stories',
      description: 'Warm, accessible classics you can finish in 10–15 minutes a session.',
      bookId: 'tagore-stories',
      status: 'current',
    },
    {
      level: 2,
      label: 'Level 2 — Easy Modern & Adventure Fiction',
      description: 'Fast-moving plots and clear language that build steady reading momentum.',
      bookId: 'study-in-scarlet',
      status: 'upcoming',
    },
    {
      level: 3,
      label: 'Level 3 — Accessible Classics',
      description: 'Compact emotional and psychological novellas with richer vocabulary.',
      bookId: 'white-nights',
      status: 'upcoming',
    },
    {
      level: 4,
      label: 'Level 4 — Deep Literary Novels',
      description: 'Layered character studies and philosophical debates.',
      bookId: 'dorian-gray',
      status: 'upcoming',
    },
    {
      level: 5,
      label: 'Level 5 — Masterworks',
      description: 'Monumental classics tackled with full confidence and pace.',
      bookId: 'crime-and-punishment',
      status: 'upcoming',
    },
  ];
}

export function createDefaultUserState(id: string, name: string, email: string, isGuest: boolean): UserState {
  const today = new Date().toISOString().slice(0, 10);
  const defaultPreferences: UserPreferences = {
    genres: ['Romance', 'Mystery', 'Classic Literature'],
    favoriteAuthors: ['Fyodor Dostoevsky'],
    experience: 'very_little',
    languageDifficulty: 'Easy',
    maxDifficulty: 3,
    dailyTime: '20 minutes',
    preferredLength: 'Short',
    ageGroup: 'Adult',
    appLanguage: 'English',
  };

  const defaultPrivacy: PrivacySettings = {
    shareReadingHistory: true,
    saveAiConversations: true,
    privateJournal: true,
    personalizedRecommendations: true,
    publicProfile: false,
  };

  const defaultReaderSettings: ReaderSettings = {
    theme: 'light',
    fontSize: 19,
    fontFamily: 'serif',
    lineSpacing: 'relaxed',
  };

  return {
    id,
    name,
    email,
    isGuest,
    preferences: defaultPreferences,
    privacy: defaultPrivacy,
    readerSettings: defaultReaderSettings,
    library: {
      reading: ['white-nights'],
      want_to_read: ['tagore-stories', 'study-in-scarlet', 'time-machine'],
      completed: ['o-henry-stories'],
      abandoned: [],
      favorites: ['white-nights', 'o-henry-stories'],
    },
    progress: {
      'white-nights': {
        bookId: 'white-nights',
        currentChapterIndex: 0,
        currentPage: 28,
        percentComplete: 34,
        minutesRead: 42,
        bookmarks: [0],
        highlights: [
          {
            chapterIndex: 0,
            text: 'this midnight bridge felt less lonely simply because she stood beside me.',
          },
        ],
        lastReadAt: new Date().toISOString(),
      },
      'o-henry-stories': {
        bookId: 'o-henry-stories',
        currentChapterIndex: 1,
        currentPage: 64,
        percentComplete: 100,
        minutesRead: 85,
        bookmarks: [],
        highlights: [],
        rating: 5,
        lastReadAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
    },
    currentBookId: 'white-nights',
    vocabulary: [
      {
        id: 'vocab-seed-1',
        word: 'Admonition',
        simpleMeaning: 'Gentle advice or a firm warning about someone’s behavior.',
        example: 'The teacher gave him a quiet admonition before class began.',
        similarWords: ['warning', 'counsel', 'reprimand'],
        difficulty: 'Medium',
        bookTitle: 'White Nights',
        savedAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: 'vocab-seed-2',
        word: 'Candidly',
        simpleMeaning: 'Speaking openly, honestly, and without hiding feelings.',
        example: 'She confessed candidly that she had never finished a novel before.',
        similarWords: ['honestly', 'frankly', 'openly'],
        difficulty: 'Easy',
        bookTitle: 'White Nights',
        savedAt: new Date().toISOString(),
      },
    ],
    journal: [
      {
        id: 'journal-seed-1',
        bookId: 'o-henry-stories',
        bookTitle: 'The Gift of the Magi & Short Stories',
        chapterTitle: 'The Quiet Exchange',
        thought: 'Short, warm, and surprisingly moving—it made classic fiction feel effortless.',
        favoriteCharacter: 'Della',
        favoriteQuote: 'Their foolish, generous exchange revealed a wiser devotion.',
        feeling: 'Warm and hopeful',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
    ],
    journey: createDefaultJourney(),
    stats: {
      pagesRead: 92,
      chaptersCompleted: 3,
      totalMinutesRead: 127,
      booksCompleted: 1,
      streakDays: 4,
      lastActiveDate: today,
      avgPagesPerHour: 34,
      challengeDay: 3,
      challengePagesToday: 12,
    },
  };
}

function loadStore(): DataFileSchema {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw) as DataFileSchema;
    }
  } catch (err) {
    console.error('Failed to read store file, initializing fresh store:', err);
  }
  const guestId = 'guest-reader';
  return {
    accounts: {
      [guestId]: {
        id: guestId,
        email: 'reader@vellum.app',
        name: 'Evening Reader',
        passwordHash: '',
        salt: '',
        state: createDefaultUserState(guestId, 'Evening Reader', 'reader@vellum.app', true),
      },
    },
    sessions: {},
  };
}

function saveStore(data: DataFileSchema) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save store file:', err);
  }
}

let store: DataFileSchema = loadStore();

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

export function registerAccount(name: string, email: string, password: string): { token: string; user: UserState } {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = Object.values(store.accounts).find(
    (acc) => !acc.state.isGuest && acc.email.toLowerCase() === normalizedEmail
  );
  if (existing) {
    throw new Error('An account with this email already exists.');
  }

  const id = `user-${crypto.randomUUID()}`;
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(password, salt);
  const state = createDefaultUserState(id, name.trim() || 'Reader', normalizedEmail, false);

  store.accounts[id] = {
    id,
    email: normalizedEmail,
    name: state.name,
    passwordHash,
    salt,
    state,
  };

  const token = crypto.randomBytes(32).toString('hex');
  store.sessions[token] = id;
  saveStore(store);

  return { token, user: state };
}

export function loginAccount(email: string, password: string): { token: string; user: UserState } {
  const normalizedEmail = email.trim().toLowerCase();
  const account = Object.values(store.accounts).find(
    (acc) => !acc.state.isGuest && acc.email.toLowerCase() === normalizedEmail
  );
  if (!account) {
    throw new Error('No account found with this email.');
  }
  const computed = hashPassword(password, account.salt);
  if (!crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(account.passwordHash, 'hex'))) {
    throw new Error('Incorrect password.');
  }

  const token = crypto.randomBytes(32).toString('hex');
  store.sessions[token] = account.id;
  saveStore(store);
  return { token, user: account.state };
}

export function getUserFromToken(token?: string): UserState {
  if (token && store.sessions[token]) {
    const accountId = store.sessions[token];
    const acc = store.accounts[accountId];
    if (acc) return acc.state;
  }
  if (!store.accounts['guest-reader']) {
    store.accounts['guest-reader'] = {
      id: 'guest-reader',
      email: 'reader@vellum.app',
      name: 'Evening Reader',
      passwordHash: '',
      salt: '',
      state: createDefaultUserState('guest-reader', 'Evening Reader', 'reader@vellum.app', true),
    };
    saveStore(store);
  }
  return store.accounts['guest-reader'].state;
}

export function updateUserState(token: string | undefined, updater: (state: UserState) => UserState): UserState {
  const current = getUserFromToken(token);
  const updated = updater(current);
  if (store.accounts[updated.id]) {
    store.accounts[updated.id].state = updated;
    saveStore(store);
  }
  return updated;
}

export function logoutToken(token?: string) {
  if (token && store.sessions[token]) {
    delete store.sessions[token];
    saveStore(store);
  }
}

export type { ReadingProgressItem, ShelfStatus, VocabularyItem, JournalEntry };
