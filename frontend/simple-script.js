const STORAGE_KEY = 'voiceNotesTreeV2';

let pages = [];
let selectedPageId = null;
let currentView = 'list';
let dragState = { pageId: null, blockId: null };
let pendingProposal = null;

let recognition = null;
let isContinuous = false;
let isListening = false;
let speechBuffer = '';
let silenceTimer = null;
let lastSpeechTs = 0;

const els = {};

document.addEventListener('DOMContentLoaded', () => {
  bindElements();
  wireEvents();
  loadState();
  ensureInitialPage();
  renderAll();
  initSpeech();
});

function bindElements() {
  els.pageTree = document.getElementById('pageTree');
  els.searchInput = document.getElementById('searchInput');
  els.newPageBtn = document.getElementById('newPageBtn');
  els.breadcrumb = document.getElementById('breadcrumb');
  els.noteTitle = document.getElementById('noteTitle');
  els.propTags = document.getElementById('propTags');
  els.propStatus = document.getElementById('propStatus');
  els.propDate = document.getElementById('propDate');
  els.propType = document.getElementById('propType');
  els.editor = document.getElementById('editor');
  els.statusText = document.getElementById('statusText');
  els.proposal = document.getElementById('proposal');
  els.proposalDiff = document.getElementById('proposalDiff');
  els.applyProposal = document.getElementById('applyProposal');
  els.rejectProposal = document.getElementById('rejectProposal');
  els.clarifyInput = document.getElementById('clarifyInput');
  els.floatingListen = document.getElementById('floatingListen');
  els.listenLabel = document.getElementById('listenLabel');
  els.listenPulse = document.getElementById('listenPulse');
}

function wireEvents() {
  els.newPageBtn.addEventListener('click', () => createPage());
  els.searchInput.addEventListener('input', renderTree);

  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentView = btn.dataset.view;
      document.querySelectorAll('.view-btn').forEach(b => b.classList.toggle('active', b === btn));
      setStatus(`Vue: ${btn.textContent}`);
    });
  });

  els.noteTitle.addEventListener('input', () => {
    const p = getSelectedPage();
    if (!p) return;
    p.title = els.noteTitle.value.trim() || 'Untitled';
    saveState();
    renderTree();
    renderBreadcrumb();
  });

  const onPropChange = () => {
    const p = getSelectedPage();
    if (!p) return;
    p.properties.tags = splitTags(els.propTags.value);
    p.properties.status = els.propStatus.value;
    p.properties.date = els.propDate.value;
    p.properties.type = els.propType.value;
    saveState();
  };

  els.propTags.addEventListener('change', onPropChange);
  els.propStatus.addEventListener('change', onPropChange);
  els.propDate.addEventListener('change', onPropChange);
  els.propType.addEventListener('change', onPropChange);

  els.applyProposal.addEventListener('click', applyProposal);
  els.rejectProposal.addEventListener('click', rejectProposal);
  els.clarifyInput.addEventListener('keydown', onClarifyEnter);

  els.floatingListen.addEventListener('click', toggleContinuousListening);
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.pages)) pages = parsed.pages;
    if (typeof parsed.selectedPageId === 'string') selectedPageId = parsed.selectedPageId;
  } catch {
    pages = [];
    selectedPageId = null;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ pages, selectedPageId }));
}

function ensureInitialPage() {
  if (pages.length > 0) {
    if (!selectedPageId || !findPageById(selectedPageId)) selectedPageId = pages[0].id;
    return;
  }

  const root = newPage('Accueil', null);
  root.blocks = [newBlock('paragraph', 'Tapez "/" pour insérer un bloc ou une commande IA.')];
  pages.push(root);
  selectedPageId = root.id;
  saveState();
}

function renderAll() {
  renderTree();
  renderBreadcrumb();
  renderEditorPage();
}

