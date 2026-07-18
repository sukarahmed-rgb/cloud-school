import {
  readCurrentQuizAloud,
  startVoiceExamListening,
  confirmVoiceSubmit,
  doVoiceSubmit,
} from '../../src/modules/voice-exam-listening.js';
import {
  voiceExamActive,
  setVoiceExamActive,
  setVoiceExamListening,
} from '../../src/modules/voice-exam-state.js';

const mockSpeak = jest.fn();
const mockListenForSpeech = jest.fn();
const mockSelectQuizOption = jest.fn();
const mockSubmitQuizAnswer = jest.fn();

jest.mock('../../src/modules/speech.js', () => ({ speak: (...args) => mockSpeak(...args) }));
jest.mock('../../src/modules/i18n.js', () => ({
  __: jest.fn((key, ...args) => {
    const map = {
      voiceExamOptions: 'Options: {0}',
      voiceExamEssayPrompt: 'Essay prompt',
      voiceExamListening: 'Listening',
      voiceExamHelp: 'Help',
      voiceExamHeard: 'Heard: {0}',
      voiceExamRepeat: 'Repeat',
      voiceExamCancelled: 'Cancelled',
      voiceExamConfirmed: 'Confirmed',
      voiceExamSubmitConfirm: 'Submit?',
      voiceExamSubmitted: 'Submitted',
      voiceExamEssayRecorded: 'Recorded',
      voiceExamCommandRepeat: 'repeat',
      voiceExamCommandSubmit: 'submit',
      voiceExamCommandCancel: 'cancel',
      voiceExamCommandYes: 'yes',
      voiceExamCommandNo: 'no',
      optA: 'A',
      optB: 'B',
      optC: 'C',
      optD: 'D',
      dialogicRetry: 'Retry',
    };
    const val = map[key];
    if (val && args.length > 0) {
      return val.replace('{0}', args[0]);
    }
    return val || key;
  }),
}));
jest.mock('../../src/modules/speech-recognition.js', () => ({
  listenForSpeech: (...args) => mockListenForSpeech(...args),
}));
jest.mock('../../src/modules/quizzes.js', () => ({
  selectQuizOption: (...args) => mockSelectQuizOption(...args),
  submitQuizAnswer: (...args) => mockSubmitQuizAnswer(...args),
}));

describe('voice-exam-listening.js', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="active-quiz-title">Quiz Title</div>
      <div id="quiz-question-container" class="">
        <div id="quiz-question-text">Question text</div>
        <button id="btn-opt-A"><span>Option A</span></button>
        <button id="btn-opt-B"><span>Option B</span></button>
      </div>
      <div id="quiz-text-input-section" class="hidden">
        <textarea id="assignment-student-answer"></textarea>
      </div>
      <div id="voice-exam-status"></div>
      <button id="btn-voice-exam-toggle">Activate</button>
    `;

    mockSpeak.mockClear();
    mockListenForSpeech.mockClear();
    mockSelectQuizOption.mockClear();
    mockSubmitQuizAnswer.mockClear();
    jest.useFakeTimers();
    window._voiceExamPendingSubmit = false;
    window._voiceExamPendingOption = null;
    setVoiceExamActive(true);
    setVoiceExamListening(false);
  });

  afterEach(() => {
    jest.useRealTimers();
    setVoiceExamActive(false);
  });

  describe('readCurrentQuizAloud', () => {
    test('reads quiz title and question text with options', () => {
      readCurrentQuizAloud();
      expect(mockSpeak).toHaveBeenCalledWith('Quiz Title');
      expect(mockSpeak).toHaveBeenCalledWith('Question text');
      jest.advanceTimersByTime(2000);
      expect(mockSpeak).toHaveBeenCalledWith('Options: Option A ، Option B');
    });

    test('does nothing when voice exam inactive', () => {
      setVoiceExamActive(false);
      readCurrentQuizAloud();
      expect(mockSpeak).not.toHaveBeenCalled();
    });

    test('handles essay-type quiz', () => {
      document.getElementById('quiz-question-container').classList.add('hidden');
      document.getElementById('quiz-text-input-section').classList.remove('hidden');
      readCurrentQuizAloud();
      jest.advanceTimersByTime(2000);
      expect(mockSpeak).toHaveBeenCalledWith('Essay prompt');
      expect(mockListenForSpeech).toHaveBeenCalled();
    });
  });

  describe('startVoiceExamListening', () => {
    test('starts listening and calls listenForSpeech', () => {
      startVoiceExamListening();
      expect(mockListenForSpeech).toHaveBeenCalled();
    });

    test('does nothing if already listening', () => {
      setVoiceExamListening(true);
      startVoiceExamListening();
      expect(mockListenForSpeech).not.toHaveBeenCalled();
    });

    test('does nothing if voice exam inactive', () => {
      setVoiceExamActive(false);
      startVoiceExamListening();
      expect(mockListenForSpeech).not.toHaveBeenCalled();
    });
  });

  describe('voice commands', () => {
    test('repeat command re-reads quiz aloud', () => {
      startVoiceExamListening();
      const callback = mockListenForSpeech.mock.calls[0][0];
      callback('كرر');
      jest.advanceTimersByTime(1500);
      expect(mockSpeak).toHaveBeenCalledWith('Repeat');
      expect(mockSpeak).toHaveBeenCalledWith('Quiz Title');
    });

    test('cancel command restarts listening', () => {
      startVoiceExamListening();
      const callback = mockListenForSpeech.mock.calls[0][0];
      callback('إلغاء');
      jest.advanceTimersByTime(1500);
      expect(mockSpeak).toHaveBeenCalledWith('Cancelled');
    });

    test('submit command triggers confirmVoiceSubmit', () => {
      startVoiceExamListening();
      const callback = mockListenForSpeech.mock.calls[0][0];
      callback('إرسال');
      expect(mockSpeak).toHaveBeenCalledWith('Submit?');
    });

    test('no command restarts listening', () => {
      startVoiceExamListening();
      const callback = mockListenForSpeech.mock.calls[0][0];
      callback('');
      jest.advanceTimersByTime(1500);
      expect(mockSpeak).toHaveBeenCalledWith('Retry');
    });
  });

  describe('doVoiceSubmit', () => {
    test('calls submitQuizAnswer and deactivates', () => {
      doVoiceSubmit();
      expect(mockSubmitQuizAnswer).toHaveBeenCalled();
      expect(voiceExamActive).toBe(false);
      expect(document.getElementById('voice-exam-status').textContent).toBe('Submitted');
    });
  });

  describe('confirmVoiceSubmit', () => {
    test('confirms and calls doVoiceSubmit on yes', () => {
      confirmVoiceSubmit();
      const callback = mockListenForSpeech.mock.calls[0][0];
      callback('نعم');
      expect(mockSubmitQuizAnswer).toHaveBeenCalled();
    });

    test('cancels on no', () => {
      confirmVoiceSubmit();
      const callback = mockListenForSpeech.mock.calls[0][0];
      callback('لا');
      expect(mockSubmitQuizAnswer).not.toHaveBeenCalled();
    });
  });
});
