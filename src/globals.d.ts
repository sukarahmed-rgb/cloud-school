declare global {
  interface LocalData {
    books: Book[];
    assignments: Assignment[];
    submissions: Submission[];
    notifications: CloudNotification[];
    students: Student[];
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

  // Firebase
  var firebase: {
    initializeApp: (config: Record<string, unknown>) => unknown;
    auth: () => {
      onAuthStateChanged: (cb: (user: FirebaseUser | null) => void) => void;
      signInWithEmailAndPassword: (email: string, password: string) => Promise<FirebaseCredential>;
      createUserWithEmailAndPassword: (email: string, password: string) => Promise<FirebaseCredential>;
      signOut: () => Promise<void>;
      currentUser: FirebaseUser | null;
    };
    firestore: () => {
      collection: (name: string) => unknown;
    };
    analytics: () => { logEvent: (name: string, params?: unknown) => void };
    apps: unknown[];
  };

  // Runtime globals (accessible without window. prefix)
  var __: (key: string, ...args: (string | number)[]) => string;
  var speak: (text: string) => void;
  var localData: LocalData;
  var __speechLang: string;
  var Sentry: { captureException: (err: unknown, hint?: unknown) => void; init: (config: Record<string, unknown>) => void } | undefined;
  var ageLevelLabels: Record<string, string>;
  var currentAgeLevel: string;
  var callGeminiAPI: (userQuery: string, systemPrompt: string, maxRetries?: number) => Promise<string>;
  var startAiStoryRound: (choiceIndex?: number | null) => Promise<void>;
  var getPrompt: (lang: string, arabicText: string, englishText: string) => string;
  var getCurrentLang: () => string;
  var updateBraillePreview: () => void;
  var updateCheatPreview: () => void;
  var arabicBrailleMap: Map<Set<number>, string>;
  var listenForSpeech: (callback: (text: string) => void, timeoutMs?: number) => void;
  var startQuiz: (quizId: string) => void;
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
  var _voiceExamPendingSubmit: boolean;
  var _voiceExamPendingOption: string;
  var STORAGE_KEYS: { sizeOffset: string; theme: string; localData: string };
  var escapeHtml: (str: unknown) => string;
  var secureRandomInt: (min: number, max: number) => number;
  var saveLocalData: () => boolean;
  var loadLocalData: () => boolean;
  var showToast: (msg: string) => void;
  var currentUserSession: UserSession | null;
  var serverAvailable: boolean;
  var serverSave: (collection: string, data: unknown) => Promise<unknown>;
  var getGeminiKey: () => string;
  var updateNotifBadge: () => void;
  var addNotification: (title: string, message: string, type: string) => void;
  var announceToScreenReader: (msg: string) => void;
  var setupAccessibleVoices: () => void;
  var renderStudentBooks: () => void;
  var renderStudentAssignments: () => void;
  var renderStudentDashboard: () => void;
  var renderStudentStats: () => void;
  var renderTeacherDashboard: () => void;
  var renderTeacherSubmissions: () => void;
  var renderParentDashboard: () => void;
  var renderAdminDashboard: () => void;
  var gradeSubmissionWithAI: (submissionId: string | number) => void;
  var getArabicRoleName: (role: string) => string;
  var switchRole: (role: string) => void;
  var syncDataFromServer: () => void;
  var checkAgeLimitations: () => void;
  var adjustTextSize: (direction: number) => void;
  var cycleTheme: () => void;
  var toggleAudioRecording: () => void;
  var play3DTone: (startFreq: number, endFreq: number, type?: string, duration?: number, panX?: number, panY?: number, panZ?: number) => void;
  var playSuccess3D: () => void;
  var playFail3D: () => void;
  var playTick3D: () => void;
  var controlAudiobook: (action: string) => void;
  var readActiveBookWithAi: () => void;
  var selectQuizOption: (option: string) => void;
  var submitQuizAnswer: () => void;
  var toggleCheatDot: (dot: number) => void;
  var pronounceCheatBraille: () => void;
  var clearCheatDots: () => void;
  var toggleBrailleKeyboard: (mode: string) => void;
  var toggleBrailleDot: (dot: number | number[]) => void;
  var enterBrailleChar: () => void;
  var clearBrailleDots: () => void;
  var addSpaceToAnswer: () => void;
  var deleteLastChar: () => void;
  var saveSubmissionToFirebase: (submission: Submission) => void;
  var saveBookToFirebase: (book: Book) => void;
  var saveQuizToFirebase: (quiz: Assignment) => void;
  var saveStudentToFirebase: (student: Student) => void;
  var toggleTtsEngine: () => void;
  var toggleScreenReaderMode: () => void;
  var toggleAudioCoPilot: () => void;
  var openStudentSection: (section: string) => void;
  var closeStudentSection: () => void;
  var setupKeyboardShortcuts: () => void;
  var stopAllAudio: () => void;
  var screenReaderMode: boolean;
  var speechRecognizer: unknown;
  var i18n: Record<string, string>;
}

export {};
