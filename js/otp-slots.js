// =====================================================================
// OTP SLOTS UI — Aliftzy Store
// =====================================================================
// File TAMBAHAN (additive) yang HANYA menangani interaksi visual 6 kotak
// digit OTP pada #page-otp:
//   - auto-focus slot pertama, auto-advance ke slot berikutnya
//   - backspace pada slot kosong -> kembali ke slot sebelumnya
//   - paste 6 digit (atau autofill iOS/Android yang menaruh semua digit
//     ke satu slot) -> otomatis disebar ke seluruh slot
//   - animasi orbit/error/verifying/success
//
// File ini TIDAK memanggil Firebase, TIDAK memanggil endpoint OTP apa
// pun, dan TIDAK mengetahui apa-apa soal auth/session. Ia hanya membaca
// & menulis DOM, lalu menyinkronkan gabungan 6 digit ke input tersembunyi
// #otp-code — elemen yang SAMA yang selama ini dibaca oleh
// handleVerifyOtp() di js/app.js. Dengan begitu logic verifikasi/kirim
// OTP di app.js tidak perlu (dan tidak) diubah cara bacanya.
//
// js/app.js memanggil beberapa fungsi opsional di sini lewat pengecekan
// `typeof window.fn === 'function'`, jadi kalau file ini gagal dimuat,
// alur OTP lama (tanpa animasi) tetap berjalan seperti biasa.
// =====================================================================
(function () {
  'use strict';

  var slots = [];
  var hiddenInput = null;
  var wrap = null;
  var orbit = null;
  var errorResetTimer = null;

  function byId(id) { return document.getElementById(id); }

  function init() {
    wrap = byId('otp-slots');
    if (!wrap) return; // halaman OTP versi lama / markup tidak ditemukan
    slots = Array.prototype.slice.call(wrap.querySelectorAll('.otp-slot'));
    if (!slots.length) return;

    hiddenInput = byId('otp-code');
    orbit = byId('otp-orbit');

    slots.forEach(function (input, idx) {
      input.addEventListener('input', function (e) { onSlotInput(input, idx, e); });
      input.addEventListener('keydown', function (e) { onSlotKeydown(input, idx, e); });
      input.addEventListener('paste', function (e) { onSlotPaste(input, idx, e); });
      input.addEventListener('focus', function () {
        input.select();
        wrap.classList.remove('is-error');
      });
    });

    syncHidden();
  }

  function onlyDigits(str) { return (str || '').replace(/\D/g, ''); }

  function syncHidden() {
    var code = slots.map(function (s) { return onlyDigits(s.value).slice(0, 1); }).join('');
    if (hiddenInput) hiddenInput.value = code;
  }

  function popAnim(input) {
    input.classList.remove('otp-pop');
    void input.offsetWidth; // reflow supaya animasi bisa retrigger
    input.classList.add('otp-pop');
  }

  function onSlotInput(input, idx) {
    var digits = onlyDigits(input.value);

    // Autofill (iOS QuickType / Android) kadang menaruh SELURUH kode ke
    // satu slot walau maxlength="1" — deteksi lalu sebar ke slot lain,
    // sama seperti perilaku paste.
    if (digits.length > 1) {
      distribute(digits, idx);
      return;
    }

    input.value = digits;
    input.classList.toggle('is-filled', !!digits);
    if (digits) {
      popAnim(input);
      var next = slots[idx + 1];
      if (next) next.focus();
      else input.blur();
    }
    syncHidden();
  }

  function onSlotKeydown(input, idx, e) {
    if (e.key === 'Backspace') {
      if (input.value) return; // biarkan default menghapus isi slot ini
      var prev = slots[idx - 1];
      if (prev) {
        e.preventDefault();
        prev.value = '';
        prev.classList.remove('is-filled');
        prev.focus();
        syncHidden();
      }
      return;
    }
    if (e.key === 'ArrowLeft') {
      var p = slots[idx - 1];
      if (p) { e.preventDefault(); p.focus(); }
      return;
    }
    if (e.key === 'ArrowRight') {
      var n = slots[idx + 1];
      if (n) { e.preventDefault(); n.focus(); }
      return;
    }
    if (e.key === 'Enter') {
      var btn = byId('btn-otp-verify');
      if (btn && !btn.disabled) { e.preventDefault(); btn.click(); }
      return;
    }
    // Cegah karakter selain digit, biarkan tombol kontrol (Tab, Delete, dst) lewat.
    if (e.key.length === 1 && !/[0-9]/.test(e.key)) {
      e.preventDefault();
    }
  }

  function onSlotPaste(input, idx, e) {
    var clip = e.clipboardData || window.clipboardData;
    var text = clip ? clip.getData('text') : '';
    var digits = onlyDigits(text);
    if (!digits) return;
    e.preventDefault();
    distribute(digits, 0); // paste selalu mengisi dari slot pertama
  }

  function distribute(digits, startIdx) {
    var maxLen = slots.length - startIdx;
    digits = digits.slice(0, maxLen);
    var i = startIdx;
    for (var d = 0; d < digits.length; d++, i++) {
      slots[i].value = digits[d];
      slots[i].classList.add('is-filled');
      popAnim(slots[i]);
    }
    syncHidden();
    var lastFilledIdx = startIdx + digits.length - 1;
    var focusTarget = slots[lastFilledIdx + 1] || slots[lastFilledIdx];
    if (focusTarget) focusTarget.focus();
  }

  // ---- Hook opsional yang dipanggil dari js/app.js (defensif) ----

  window.otpSlotsReset = function () {
    if (!slots.length) return;
    clearTimeout(errorResetTimer);
    slots.forEach(function (s) {
      s.value = '';
      s.disabled = false;
      s.classList.remove('is-filled', 'otp-pop');
    });
    if (wrap) wrap.classList.remove('is-error', 'is-verifying', 'is-success');
    if (orbit) orbit.classList.remove('is-verifying', 'is-success');
    syncHidden();
    slots[0].focus();
  };

  window.otpSlotsSetVerifying = function (isVerifying) {
    if (!slots.length) return;
    slots.forEach(function (s) { s.disabled = !!isVerifying; });
    if (wrap) wrap.classList.toggle('is-verifying', !!isVerifying);
    if (orbit) orbit.classList.toggle('is-verifying', !!isVerifying);
  };

  window.otpSlotsError = function () {
    if (!wrap || !slots.length) return;
    clearTimeout(errorResetTimer);
    wrap.classList.remove('is-error');
    void wrap.offsetWidth;
    wrap.classList.add('is-error');
    errorResetTimer = setTimeout(function () {
      wrap.classList.remove('is-error');
      slots.forEach(function (s) { s.value = ''; s.classList.remove('is-filled'); });
      syncHidden();
      slots[0].focus();
    }, 420);
  };

  window.otpSlotsSuccess = function () {
    return new Promise(function (resolve) {
      if (wrap) wrap.classList.add('is-success');
      if (orbit) orbit.classList.add('is-success');
      setTimeout(resolve, 650);
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
