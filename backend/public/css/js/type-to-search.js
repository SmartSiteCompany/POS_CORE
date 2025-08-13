/* public/js/type-to-search.js */
(function () {
  function isEditable(el) {
    if (!el) return false;
    const tag = el.tagName;
    return (
      (tag === 'INPUT' && !['button','submit','checkbox','radio','range','color'].includes(el.type)) ||
      tag === 'TEXTAREA' ||
      el.isContentEditable
    );
  }

  function focusAndSelect(input) {
    if (!input) return;
    try { input.focus({ preventScroll: true }); } catch {}
    if (typeof input.select === 'function') {
      try { input.select(); } catch {}
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const input = document.querySelector('[data-tts="primary-search"]');
    if (!input) return;

    // Autofocus al cargar
    setTimeout(() => focusAndSelect(input), 0);

    // Atajos: "/" o F3 enfocan el buscador
    document.addEventListener('keydown', (e) => {
      if (isEditable(e.target)) return;               // Si ya está escribiendo en algo, no interrumpimos
      if (e.ctrlKey || e.metaKey || e.altKey) return; // No interferir con atajos del SO

      // Enfocar con "/" o F3
      if (e.key === '/' || e.key === 'F3') {
        e.preventDefault();
        focusAndSelect(input);
        return;
      }

      // Escribir directamente manda las teclas al buscador
      if (e.key.length === 1) {
        e.preventDefault();
        input.focus();
        input.value += e.key;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        return;
      }

      // Backspace borra en el buscador
      if (e.key === 'Backspace') {
        e.preventDefault();
        input.focus();
        input.value = input.value.slice(0, -1);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        return;
      }

      // Enter envía el formulario del buscador (si existe)
      if (e.key === 'Enter' && input.form) {
        e.preventDefault();
        input.form.submit();
      }
    });
  });
})();