function renderTree() {
  const query = els.searchInput.value.trim().toLowerCase();
  const roots = pages.filter(p => !p.parentId);

  const html = roots
    .map(root => renderTreeNode(root, query))
    .join('');

  els.pageTree.innerHTML = html || '<div class="tree-item">Aucune page</div>';

  els.pageTree.querySelectorAll('.tree-item[data-id]').forEach(item => {
    item.addEventListener('click', e => {
      e.stopPropagation();
      selectedPageId = item.dataset.id;
      saveState();
      renderAll();
    });

    item.addEventListener('dblclick', e => {
      e.stopPropagation();
      createPage(item.dataset.id);
    });
  });
}

function renderTreeNode(page, query) {
  const children = pages.filter(p => p.parentId === page.id);
  const selfMatch = !query || page.title.toLowerCase().includes(query);
  const childHtml = children.map(c => renderTreeNode(c, query)).join('');
  const hasVisibleChild = childHtml.trim().length > 0;

  if (!selfMatch && !hasVisibleChild) return '';

  return `
    <div>
      <div class="tree-item ${selectedPageId === page.id ? 'active' : ''}" data-id="${page.id}">
        <span>${escapeHtml(page.title)}</span>
        <span style="font-size:11px;color:var(--muted)">+ sous-page</span>
      </div>
      ${children.length ? `<div class="tree-children">${childHtml}</div>` : ''}
    </div>
  `;
}

function renderBreadcrumb() {
  const p = getSelectedPage();
  if (!p) {
    els.breadcrumb.innerHTML = '';
    return;
  }

  const chain = [];
  let cur = p;
  while (cur) {
    chain.unshift(cur);
    cur = cur.parentId ? findPageById(cur.parentId) : null;
  }

  els.breadcrumb.innerHTML = chain
    .map((node, i) => {
      const sep = i < chain.length - 1 ? ' / ' : '';
      return `<span class="chip" data-id="${node.id}" style="cursor:pointer">${escapeHtml(node.title)}</span>${sep}`;
    })
    .join('');

  els.breadcrumb.querySelectorAll('.chip[data-id]').forEach(chip => {
    chip.addEventListener('click', () => {
      selectedPageId = chip.dataset.id;
      saveState();
      renderAll();
    });
  });
}

function renderEditorPage() {
  const p = getSelectedPage();
  if (!p) return;

  els.noteTitle.value = p.title;
  els.propTags.value = (p.properties.tags || []).join(', ');
  els.propStatus.value = p.properties.status || 'idea';
  els.propDate.value = p.properties.date || '';
  els.propType.value = p.properties.type || 'general';

  if (!Array.isArray(p.blocks)) p.blocks = [];
  if (p.blocks.length === 0) p.blocks.push(newBlock('paragraph', ''));

  els.editor.innerHTML = p.blocks.map(block => renderBlock(block)).join('');
  wireBlockEvents(p);
}

function renderBlock(block) {
  const placeholder = block.type === 'heading' ? 'Titre...' :
    block.type === 'list' ? 'Élément de liste...' :
    block.type === 'table' ? 'Col1 | Col2 | Col3' :
    'Tapez du texte...';

  return `
    <div class="block" data-block-id="${block.id}" draggable="true">
      <div class="handle" title="Glisser">⋮⋮</div>
      <div
        class="block-content"
        contenteditable="true"
        data-placeholder="${placeholder}"
        data-type="${block.type}"
      >${escapeHtml(block.content || '')}</div>
    </div>
  `;
}

function wireBlockEvents(page) {
  const blockEls = els.editor.querySelectorAll('.block');

  blockEls.forEach(blockEl => {
    const blockId = blockEl.dataset.blockId;
    const contentEl = blockEl.querySelector('.block-content');

    contentEl.addEventListener('input', () => {
      const b = page.blocks.find(x => x.id === blockId);
      if (!b) return;
      b.content = contentEl.innerText;
      saveState();
    });

    contentEl.addEventListener('keydown', e => onBlockKeydown(e, page, blockId));

    blockEl.addEventListener('dragstart', () => {
      dragState = { pageId: page.id, blockId };
    });

    blockEl.addEventListener('dragover', e => e.preventDefault());

    blockEl.addEventListener('drop', e => {
      e.preventDefault();
      onDropBlock(page, blockId);
    });
  });
}

