describe('firebase-client.js', () => {
  beforeEach(() => {
    jest.resetModules();
    delete window.firebase;
    delete window.__firebase_config;
  });

  test('initFirebase does nothing when firebase SDK not loaded', async () => {
    const { initFirebase, app } = await import('../../src/modules/firebase-client.js');
    await initFirebase();
    expect(app).toBeNull();
  });

  test('initFirebase does nothing when config is empty', async () => {
    const { initFirebase, app } = await import('../../src/modules/firebase-client.js');
    window.firebase = {
      initializeApp: jest.fn(),
      auth: jest.fn(() => ({ onAuthStateChanged: jest.fn() })),
    };
    await initFirebase();
    expect(app).toBeNull();
  });

  test('initFirebase works with string config', async () => {
    window.__firebase_config = JSON.stringify({ apiKey: 'test' });
    const mockAuth = { useDeviceLanguage: jest.fn(), onAuthStateChanged: jest.fn() };
    window.firebase = {
      initializeApp: jest.fn(() => ({})),
      auth: jest.fn(() => mockAuth),
    };
    const { initFirebase } = await import('../../src/modules/firebase-client.js');
    await initFirebase();
    expect(window.firebase.initializeApp).toHaveBeenCalled();
  });

  test('initFirebase does not throw when config is invalid JSON string', async () => {
    window.__firebase_config = 'not-json';
    window.firebase = {
      initializeApp: jest.fn(),
      auth: jest.fn(() => ({ onAuthStateChanged: jest.fn() })),
    };
    const { initFirebase } = await import('../../src/modules/firebase-client.js');
    await expect(initFirebase()).resolves.toBeUndefined();
  });
});
