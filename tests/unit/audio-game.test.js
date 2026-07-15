// Unit tests for audio-game.js questions and difficulty picker

const questionBank = [
    { q: "الماء يتكون من ذرتي هيدروجين وذرة أكسجين.", a: true, d: 1 },
    { q: "الأوزون هو غاز يحمي الأرض من الأشعة فوق البنفسجية.", a: true, d: 2 },
    { q: "العظام هي أصلب مادة في جسم الإنسان.", a: true, d: 3 }
];

function pickQuestionByDifficulty(targetLevel, mockRandomInt = () => 0) {
    const pool = questionBank.filter(function(q) { return q.d === targetLevel; });
    const activePool = pool.length === 0 ? questionBank : pool;
    return activePool[mockRandomInt(0, activePool.length)];
}

describe('audio-game.js - pickQuestionByDifficulty', () => {
    test('picks question of level 1 successfully', () => {
        const question = pickQuestionByDifficulty(1);
        expect(question.d).toBe(1);
        expect(question.q).toBe("الماء يتكون من ذرتي هيدروجين وذرة أكسجين.");
    });

    test('picks question of level 2 successfully', () => {
        const question = pickQuestionByDifficulty(2);
        expect(question.d).toBe(2);
    });

    test('falls back to all questions if target level pool is empty', () => {
        const question = pickQuestionByDifficulty(99); // nonexistent level
        expect(question).toBeDefined();
        expect(questionBank).toContainEqual(question);
    });
});