function onBlockKeydown(e, page, blockId) {
  const block = page.blocks.find(b => b.id === blockId);
  if (!block) return;

  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    const idx = page.blocks.findIndex(b => b.id === blockId);
    const n = newBlock('paragraph', '');
    page.blocks.splice(idx + 1, 0, n);
    saveState();
    renderEditorPage();
    focusBlock(n.id);
    return;
  }

  if (e.key === '/' && block.content.trim() === '') {
    e.preventDefault();
    showSlashQuickMenu(blockId);
    return;
  }

  if (e.key === 'Backspace' && block.content.trim() === '' && page.blocks.length > 1) {
    e.preventDefault();
    const idx = page.blocks.findIndex(b => b.id === blockId);
    page.blocks.splice(idx, 1);
    const target = page.blocks[Math.max(0, idx - 1)].id;
    saveState();
    renderEditorPage();
    focusBlock(target);
  }
}

function showSlashQuickMenu(blockId) {
  closeSlashQuickMenu();

  const menu = document.createElement('div');
  menu.id = 'slashQuickMenu';
  menu.className = 'glass';
  menu.style.position = 'fixed';
  menu.style.zIndex = '3000';
  menu.style.width = '240px';
  menu.style.padding = '8px';
  menu.style.borderRadius = '12px';
  menu.style.left = `${window.innerWidth / 2 - 120}px`;
  menu.style.top = '120px';

  const items = [
    { label: 'Paragraphe', action: () => setBlockType(blockId, 'paragraph') },
    { label: 'Titre', action: () => setBlockType(blockId, 'heading') },
    { label: 'Liste', action: () => setBlockType(blockId, 'list') },
    { label: 'Table', action: () => setBlockType(blockId, 'table') },
    { label: 'IA: Résumer', action: () => proposeAI('resume') },
    { label: 'IA: Chercher', action: () => proposeAI('search') },
  ];

  menu.innerHTML = items.map((it, i) => `<div class="slash-item" data-i="${i}" style="padding:8px;border-radius:8px;cursor:pointer">${it.label}</div>`).join('');

  document.body.appendChild(menu);

  menu.querySelectorAll('.slash-item').forEach(el => {
    el.addEventListener('mouseenter', () => el.style.background = 'rgba(255,255,255,0.12)');
    el.addEventListener('mouseleave', () => el.style.background = 'transparent');
    el.addEventListener('click', () => {
      const i = Number(el.dataset.i);
      items[i].action();
      closeSlashQuickMenu();
    });
  });

  const onDoc = (ev) => {
    if (!menu.contains(ev.target)) {
      closeSlashQuickMenu();
      document.removeEventListener('click', onDoc);
    }
  };
  setTimeout(() => document.addEventListener('click', onDoc), 0);
}

function closeSlashQuickMenu() {
  const m = document.getElementById('slashQuickMenu');
  if (m) m.remove();
}

function setBlockType(blockId, type) {
  const page = getSelectedPage();
  if (!page) return;
  const block = page.blocks.find(b => b.id === blockId);
  if (!block) return;
  block.type = type;
  saveState();
  renderEditorPage();
  focusBlock(blockId);
}

function onDropBlock(page, targetBlockId) {
  if (dragState.pageId !== page.id || !dragState.blockId || dragState.blockId === targetBlockId) return;

  const from = page.blocks.findIndex(b => b.id === dragState.blockId);
  const to = page.blocks.findIndex(b => b.id === targetBlockId);
  if (from < 0 || to < 0) return;

  const [moved] = page.blocks.splice(from, 1);
  const newTo = from < to ? to - 1 : to;
  page.blocks.splice(newTo, 0, moved);

  dragState = { pageId: null, blockId: null };
  saveState();
  renderEditorPage();
}

