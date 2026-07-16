let ctx = null;

/**
 * Configure the auth module with dependencies from the main app controller.
 * This dependency injection pattern prevents circular imports.
 */
export function configureAuth(context) {
  ctx = context;
}

export function checkAgeLimitations() {
  if (!ctx) return;
  const role = document.getElementById('reg-role').value;
  if (role !== 'student') return;

  const ageInput = document.getElementById('reg-age');
  const age = parseInt(ageInput.value, 10);
  const warningBox = document.getElementById('auth-warning-box');
  const warningText = document.getElementById('auth-warning-text');
  const parentContactInput = document.getElementById('reg-parent-contact');
  const labelParentContact = document.getElementById('label-parent-contact');
  const btnAuthSubmit = document.getElementById('btn-auth-submit');

  warningBox.classList.add('hidden');
  parentContactInput.required = false;

  if (isNaN(age)) return;

  if (age < 12) {
    const msg = ctx.__("ageUnder12");
    warningText.textContent = msg;
    warningBox.classList.remove('hidden');
    btnAuthSubmit.disabled = true;
    btnAuthSubmit.classList.add('opacity-50', 'cursor-not-allowed');
    ctx.speak(msg);
  } else {
    btnAuthSubmit.disabled = false;
    btnAuthSubmit.classList.remove('opacity-50', 'cursor-not-allowed');
    parentContactInput.required = true;
    parentContactInput.setAttribute('required', 'required');
    labelParentContact.innerHTML = ctx.__('parentContactLabel');
    ctx.speak(ctx.__('ageConfirm12'));
  }
}

export async function handleLoginSubmit(e) {
  if (!ctx) return;
  e.preventDefault();
  const email = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value.trim();

  const warningBox = document.getElementById('auth-warning-box');
  const warningText = document.getElementById('auth-warning-text');
  warningBox.classList.add('hidden');

  if (!email || !password) {
    warningText.textContent = ctx.__('loginRequired');
    warningBox.classList.remove('hidden');
    ctx.speak(ctx.__('loginRequired'));
    return;
  }

  try {
    if (typeof firebase !== 'undefined' && firebase.auth) {
      const cred = await firebase.auth().signInWithEmailAndPassword(email, password);
      let session;
      if (ctx.serverAvailable && cred.user) {
        try {
          const idToken = await cred.user.getIdToken();
          const user = await ctx.serverLoginFirebase(idToken);
          session = {
            name: user.name || email,
            contact: email,
            role: user.role || 'student',
            serverId: user.id || cred.user.uid,
            serverAuth: true
          };
          ctx.syncDataFromServer();
        } catch (err) {
          console.warn('Proxy session after Firebase login failed:', err.message);
          session = {
            name: email.split('@')[0],
            contact: email,
            role: 'student',
            userId: cred.user.uid,
            serverAuth: false
          };
        }
      } else {
        session = {
          name: email.split('@')[0],
          contact: email,
          role: 'student',
          userId: cred.user.uid,
          serverAuth: false
        };
      }
      enterApp(session);
    } else {
      warningText.textContent = ctx.__('errorNetwork');
      warningBox.classList.remove('hidden');
      ctx.speak(ctx.__('errorNetwork'));
    }
  } catch (err) {
    console.error('Login error:', err);
    let msg = ctx.__('loginFailed');
    if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
      msg = ctx.__('loginFailed');
    } else if (err.code === 'auth/invalid-email') {
      msg = ctx.__('loginFailed');
    } else if (err.code === 'auth/too-many-requests') {
      msg = ctx.__('loginTooMany');
    }
    warningText.textContent = msg;
    warningBox.classList.remove('hidden');
    ctx.speak(msg);
  }
}

