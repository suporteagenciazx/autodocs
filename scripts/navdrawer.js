// navdrawer.js

const navdrawerHTML = `
<header id="navdrawer">
  <div class="sistema-logo">
    <div class="logo"><img src="" id="logo" alt="Logo"></div>
    <div class="logo-div"></div>
  </div>
  <div class="sistema-navdrawer">
    <div class="up-side">
      <a class="navdrawer-option" id="menu-home" data-path="" href="#">
        <span class="material-symbols-rounded">home</span>Painel Inicial
      </a>
      <a class="navdrawer-option" id="menu-consulta" data-path="consulta/" href="#">
        <span class="material-symbols-rounded">search</span>Consulta
      </a>
      <div class="navdrawer-div"></div>
      <a class="navdrawer-option" id="menu-aprovacao" data-path="documentos/aprovacao/" href="#">
        <span class="material-symbols-rounded">priority</span>Aprovação
      </a>
      <a class="navdrawer-option" id="menu-contrato" data-path="documentos/contrato/" href="#">
        <span class="material-symbols-rounded">docs</span>Contrato de Crédito
      </a>
      <a class="navdrawer-option" id="menu-comprovante" data-path="documentos/comprovante/" href="#">
        <span class="material-symbols-rounded">receipt_long</span>Comprovante
      </a>
      <a class="navdrawer-option" id="menu-termo" data-path="documentos/termo/" href="#">
        <span class="material-symbols-rounded">two_pager</span>Termo de Responsabilidade
      </a>
      <a class="navdrawer-option" id="menu-declaracao" data-path="documentos/declaracao/" href="#">
        <span class="material-symbols-rounded">article</span>Declaração de Quitação
      </a>
      <a class="navdrawer-option" id="menu-ordem" data-path="documentos/ordem/" href="#">
        <span class="material-symbols-rounded">table</span>Ordem de Pagamento
      </a>
      <a class="navdrawer-option" id="menu-garantia" data-path="documentos/garantia/" href="#">
        <span class="material-symbols-rounded">inventory</span>Garantia de Liberação
      </a>
    </div>
    <div class="down-side">
      <div class="navdrawer-div"></div>
      <a class="navdrawer-option" id="menu-ajuda" data-path="ajuda/" href="#">
        <span class="material-symbols-rounded">help</span>Ajuda
      </a>
      <a class="navdrawer-option" id="menu-configuracoes" data-path="configuracoes/" href="#">
        <span class="material-symbols-rounded">settings</span>Configurações
      </a>
      <a class="navdrawer-option" id="menu-sair" href="https://www.google.com">
        <span class="material-symbols-rounded">logout</span>Sair do Sistema
      </a>
    </div>
  </div>
</header>
`;

function getBasePath() {
  if (location.protocol === 'file:') {
    const match = location.pathname.match(/(.*SistemaAgi\/)/i);
    if (match && match[1]) {
      return match[1];
    } else {
      return '/SistemaAgi/';
    }
  } else {
    return '/SistemaAgi/';
  }
}

function inserirNavdrawer() {
  document.body.insertAdjacentHTML('afterbegin', navdrawerHTML);
}

function ajustarLinks(basePath) {
  const navLinks = document.querySelectorAll('.sistema-navdrawer a[data-path]');
  navLinks.forEach(link => {
    const relativePath = link.getAttribute('data-path');
    let fullHref = basePath + relativePath;
    if (!fullHref.endsWith('/')) fullHref += '/';
    link.href = fullHref;
  });
}

function ajustarLogo(basePath) {
  const logo = document.getElementById('logo');
  if (logo) {
    logo.src = basePath + 'sistema/logo.svg';
  }
}

function ativarMenu() {
  const navLinks = document.querySelectorAll('.sistema-navdrawer a[data-path]');
  const currentPath = location.pathname.toLowerCase();

  navLinks.forEach(link => {
    link.classList.remove('ativo');
  });

  // Função auxiliar para ativar menu pelo id, com verificação
  function ativarPorId(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('ativo');
  }

  // Verifica com includes e removendo "index.html" para ajudar
  const pathSemIndex = currentPath.replace(/index\.html$/, '');

  if (pathSemIndex.includes('/documentos/aprovacao/')) {
    ativarPorId('menu-aprovacao');
  } else if (pathSemIndex.includes('/documentos/contrato/')) {
    ativarPorId('menu-contrato');
  } else if (pathSemIndex.includes('/documentos/comprovante/')) {
    ativarPorId('menu-comprovante');
  } else if (pathSemIndex.includes('/documentos/termo/')) {
    ativarPorId('menu-termo');
  } else if (pathSemIndex.includes('/documentos/declaracao/')) {
    ativarPorId('menu-declaracao');
  } else if (pathSemIndex.includes('/documentos/ordem/')) {
    ativarPorId('menu-ordem');
  } else if (pathSemIndex.includes('/documentos/garantia/')) {
    ativarPorId('menu-garantia');
  } else if (pathSemIndex.includes('/consulta/')) {
    ativarPorId('menu-consulta');
  } else if (pathSemIndex.includes('/ajuda/')) {
    ativarPorId('menu-ajuda');
  } else if (pathSemIndex.includes('/configuracoes/')) {
    ativarPorId('menu-configuracoes');
  } else {
    // padrão home
    ativarPorId('menu-home');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  inserirNavdrawer();
  const basePath = getBasePath();
  ajustarLinks(basePath);
  ajustarLogo(basePath);
  ativarMenu();
});