function focusBlock(blockId) {
  const el = els.editor.querySelector(`.block[data-block-id="${blockId}"] .block-content`);
  if (!el) return;
  el.focus();
  placeCaretAtEnd(el);
}

function createPage(parentId = null) {
  const p = newPage('Nouvelle page', parentId);
  pages.push(p);
  selectedPageId = p.id;
  saveState();
  renderAll();
  setStatus('Nouvelle page créée');
}

function newPage(title, parentId) {
  const now = new Date().toISOString();
  return {
    id: uid(),
    parentId,
    title,
    createdAt: now,
    updatedAt: now,
    properties: {
      tags: [],
      status: 'idea',
      date: '',
      type: 'general'
    },
    blocks: [
      newBlock('paragraph', ''),
    ]
  };
}

function newBlock(type, content) {
  return { id: uid(), type, content };
}

function getSelectedPage() {
  return findPageById(selectedPageId);
}

function findPageById(id) {
  return pages.find(p => p.id === id) || null;
}

function splitTags(raw) {
  return raw.split(',').map(x => x.trim()).filter(Boolean);
}

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function setStatus(text) {
  els.statusText.textContent = text;
}

function placeCaretAtEnd(el) {
  const range = document.createRange();
  const sel = window.getSelection();
  range.selectNodeContents(el);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---------- Voice / VAD (3s anti-waste) ----------

function initSpeech() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    setStatus('Reconnaissance vocale non supportée sur ce navigateur');
    els.floatingListen.style.opacity = '.6';
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = 'fr-FR';
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  recognition.continuous = true;

  recognition.onstart = () => {
    isListening = true;
    setStatus('Écoute active');
  };

  recognition.onresult = (event) => {
    const phrases = [];
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const text = event.results[i][0].transcript || '';
      phrases.push(text);
    }

    const latest = phrases.join(' ').trim();
    if (!latest) return;

    speechBuffer = latest;
    lastSpeechTs = Date.now();

    if (silenceTimer) clearTimeout(silenceTimer);
    silenceTimer = setTimeout(onSilenceWindowReached, 3000);
  };

  recognition.onerror = () => {
    setStatus('Erreur micro, tentative de reprise');
  };

  recognition.onend = () => {
    isListening = false;
    if (isContinuous) {
      setTimeout(() => {
        if (isContinuous && recognition) {
          try { recognition.start(); } catch { }
        }
      }, 500);
    }
  };
}

function toggleContinuousListening() {
  isContinuous = !isContinuous;
  if (!recognition) {
    setStatus('Micro non disponible');
    return;
  }

  if (isContinuous) {
    els.listenLabel.textContent = 'Écoute continue: ON';
    els.listenPulse.style.background = 'var(--ok)';
    try { recognition.start(); } catch { }
  } else {
    els.listenLabel.textContent = 'Écoute continue: OFF';
    els.listenPulse.style.background = 'var(--warn)';
    try { recognition.stop(); } catch { }
    if (silenceTimer) clearTimeout(silenceTimer);
  }
}

function onSilenceWindowReached() {
  const now = Date.now();
  if (now - lastSpeechTs < 2900) return;

  const clean = sanitizeSpeech(speechBuffer);
  speechBuffer = '';
  if (!isRichSpeech(clean)) {
    setStatus('Ignoré (bruit / hésitation)');
    return;
  }

  setStatus('Phrase riche détectée — traitement...');
  handleVoiceCommand(clean);
}

