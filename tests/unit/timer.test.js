// tests/unit/timer.test.js
/**
 * Test to verify Timer logic.
 */

describe('Timer Logic', () => {
    let gameTimeLeft = 30;
    let gameTimerInterval = null;

    beforeEach(() => {
        jest.useFakeTimers();
        gameTimeLeft = 30;
        gameTimerInterval = null;
    });

    afterEach(() => {
        jest.useRealTimers();
        if (gameTimerInterval) clearInterval(gameTimerInterval);
    });

    function startMockTimer(onTick, onEnd) {
        if (gameTimerInterval) clearInterval(gameTimerInterval);
        
        // This is the fixed logic: intervals of 1000ms instead of 10ms for seconds.
        gameTimerInterval = setInterval(() => {
            gameTimeLeft--;
            if (onTick) onTick(gameTimeLeft);
            if (gameTimeLeft <= 0) {
                clearInterval(gameTimerInterval);
                if (onEnd) onEnd();
            }
        }, 1000);
    }

    it('should decrease the time left by 1 every 1000ms', () => {
        const onTick = jest.fn();
        startMockTimer(onTick);

        jest.advanceTimersByTime(1000);
        expect(gameTimeLeft).toBe(29);
        expect(onTick).toHaveBeenCalledWith(29);

        jest.advanceTimersByTime(2000);
        expect(gameTimeLeft).toBe(27);
        expect(onTick).toHaveBeenCalledTimes(3); // +2 calls
    });

    it('should call onEnd and stop timer when reaching 0', () => {
        const onEnd = jest.fn();
        startMockTimer(null, onEnd);

        jest.advanceTimersByTime(30000); // 30 seconds
        expect(gameTimeLeft).toBe(0);
        expect(onEnd).toHaveBeenCalledTimes(1);

        // Advance more, should not go below 0 or call onEnd again
        jest.advanceTimersByTime(2000);
        expect(gameTimeLeft).toBe(0);
        expect(onEnd).toHaveBeenCalledTimes(1);
    });
});