export function enterApp(session) {
  if (!ctx) return;
  ctx.setCurrentUserSession(session);
  document.getElementById('auth-gate').classList.add('hidden');
  document.getElementById('dev-role-bar').classList.remove('hidden');
  document.querySelector('[data-action="logout"]')?.classList.remove('hidden');
  document.getElementById('active-user-badge').textContent = ctx.__('userBadge', session.name, ctx.getArabicRoleName(session.role));
  ctx.switchRole(session.role);
  ctx.showToast(ctx.__('loginSuccess', session.name));
  if (session.serverAuth) ctx.syncDataFromServer();
}

export async function handleRegistrationSubmit(e) {
  if (!ctx) return;
  e.preventDefault();
  const name = document.getElementById('reg-name').value.trim();
  const contact = document.getElementById('reg-contact').value.trim();
  const role = document.getElementById('reg-role').value;
  const age = parseInt(document.getElementById('reg-age').value, 10);
  const plainPassword = document.getElementById('reg-password-new').value;

  const warningBox = document.getElementById('auth-warning-box');
  const warningText = document.getElementById('auth-warning-text');
  warningBox.classList.add('hidden');

  let parentContact = '';
  if (role === 'student') {
    if (age < 12) {
      const msg = ctx.__("registerAgeRestriction");
      warningText.textContent = msg;
      warningBox.classList.remove('hidden');
      ctx.speak(msg);
      return;
    }
    parentContact = document.getElementById('reg-parent-contact').value.trim();
    if (!parentContact) {
      const msg = ctx.__("registerParentRequired");
      warningText.textContent = msg;
      warningBox.classList.remove('hidden');
      ctx.speak(msg);
      document.getElementById('reg-parent-contact').focus();
      return;
    }
  }

  try {
    if (typeof firebase !== 'undefined' && firebase.auth) {
      const cred = await firebase.auth().createUserWithEmailAndPassword(contact, plainPassword);
      await cred.user.updateProfile({ displayName: name });

      if (ctx.serverAvailable) {
        try {
          const idToken = await cred.user.getIdToken();
          const user = await ctx.serverRegisterFirebase(idToken, name, role, age, parentContact);
          enterApp({
            name: user.name || name,
            contact: user.email || contact,
            role: user.role || role,
            serverId: user.id || cred.user.uid,
            serverAuth: true
          });
          return;
        } catch (err) {
          console.warn('Proxy registration after Firebase failed:', err.message);
        }
      }

      enterApp({
        name: name,
        contact: contact,
        role: role,
        age: age,
        parentContact: parentContact,
        userId: cred.user.uid,
        serverAuth: false
      });
    } else {
      const msg = ctx.__('errorNetwork');
      warningText.textContent = msg;
      warningBox.classList.remove('hidden');
      ctx.speak(msg);
    }
  } catch (err) {
    console.error('Registration error:', err);
    let msg = ctx.__('loginFailed');
    if (err.code === 'auth/email-already-in-use') msg = ctx.__('loginFailed');
    else if (err.code === 'auth/weak-password') msg = ctx.__('loginFailed');
    else if (err.code === 'auth/invalid-email') msg = ctx.__('loginFailed');
    warningText.textContent = msg;
    warningBox.classList.remove('hidden');
    ctx.speak(msg);
  }
}

export function logout() {
  if (!ctx) return;
  const session = ctx.getCurrentUserSession();
  if (session?.serverAuth) ctx.serverLogout();
  if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().signOut().catch(function(e) { console.warn('Firebase signOut error:', e); });
  }
  ctx.setCurrentUserSession(null);
  ctx.setUserId(null);
  ctx.setIsAuthReady(false);
  ctx.clearAllTimers();
  document.getElementById('auth-gate').classList.remove('hidden');
  document.getElementById('dev-role-bar').classList.add('hidden');
  document.querySelector('[data-action="logout"]')?.classList.add('hidden');
  document.getElementById('login-form-container').classList.remove('hidden');
  document.getElementById('register-form-container').classList.add('hidden');
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
  ctx.speak(ctx.__('logoutSuccess'));
}
