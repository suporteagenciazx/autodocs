(function (global) {
  function bindPinRow(row, options) {
    if (!row) return;
    const opts = options && typeof options === 'object' ? options : {};
    if (typeof opts.onComplete === 'function') {
      row._autodocsPinOnComplete = opts.onComplete;
    }
    if (row.dataset.pinBound === '1') return;
    const boxes = Array.from(row.querySelectorAll('.autodocs-pin-box'));
    if (!boxes.length) return;
    row.dataset.pinBound = '1';

    function notifyIfComplete() {
      const pin = boxes.map(b => b.value).join('');
      if (/^\d+$/.test(pin) && pin.length === boxes.length && typeof row._autodocsPinOnComplete === 'function') {
        row._autodocsPinOnComplete(pin);
      }
    }

    boxes.forEach((box, idx) => {
      box.addEventListener('input', () => {
        const v = box.value.replace(/\D/g, '').slice(-1);
        box.value = v;
        if (v && idx < boxes.length - 1) boxes[idx + 1].focus();
        notifyIfComplete();
      });
      box.addEventListener('keydown', e => {
        if (e.key === 'Backspace' && !box.value && idx > 0) {
          boxes[idx - 1].focus();
          boxes[idx - 1].value = '';
          e.preventDefault();
        }
        if (e.key === 'ArrowLeft' && idx > 0) {
          boxes[idx - 1].focus();
          e.preventDefault();
        }
        if (e.key === 'ArrowRight' && idx < boxes.length - 1) {
          boxes[idx + 1].focus();
          e.preventDefault();
        }
      });
      box.addEventListener('paste', e => {
        const text = (e.clipboardData || window.clipboardData).getData('text') || '';
        const digits = text.replace(/\D/g, '').slice(0, boxes.length);
        if (!digits) return;
        e.preventDefault();
        digits.split('').forEach((d, i) => {
          if (boxes[i]) boxes[i].value = d;
        });
        const focusIdx = Math.min(digits.length, boxes.length - 1);
        boxes[focusIdx].focus();
        notifyIfComplete();
      });
    });
  }

  function readPin(row) {
    if (!row) return '';
    return Array.from(row.querySelectorAll('.autodocs-pin-box'))
      .map(b => b.value)
      .join('');
  }

  function clearPin(row) {
    if (!row) return;
    row.querySelectorAll('.autodocs-pin-box').forEach(b => {
      b.value = '';
    });
    const first = row.querySelector('.autodocs-pin-box');
    if (first) first.focus();
  }

  function autoBindAll(root) {
    (root || document).querySelectorAll('[data-pin-length]').forEach(bindPinRow);
  }

  global.AutoDocsPinInput = { bindPinRow, readPin, clearPin, autoBindAll };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => autoBindAll());
  } else {
    autoBindAll();
  }
})(window);
