import * as app from './cloud_school_app.js';
import * as features from './features.js';

// Expose strictly necessary variables and functions to window to satisfy legacy module bindings
const globals = [
  'enterApp',
  'localData',
  'currentUserSession',
  'STORAGE_KEYS',
  '__',
  'speak',
  'addNotification',
  'playTick3D',
  'playSuccess3D',
  'playFail3D',
  'play3DTone',
  'startAiStoryRound',
  'setupAccessibleVoices',
  'renderStudentAssignments',
  'escapeHtml',
  'secureRandomInt',
  'showToast',
  'openStudentSection',
  'closeStudentSection',
  'listenForSpeech',
  'renderTeacherDashboard',
  'renderTeacherSubmissions',
  'renderStudentStats',
  'renderStudentDashboard',
  'checkAgeLimitations',
  'saveLocalData',
  'loadLocalData',
  'renderStudentBooks',
  'controlAudiobook',
  'renderAdminDashboard',
  'renderParentDashboard',
  'serverAvailable',
  'setServerAvailable',
  'saveStudentToFirebase',
  'syncDataFromServer',
  'switchRole',
  'getArabicRoleName',
  'updateNotifBadge',
  'callGeminiAPI',
  'gradeSubmissionWithAI',
  'arabicBrailleMap',
  'printStudentReport',
  'setupOfflineDetection',
  'recordGameScore',
];

globals.forEach((key) => {
  if (app[key] !== undefined) {
    window[key] = app[key];
  } else if (features[key] !== undefined) {
    window[key] = features[key];
  }
});

// Also expose features-specific voice-exam functions
const featureGlobals = [
  'startDialogicClassroom',
  'stopDialogicClassroom',
  'startStudyGroup',
  'stopStudyGroup',
  'toggleVoiceExamMode',
  'readCurrentQuizAloud',
  'startVoiceExamListening',
  'confirmVoiceSubmit',
  'selectQuizOption',
  'doVoiceSubmit',
];

featureGlobals.forEach((key) => {
  if (features[key] !== undefined) {
    window[key] = features[key];
  }
});
