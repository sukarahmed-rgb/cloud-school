// @ts-check
import { escapeHtml } from './helpers.js';

export let _toastTimer = null;

export function showToast(text, isError) {
  const toast = document.getElementById('toast-message');
  if (!toast) {
    return;
  }
  if (_toastTimer) {
    clearTimeout(_toastTimer);
    _toastTimer = null;
  }
  toast.textContent = text;
  toast.className = `fixed bottom-4 right-4 z-50 p-4 font-bold rounded-xl shadow-xl text-xl border-2 ${isError ? 'bg-red-600 text-white border-red-800' : 'bg-yellow-400 text-black border-black'} hidden`;
  toast.classList.remove('hidden');
  _toastTimer = setTimeout(function () {
    toast.classList.add('hidden');
    _toastTimer = null;
  }, 4000);
}

export function showLoading(elementId, message) {
  const el = document.getElementById(elementId);
  if (!el) {
    return;
  }
  el.innerHTML = `<div class="loading-overlay"><span class="loading-spinner"></span><span>${escapeHtml(message)}</span></div>`;
}

export function trapFocus(container) {
  const focusableSelector =
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  function handleKeyDown(e) {
    if (e.key !== 'Tab') {
      return;
    }
    const elements = container.querySelectorAll(focusableSelector);
    if (elements.length === 0) {
      return;
    }
    const first = elements[0];
    const last = elements[elements.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }
  container.addEventListener('keydown', handleKeyDown);
  const observer = new MutationObserver(function () {
    if (!document.body.contains(container)) {
      observer.disconnect();
      container.removeEventListener('keydown', handleKeyDown);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

export function focusElement(elementId) {
  const el = document.getElementById(elementId);
  if (el) {
    el.focus();
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

export function announceToScreenReader(text) {
  const ariaLive = document.getElementById('aria-live');
  if (!ariaLive) {
    return;
  }
  ariaLive.textContent = '';
  requestAnimationFrame(() => {
    ariaLive.textContent = text;
  });
}

/**
 * Initialize a modal dialog overlay: traps focus, closes on Escape,
 * focuses the first focusable element, and restores focus on close.
 * @param {HTMLElement} overlay
 * @returns {() => void} the close function
 */
export function initDialog(overlay) {
  const previouslyFocused =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;
  let closed = false;
  const closeDialog = () => {
    if (closed) {
      return;
    }
    closed = true;
    overlay.remove();
    if (previouslyFocused && document.body.contains(previouslyFocused)) {
      previouslyFocused.focus();
    }
  };
  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeDialog();
    }
  });
  trapFocus(overlay);
  const first = overlay.querySelector(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  );
  if (first instanceof HTMLElement) {
    first.focus();
  }
  return closeDialog;
}
