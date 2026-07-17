// @ts-check
/** @type {{ sizeOffset: string, theme: string, localData: string }} */
export const STORAGE_KEYS = {
  sizeOffset: 'cloudSchoolSizeOffset',
  theme: 'cloudSchoolTheme',
  localData: 'cloudSchoolData',
};

/** @type {import('../types.js').LocalData} */
export const localData = {
  books: [
    {
      id: 'b1',
      title: 'كيمياء، الصف العاشر - الوحدة الأولى',
      content:
        'مرحباً بك في وحدة الكيمياء. في هذا الدرس، سنتعرف على العناصر والروابط التساهمية والأيونية وتفاعلات الطاقة والحرارة.',
      audio: '',
    },
    {
      id: 'b2',
      title: 'تاريخ وحضارة الوطن العربي',
      content:
        'مرحباً بك في تاريخ العرب المجيد. سنتعلم اليوم عن الحضارات القديمة التي قامت في شبه الجزيرة العربية والهلال الخصيب ومصر الفرعونية.',
      audio: '',
    },
  ],
  assignments: [
    {
      id: 'a1',
      title: 'واجب العلوم والفيزياء الأول',
      type: 'mcq',
      question: 'ما هو المكون الأساسي لغاز الأوزون؟',
      options: {
        A: 'الهيدروجين',
        B: 'الأكسجين الثلاثي',
        C: 'النيتروجين',
        D: 'غاز ثاني أكسيد الكربون',
      },
      correct: 'B',
    },
    {
      id: 'a2',
      title: 'اختبار اللغة العربية المقالي',
      type: 'text',
      question: 'اكتب فقرة قصيرة تتحدث فيها عن فضل المعلم في المجتمع وأهمية العلم؟',
      ideal: 'يعد العلم ركيزة المجتمعات الأساسية، والمعلم هو النور الذي يبدد الظلام...',
    },
  ],
  submissions: [],
  notifications: [],
  students: [
    { name: 'أحمد خالد', grade: 'الصف العاشر', pin: '0000' },
    { name: 'سارة عبد الله', grade: 'الصف التاسع', pin: '0000' },
  ],
};

/** @type {import('../types.js').UserSession | null} */
export let currentUserSession = null;

export const initialAuthToken =
  typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

export function setCurrentUserSession(val) {
  currentUserSession = val;
}

export function getCurrentUserSession() {
  return currentUserSession;
}
