declare global {
  interface LocalData {
    books: Book[];
    assignments: Assignment[];
    submissions: Submission[];
    notifications: CloudNotification[];
    students: Student[];
    gameProgress?: { gameType: string; score: number; date: string }[];
  }

  interface Book {
    id: string;
    title: string;
    content: string;
    audio: string;
  }

  interface QuizOption {
    A: string;
    B: string;
    C: string;
    D: string;
  }

  interface Assignment {
    id: string;
    title: string;
    type: 'mcq' | 'text';
    question?: string;
    options?: QuizOption;
    correct?: string;
    ideal?: string;
  }

  interface Submission {
    studentName: string;
    studentContact: string;
    parentContact: string;
    quizId: string;
    quizTitle: string;
    studentAnswer: string;
    initialScore: number;
    graderFeedback: string;
    timestamp: string;
  }

  interface Student {
    name: string;
    grade: string;
    pin: string;
  }

  interface CloudNotification {
    title: string;
    details: string;
    type: string;
    time: string;
    read: boolean;
  }

  interface UserSession {
    name: string;
    contact: string;
    email?: string;
    parentContact?: string;
    childContact?: string;
    age?: number;
    role: 'student' | 'teacher' | 'admin' | 'parent';
    uid?: string;
    id?: string;
    serverId?: string;
    serverAuth?: boolean;
    userId?: string;
  }

  interface FirebaseUser {
    uid: string;
    email?: string;
    getIdToken: () => Promise<string>;
    updateProfile: (profile: { displayName?: string }) => Promise<void>;
  }

  interface FirebaseCredential {
    user: FirebaseUser;
  }

  // Config globals (set in public/config.js)
  var __app_id: string;
  var __firebase_config: Record<string, unknown>;
  var __initial_auth_token: string | null;
  var __server_base: string;
  var __SENTRY_DSN: string;

  // Firebase
  var firebase: {
    initializeApp: (config: Record<string, unknown>) => unknown;
    auth: () => {
      onAuthStateChanged: (cb: (user: FirebaseUser | null) => void) => void;
      signInWithEmailAndPassword: (email: string, password: string) => Promise<FirebaseCredential>;
      createUserWithEmailAndPassword: (
        email: string,
        password: string,
      ) => Promise<FirebaseCredential>;
      signOut: () => Promise<void>;
      currentUser: FirebaseUser | null;
    };
    firestore: () => {
      collection: (name: string) => unknown;
    };
    analytics: () => { logEvent: (name: string, params?: unknown) => void };
    apps: unknown[];
  };

  // Runtime browser/app globals
  var Sentry:
    | {
        captureException: (err: unknown, hint?: unknown) => void;
        init: (config: Record<string, unknown>) => void;
      }
    | undefined;
  var speechRecognizer: { start: () => void } | undefined;
  var webkitAudioContext: typeof AudioContext;
  interface SpeechRecognition extends EventTarget {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    start: () => void;
    stop: () => void;
    abort: () => void;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
  }
  interface SpeechRecognitionEvent {
    results: SpeechRecognitionResultList;
  }
  interface SpeechRecognitionResultList {
    length: number;
    [index: number]: SpeechRecognitionResult;
  }
  interface SpeechRecognitionResult {
    isFinal: boolean;
    [index: number]: SpeechRecognitionAlternative;
  }
  interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
  }
  interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message: string;
  }
  var SpeechRecognition: new () => SpeechRecognition;
  var webkitSpeechRecognition: new () => SpeechRecognition;
}

export {};
