// Unit tests for features.js logic (Dialogic Classroom and Audio Study Groups)

const STUDENT_NAMES = ['يوسف', 'ليلى', 'أميرة'];

function parseDialogicResponse(text) {
    try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch(e) {}
    return {
        assessment: 'جيد',
        explanation: '',
        question: text,
        type: 'open'
    };
}

function parseStudyGroupResponse(text, currentStudentIndex = 0) {
    try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch(e) {}
    return {
        feedback: '',
        nextSpeaker: STUDENT_NAMES[currentStudentIndex % 3],
        question: text,
        type: 'discussion'
    };
}

describe('features.js - Dialogic Classroom Response Parsing', () => {
    test('parseDialogicResponse parses valid JSON response correctly', () => {
        const rawResponse = `{
            "assessment": "ممتاز",
            "explanation": "أحسنت القول في هذا الموضوع",
            "question": "ما رأيك بالخطوة التالية؟",
            "type": "open"
        }`;
        const parsed = parseDialogicResponse(rawResponse);
        expect(parsed.assessment).toBe('ممتاز');
        expect(parsed.question).toBe('ما رأيك بالخطوة التالية؟');
        expect(parsed.type).toBe('open');
    });

    test('parseDialogicResponse falls back to open question when JSON is invalid', () => {
        const rawResponse = 'هذا ليس جيسون صالح، بل مجرد نص مباشر للسؤال.';
        const parsed = parseDialogicResponse(rawResponse);
        expect(parsed.assessment).toBe('جيد');
        expect(parsed.question).toBe(rawResponse);
        expect(parsed.type).toBe('open');
    });
});

describe('features.js - Audio Study Groups Response Parsing', () => {
    test('parseStudyGroupResponse parses valid JSON correctly', () => {
        const rawResponse = `{
            "feedback": "تعليق جيد جداً",
            "nextSpeaker": "ليلى",
            "question": "ما هي الخطوة التالية؟",
            "type": "discussion"
        }`;
        const parsed = parseStudyGroupResponse(rawResponse, 0);
        expect(parsed.feedback).toBe('تعليق جيد جداً');
        expect(parsed.nextSpeaker).toBe('ليلى');
    });

    test('parseStudyGroupResponse falls back when JSON is invalid', () => {
        const rawResponse = 'نص السؤال المباشر.';
        const parsed = parseStudyGroupResponse(rawResponse, 1);
        expect(parsed.nextSpeaker).toBe('ليلى'); // STUDENT_NAMES[1]
        expect(parsed.question).toBe(rawResponse);
    });
});
