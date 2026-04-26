document.addEventListener('DOMContentLoaded', () => {
  const seloWrap = document.getElementById('selo');
  if (!seloWrap) return;

  const toggleQr = document.getElementById('i-selo-qr');
  const togglePng = document.getElementById('i-selo-png');
  const exportar = document.getElementById('exportar');
  const authSrc = seloWrap.dataset.authSrc || '';

  function formatDate(date) {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  }

  function randomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const chunk = (size) => Array.from({ length: size }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `${chunk(3)}-${chunk(3)}-${chunk(2)}-${chunk(2)}-${chunk(3)}`;
  }

  function seloSvg(dateText, codeText) {
    return `
<svg class="selo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 140" role="img" aria-label="Selo digital">
  <rect x="1.5" y="1.5" width="757" height="137" fill="none" stroke="#666" stroke-width="3"/>
  <rect x="16" y="14" width="112" height="112" fill="#fff" stroke="#222" stroke-width="2"/>
  <image x="19" y="17" width="106" height="106" href="../../sistema/qr-modelo.svg" preserveAspectRatio="none" />
  <g font-family="Inter, Arial, sans-serif" fill="#111">
    <text x="154" y="40" font-size="20" font-weight="700">Tribunal de Justica do Estado de Sao Paulo</text>
    <text x="154" y="66" font-size="20" font-weight="500">SERIE A - SELO DIGITAL GERAL N${Math.floor(1000 + Math.random() * 9000)}</text>
    <text x="154" y="92" font-size="20" font-weight="500">SELADO EM: ${dateText}</text>
    <text x="154" y="118" font-size="20" font-weight="500">CODIGO DE SEGURANCA NO ${codeText}</text>
  </g>
</svg>`;
  }

  function renderSelo() {
    const today = formatDate(new Date());
    const showQr = !toggleQr || toggleQr.checked;
    const showPng = !!authSrc && (!togglePng || togglePng.checked);

    const qrPart = showQr ? seloSvg(today, randomCode()) : '';
    const pngPart = showPng
      ? `<img class="selo selo-autenticidade" src="${authSrc}" alt="Selo de Autenticidade" onerror="this.style.display='none'">`
      : '';

    seloWrap.innerHTML = `${qrPart}${pngPart}`;
  }

  function syncVisibility() {
    const showQr = !toggleQr || toggleQr.checked;
    const showPng = !!authSrc && (!togglePng || togglePng.checked);
    const show = showQr || showPng;
    seloWrap.style.display = show ? 'flex' : 'none';
  }

  renderSelo();
  syncVisibility();

  if (toggleQr) toggleQr.addEventListener('change', () => {
    renderSelo();
    syncVisibility();
  });
  if (togglePng) togglePng.addEventListener('change', () => {
    renderSelo();
    syncVisibility();
  });
  if (exportar) {
    exportar.addEventListener('click', () => {
      renderSelo();
      syncVisibility();
    });
  }
});
