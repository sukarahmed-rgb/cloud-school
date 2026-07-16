// Test error handler patterns
describe('Error Handler Patterns', () => {
  let errors = [];
  const mockListeners = [];

  function mockOnError(cb) {
    mockListeners.push(cb);
  }
  function mockHandleError(context, error) {
    const msg = error?.message || String(error);
    const level = error?.fatal ? 'fatal' : 'error';
    mockListeners.forEach((fn) => fn(level, context, error));
    return { level, context, message: msg };
  }

  beforeEach(() => {
    errors = [];
    mockListeners.length = 0;
  });

  test('should return error level and context', () => {
    const result = mockHandleError('testCtx', new Error('test msg'));
    expect(result.context).toBe('testCtx');
    expect(result.level).toBe('error');
    expect(result.message).toBe('test msg');
  });

  test('should differentiate fatal errors', () => {
    const err = new Error('fatal');
    err.fatal = true;
    const result = mockHandleError('fatalCtx', err);
    expect(result.level).toBe('fatal');
  });

  test('should notify registered listeners', () => {
    mockOnError((level, ctx) => errors.push({ level, ctx }));
    mockHandleError('test', new Error('e'));
    expect(errors.length).toBe(1);
    expect(errors[0].ctx).toBe('test');
  });
});