function sanitizeSpeech(text) {
  return text
    .replace(/\b(euh+|heu+|hum+|mmm+)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isRichSpeech(text) {
  if (!text) return false;
  const words = text.split(' ').filter(Boolean);
  if (words.length < 4) return false;
  if (text.length < 18) return false;
  return true;
}

// ---------- AI proposal confirmation ----------

function handleVoiceCommand(transcript) {
  const low = transcript.toLowerCase();

  if (low.includes('ajoute les prix') || low.includes('produits d’hygiène') || low.includes("produits d'hygiène")) {
    const target = findPageBySemanticHint(['hygiene', 'hygiène', 'produits', 'prix']);
    if (!target) {
      setStatus('Aucune note cible trouvée');
      return;
    }

    const patch = `\n+ Prix estimés:\n+ - Savon: 2,50€\n+ - Shampooing: 4,80€\n+ - Dentifrice: 3,20€`;
    pendingProposal = {
      pageId: target.id,
      action: 'append',
      payload: patch,
      detail: `Page ciblée: ${target.title}\nDiff:\n${patch}`
    };
    openProposal();
    return;
  }

  if (low.startsWith('résumer') || low.includes('résume')) {
    proposeAI('resume');
    return;
  }

  if (low.startsWith('cherche') || low.includes('recherche')) {
    proposeAI('search');
    return;
  }

  // fallback: create a new block in current page
  const p = getSelectedPage();
  if (!p) return;
  p.blocks.push(newBlock('paragraph', transcript));
  saveState();
  renderEditorPage();
  setStatus('Ajouté à la page active');
}

function proposeAI(kind) {
  const p = getSelectedPage();
  if (!p) return;

  const source = p.blocks.map(b => b.content).join('\n').trim();
  if (!source) {
    setStatus('Page vide, rien à proposer');
    return;
  }

  let payload = '';
  if (kind === 'resume') {
    payload = `\n+ Résumé IA: ${source.slice(0, 140)}...`;
  } else if (kind === 'search') {
    payload = `\n+ Recherche IA: pistes à approfondir sur "${p.title}".`;
  } else {
    payload = `\n+ Proposition IA`;
  }

  pendingProposal = {
    pageId: p.id,
    action: 'append',
    payload,
    detail: `Page ciblée: ${p.title}\nDiff:\n${payload}`
  };
  openProposal();
}

function findPageBySemanticHint(hints) {
  const scored = pages.map(p => {
    const bag = `${p.title} ${(p.properties.tags || []).join(' ')} ${p.blocks.map(b => b.content).join(' ')}`.toLowerCase();
    const score = hints.reduce((acc, h) => acc + (bag.includes(h) ? 1 : 0), 0);
    return { p, score };
  }).sort((a, b) => b.score - a.score);

  return scored[0] && scored[0].score > 0 ? scored[0].p : null;
}

function openProposal() {
  if (!pendingProposal) return;
  els.proposalDiff.textContent = pendingProposal.detail;
  els.proposal.classList.add('visible');
  setStatus('Proposition IA prête — validation requise');
}

function closeProposal() {
  els.proposal.classList.remove('visible');
  els.clarifyInput.value = '';
}

function applyProposal() {
  if (!pendingProposal) return;
  const page = findPageById(pendingProposal.pageId);
  if (!page) return;

  if (pendingProposal.action === 'append') {
    page.blocks.push(newBlock('paragraph', pendingProposal.payload.replace(/^\n\+\s?/gm, '').trim()));
  }

  page.updatedAt = new Date().toISOString();
  saveState();
  renderAll();
  pendingProposal = null;
  closeProposal();
  setStatus('Proposition appliquée');
}

function rejectProposal() {
  pendingProposal = null;
  closeProposal();
  setStatus('Proposition rejetée');
}

function onClarifyEnter(e) {
  if (e.key !== 'Enter') return;
  const msg = els.clarifyInput.value.trim();
  if (!msg || !pendingProposal) return;

  pendingProposal.detail += `\n\nPrécision: ${msg}\nNouvelle version:\n${pendingProposal.payload}\n+ (ajustée selon précision)`;
  els.proposalDiff.textContent = pendingProposal.detail;
  els.clarifyInput.value = '';
  setStatus('Proposition ajustée');
}
