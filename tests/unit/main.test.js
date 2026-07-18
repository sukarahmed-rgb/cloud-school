describe('main.js', () => {
  beforeEach(() => {
    delete window.__;
  });

  test('exposes app globals on window', () => {
    window.__ = jest.fn((k) => k);
    jest.isolateModules(() => {
      require('../../src/main.js');
    });
    expect(typeof window.enterApp).toBe('function');
    expect(typeof window.__).toBe('function');
    expect(typeof window.speak).toBe('function');
    expect(typeof window.addNotification).toBe('function');
    expect(typeof window.playTick3D).toBe('function');
    expect(typeof window.playSuccess3D).toBe('function');
    expect(typeof window.playFail3D).toBe('function');
    expect(typeof window.play3DTone).toBe('function');
    expect(typeof window.setupAccessibleVoices).toBe('function');
    expect(typeof window.renderStudentAssignments).toBe('function');
    expect(typeof window.escapeHtml).toBe('function');
    expect(typeof window.secureRandomInt).toBe('function');
    expect(typeof window.showToast).toBe('function');
    expect(typeof window.openStudentSection).toBe('function');
    expect(typeof window.closeStudentSection).toBe('function');
    expect(typeof window.listenForSpeech).toBe('function');
    expect(typeof window.renderTeacherDashboard).toBe('function');
    expect(typeof window.renderTeacherSubmissions).toBe('function');
    expect(typeof window.renderStudentStats).toBe('function');
    expect(typeof window.renderStudentDashboard).toBe('function');
    expect(typeof window.checkAgeLimitations).toBe('function');
    expect(typeof window.saveLocalData).toBe('function');
    expect(typeof window.loadLocalData).toBe('function');
    expect(typeof window.renderStudentBooks).toBe('function');
    expect(typeof window.controlAudiobook).toBe('function');
    expect(typeof window.renderAdminDashboard).toBe('function');
    expect(typeof window.renderParentDashboard).toBe('function');
    expect(typeof window.serverAvailable).toBe('boolean');
    expect(typeof window.setServerAvailable).toBe('function');
    expect(typeof window.saveStudentToFirebase).toBe('function');
    expect(typeof window.syncDataFromServer).toBe('function');
    expect(typeof window.switchRole).toBe('function');
    expect(typeof window.getArabicRoleName).toBe('function');
    expect(typeof window.updateNotifBadge).toBe('function');
    expect(typeof window.callGeminiAPI).toBe('function');
    expect(typeof window.gradeSubmissionWithAI).toBe('function');
    expect(typeof window.arabicBrailleMap).toBe('object');
  });
});
