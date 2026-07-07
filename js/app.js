/* Screenr — structured screenwriting app */
'use strict';

/* ---------------------------------- utils ---------------------------------- */

const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

function uid() {
  return (crypto.randomUUID) ? crypto.randomUUID()
    : 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined && v !== false) node.setAttribute(k, v === true ? '' : v);
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined) continue;
    node.append(child.nodeType ? child : document.createTextNode(child));
  }
  return node;
}

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function slugify(s) {
  return (s || 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'untitled';
}

function download(filename, text, mime) {
  const blob = new Blob([text], { type: mime || 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/* --------------------------------- presets --------------------------------- */

const INT_EXT = ['INT.', 'EXT.', 'INT./EXT.'];
const TIMES = ['DAY', 'NIGHT', 'MORNING', 'EVENING', 'CONTINUOUS', 'LATER'];
const EXTENSIONS = ['', 'V.O.', 'O.S.', 'O.C.', "CONT'D"];
const TRANSITIONS = ['CUT TO:', 'FADE IN:', 'FADE OUT.', 'DISSOLVE TO:', 'SMASH CUT TO:', 'MATCH CUT TO:'];

/* ---------------------------------- state ---------------------------------- */

const state = {
  projects: [],
  project: null,
  tab: 'script',
  focusBlockId: null,
  saveTimer: null,
};

function blankProject() {
  const now = Date.now();
  return {
    id: uid(),
    schema: 1,
    createdAt: now,
    updatedAt: now,
    title: { title: '', credit: 'Written by', author: '', source: '', draftDate: '', contact: '', copyright: '' },
    characters: [],
    locations: [],
    blocks: [],
  };
}

function normalizeProject(p) {
  const base = blankProject();
  const out = Object.assign(base, p);
  out.title = Object.assign(base.title, p.title || {});
  out.characters = Array.isArray(p.characters) ? p.characters : [];
  out.locations = Array.isArray(p.locations) ? p.locations : [];
  out.blocks = Array.isArray(p.blocks) ? p.blocks : [];
  return out;
}

/* --------------------------------- saving ---------------------------------- */

function markDirty() {
  if (!state.project) return;
  setSaveStatus('Saving…');
  clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(saveNow, 500);
}

async function saveNow() {
  if (!state.project) return;
  state.project.updatedAt = Date.now();
  try {
    await ScreenrDB.put(state.project);
    setSaveStatus('Saved');
  } catch (err) {
    console.error(err);
    setSaveStatus('Save failed');
  }
}

function setSaveStatus(text) {
  $('#save-status').textContent = text;
}

/* --------------------------------- routing --------------------------------- */

async function showLibrary() {
  if (state.project) await saveNow();
  state.project = null;
  state.focusBlockId = null;
  $('#editor-view').hidden = true;
  $('#library-view').hidden = false;
  $('#editor-actions').hidden = true;
  $('#btn-back').hidden = true;
  $('#header-title').textContent = '';
  state.projects = (await ScreenrDB.getAll()).sort((a, b) => b.updatedAt - a.updatedAt);
  renderLibrary();
}

function openProject(project) {
  state.project = normalizeProject(project);
  state.tab = 'script';
  $('#library-view').hidden = true;
  $('#editor-view').hidden = false;
  $('#editor-actions').hidden = false;
  $('#btn-back').hidden = false;
  setSaveStatus('Saved');
  updateHeaderTitle();
  setTab('script');
  renderTitleTab();
  renderSetupTab();
  renderScript();
}

function updateHeaderTitle() {
  $('#header-title').textContent = state.project?.title.title || 'Untitled screenplay';
}

/* --------------------------------- library --------------------------------- */

function projectStats(p) {
  const scenes = p.blocks.filter(b => b.type === 'scene').length;
  const words = p.blocks.reduce((n, b) => {
    const text = [b.text, b.parenthetical].filter(Boolean).join(' ');
    return n + (text.trim() ? text.trim().split(/\s+/).length : 0);
  }, 0);
  return { scenes, words };
}

function renderLibrary() {
  const list = $('#project-list');
  list.replaceChildren();
  if (!state.projects.length) {
    list.append(el('div', { class: 'empty-state' },
      el('p', { class: 'empty-title' }, 'No screenplays yet.'),
      el('p', {}, 'Start a new one, or import a Screenr backup file.')));
    return;
  }
  for (const p of state.projects) {
    const { scenes, words } = projectStats(p);
    const card = el('div', { class: 'project-card', role: 'button', tabindex: '0' },
      el('div', { class: 'project-card-main' },
        el('h2', {}, p.title.title || 'Untitled screenplay'),
        el('p', { class: 'byline' }, p.title.author ? `by ${p.title.author}` : ''),
        el('p', { class: 'meta' }, `${scenes} scene${scenes === 1 ? '' : 's'} · ${words} words · updated ${fmtDate(p.updatedAt)}`)),
      el('div', { class: 'project-card-actions' },
        el('button', { class: 'ghost', title: 'Duplicate', onclick: e => { e.stopPropagation(); duplicateProject(p); } }, '⧉'),
        el('button', { class: 'ghost', title: 'Export backup (.json)', onclick: e => { e.stopPropagation(); exportJSON(p); } }, '⇩'),
        el('button', { class: 'ghost danger', title: 'Delete', onclick: e => { e.stopPropagation(); deleteProject(p); } }, '✕')));
    card.addEventListener('click', () => openProject(p));
    card.addEventListener('keydown', e => { if (e.key === 'Enter') openProject(p); });
    list.append(card);
  }
}

async function newProject() {
  const p = blankProject();
  await ScreenrDB.put(p);
  openProject(p);
}

async function duplicateProject(p) {
  const copy = normalizeProject(JSON.parse(JSON.stringify(p)));
  copy.id = uid();
  copy.createdAt = copy.updatedAt = Date.now();
  copy.title.title = (copy.title.title || 'Untitled') + ' (copy)';
  await ScreenrDB.put(copy);
  showLibrary();
}

async function deleteProject(p) {
  const name = p.title.title || 'Untitled screenplay';
  if (!confirm(`Delete “${name}”? This cannot be undone.\n\nTip: export a backup first if you're unsure.`)) return;
  await ScreenrDB.remove(p.id);
  showLibrary();
}

/* ------------------------------- import/export ------------------------------ */

function exportJSON(p) {
  const payload = { app: 'screenr', schema: 1, exportedAt: new Date().toISOString(), projects: [p] };
  download(`${slugify(p.title.title)}.screenr.json`, JSON.stringify(payload, null, 2), 'application/json');
}

function exportFountain(p) {
  download(`${slugify(p.title.title)}.fountain`, ScreenrFountain.toFountain(p), 'text/plain');
}

async function importFile(file) {
  let data;
  try {
    data = JSON.parse(await file.text());
  } catch {
    alert('That file is not valid JSON. Screenr imports .screenr.json backup files.');
    return;
  }
  let projects = [];
  if (Array.isArray(data?.projects)) projects = data.projects;
  else if (Array.isArray(data)) projects = data;
  else if (data && data.blocks) projects = [data];

  projects = projects.filter(p => p && Array.isArray(p.blocks));
  if (!projects.length) {
    alert('No screenplays found in that file.');
    return;
  }
  for (const raw of projects) {
    const p = normalizeProject(raw);
    p.id = uid(); // never overwrite an existing project on import
    p.updatedAt = Date.now();
    await ScreenrDB.put(p);
  }
  alert(`Imported ${projects.length} screenplay${projects.length === 1 ? '' : 's'}.`);
  showLibrary();
}

/* ----------------------------------- tabs ----------------------------------- */

function setTab(tab) {
  state.tab = tab;
  $$('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  $('#tab-title').hidden = tab !== 'title';
  $('#tab-setup').hidden = tab !== 'setup';
  $('#tab-script').hidden = tab !== 'script';
}

/* -------------------------------- title page -------------------------------- */

const TITLE_FIELDS = [
  ['title', 'Title', 'input', 'THE BIG IDEA'],
  ['credit', 'Credit line', 'input', 'Written by'],
  ['author', 'Author(s)', 'input', 'Your Name'],
  ['source', 'Source', 'input', 'Based on the novel by…'],
  ['draftDate', 'Draft / date', 'input', 'First draft — July 2026'],
  ['contact', 'Contact', 'textarea', 'you@example.com\n555-0100'],
  ['copyright', 'Copyright', 'input', '© 2026 Your Name'],
];

function renderTitleTab() {
  const wrap = $('#title-form');
  wrap.replaceChildren();
  for (const [key, label, kind, placeholder] of TITLE_FIELDS) {
    const field = kind === 'textarea'
      ? el('textarea', { rows: 3, placeholder })
      : el('input', { type: 'text', placeholder });
    field.value = state.project.title[key] || '';
    field.addEventListener('input', () => {
      state.project.title[key] = field.value;
      if (key === 'title') updateHeaderTitle();
      markDirty();
    });
    wrap.append(el('label', { class: 'field' }, el('span', {}, label), field));
  }
}

/* ------------------------------ characters/places ---------------------------- */

function renderSetupTab() {
  renderCharacterList();
  renderLocationList();
}

function addCharacter(name, desc = '') {
  name = (name || '').trim();
  if (!name) return null;
  const existing = state.project.characters.find(c => c.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing;
  const ch = { id: uid(), name, desc };
  state.project.characters.push(ch);
  markDirty();
  renderCharacterList();
  return ch;
}

function renderCharacterList() {
  const list = $('#char-list');
  list.replaceChildren();
  if (!state.project.characters.length) {
    list.append(el('p', { class: 'hint' }, 'No characters yet. Add them here, or create them on the fly from any dialogue block.'));
  }
  for (const ch of state.project.characters) {
    const nameInput = el('input', { type: 'text', class: 'char-name', value: ch.name, placeholder: 'NAME' });
    nameInput.addEventListener('input', () => { ch.name = nameInput.value; markDirty(); });
    nameInput.addEventListener('blur', () => renderScript()); // refresh cues in the script
    const descInput = el('input', { type: 'text', class: 'char-desc', value: ch.desc || '', placeholder: 'Who are they? (notes, never printed)' });
    descInput.addEventListener('input', () => { ch.desc = descInput.value; markDirty(); });
    const delBtn = el('button', { class: 'ghost danger', title: 'Remove character', onclick: () => {
      const used = state.project.blocks.some(b => b.type === 'dialogue' && b.characterId === ch.id);
      if (used && !confirm(`${ch.name || 'This character'} has dialogue in the script. Remove anyway? Their cues will show as “CHARACTER”.`)) return;
      state.project.characters = state.project.characters.filter(c => c.id !== ch.id);
      for (const b of state.project.blocks) {
        if (b.type === 'scene') b.cast = (b.cast || []).filter(id => id !== ch.id);
      }
      markDirty();
      renderCharacterList();
      renderScript();
    } }, '✕');
    list.append(el('div', { class: 'setup-row' }, nameInput, descInput, delBtn));
  }
}

function renderLocationList() {
  const list = $('#loc-list');
  list.replaceChildren();
  if (!state.project.locations.length) {
    list.append(el('p', { class: 'hint' }, 'No locations yet. Every location you type into a scene heading is saved here automatically.'));
  }
  state.project.locations.forEach((loc, i) => {
    const input = el('input', { type: 'text', value: loc, placeholder: 'LOCATION' });
    input.addEventListener('input', () => { state.project.locations[i] = input.value; markDirty(); });
    const delBtn = el('button', { class: 'ghost danger', title: 'Remove location', onclick: () => {
      state.project.locations.splice(i, 1);
      markDirty();
      renderLocationList();
    } }, '✕');
    list.append(el('div', { class: 'setup-row' }, input, delBtn));
  });
  refreshLocationDatalist();
}

function rememberLocation(name) {
  name = (name || '').trim().toUpperCase();
  if (!name) return;
  const exists = state.project.locations.some(l => l.trim().toUpperCase() === name);
  if (!exists) {
    state.project.locations.push(name);
    renderLocationList();
  }
}

function refreshLocationDatalist() {
  const dl = $('#locations-datalist');
  dl.replaceChildren(...state.project.locations.map(l => el('option', { value: l })));
}

/* ---------------------------------- blocks ---------------------------------- */

function newBlock(type) {
  switch (type) {
    case 'scene': return { id: uid(), type, intExt: 'INT.', location: '', time: 'DAY', cast: [] };
    case 'action': return { id: uid(), type, text: '' };
    case 'dialogue': return { id: uid(), type, characterId: null, extension: '', parenthetical: '', text: '' };
    case 'transition': return { id: uid(), type, text: 'CUT TO:' };
  }
}

function blockIndex(id) {
  return state.project.blocks.findIndex(b => b.id === id);
}

function sceneForBlock(id) {
  const blocks = state.project.blocks;
  let i = blockIndex(id);
  if (i < 0) i = blocks.length - 1;
  for (; i >= 0; i--) if (blocks[i].type === 'scene') return blocks[i];
  return null;
}

function addBlockAfter(type, afterId) {
  const block = newBlock(type);
  const blocks = state.project.blocks;
  const i = afterId ? blockIndex(afterId) : blocks.length - 1;

  if (type === 'dialogue') {
    // Smart speaker: alternate with the previous different speaker.
    let last = null, prev = null;
    for (let j = (i < 0 ? blocks.length : i + 1) - 1; j >= 0; j--) {
      if (blocks[j].type === 'scene') break;
      if (blocks[j].type === 'dialogue' && blocks[j].characterId) {
        if (last === null) last = blocks[j].characterId;
        else if (blocks[j].characterId !== last) { prev = blocks[j].characterId; break; }
      }
    }
    if (prev) block.characterId = prev;
  }

  blocks.splice(i < 0 ? blocks.length : i + 1, 0, block);
  markDirty();
  renderScript();
  focusBlock(block.id, type === 'dialogue' && !block.characterId ? 'picker' : 'main');
  return block;
}

function deleteBlock(id, focusPrev = false) {
  const i = blockIndex(id);
  if (i < 0) return;
  const prev = state.project.blocks[i - 1];
  state.project.blocks.splice(i, 1);
  if (state.focusBlockId === id) state.focusBlockId = null;
  markDirty();
  renderScript();
  if (focusPrev && prev) focusBlock(prev.id, 'main');
}

function moveBlock(id, dir) {
  const blocks = state.project.blocks;
  const i = blockIndex(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= blocks.length) return;
  [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
  markDirty();
  renderScript();
}

function focusBlock(id, target = 'main') {
  requestAnimationFrame(() => {
    const wrap = document.querySelector(`[data-block-id="${id}"]`);
    if (!wrap) return;
    if (target === 'picker') {
      const btn = wrap.querySelector('.char-btn');
      if (btn) { btn.click(); return; }
    }
    const field = wrap.querySelector('.main-field');
    if (field) {
      field.focus();
      if (field.setSelectionRange) field.setSelectionRange(field.value.length, field.value.length);
    }
  });
}

function smartNextType(block) {
  switch (block.type) {
    case 'scene': return 'action';
    case 'action': return 'action';
    case 'dialogue': return 'dialogue';
    case 'transition': return 'scene';
    default: return 'action';
  }
}

function autosize(ta) {
  ta.style.height = 'auto';
  ta.style.height = ta.scrollHeight + 'px';
}

function mainFieldKeydown(e, block) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    addBlockAfter(smartNextType(block), block.id);
  } else if (e.key === 'Backspace' && e.target.value === '') {
    const hasOtherContent = block.type === 'dialogue' && (block.parenthetical || block.characterId);
    if (!hasOtherContent || confirm('Delete this dialogue block?')) {
      e.preventDefault();
      deleteBlock(block.id, true);
    }
  }
}

/* ------------------------------ script rendering ----------------------------- */

function renderScript() {
  const container = $('#blocks');
  container.replaceChildren();
  const blocks = state.project.blocks;

  $('#empty-script').hidden = blocks.length > 0;

  let sceneNo = 0;
  for (const block of blocks) {
    if (block.type === 'scene') sceneNo++;
    container.append(renderBlockEl(block, sceneNo));
  }
  refreshLocationDatalist();
}

function blockTools(block) {
  return el('div', { class: 'block-tools' },
    el('span', { class: 'block-type-label' }, block.type),
    el('button', { class: 'ghost', title: 'Move up', onclick: () => moveBlock(block.id, -1) }, '↑'),
    el('button', { class: 'ghost', title: 'Move down', onclick: () => moveBlock(block.id, 1) }, '↓'),
    el('button', { class: 'ghost danger', title: 'Delete block', onclick: () => {
      const empty = !((block.text || '') + (block.location || '') + (block.parenthetical || '')).trim();
      if (empty || confirm('Delete this block?')) deleteBlock(block.id);
    } }, '✕'));
}

function renderBlockEl(block, sceneNo) {
  const wrap = el('div', { class: `block block-${block.type}`, dataset: { blockId: block.id } });
  wrap.addEventListener('focusin', () => { state.focusBlockId = block.id; });
  wrap.append(blockTools(block));

  if (block.type === 'scene') wrap.append(renderSceneBlock(block, sceneNo));
  else if (block.type === 'action') wrap.append(renderActionBlock(block));
  else if (block.type === 'dialogue') wrap.append(renderDialogueBlock(block));
  else if (block.type === 'transition') wrap.append(renderTransitionBlock(block));
  return wrap;
}

function chip(label, active, onClick, extraClass = '') {
  return el('button', {
    class: `chip ${active ? 'active' : ''} ${extraClass}`.trim(),
    type: 'button',
    onclick: onClick,
  }, label);
}

/* --- scene (slug line) --- */

function renderSceneBlock(block, sceneNo) {
  const body = el('div', { class: 'block-body' });

  const preview = el('div', { class: 'slug-preview' });
  const updatePreview = () => {
    const loc = (block.location || 'LOCATION').toUpperCase();
    preview.textContent = `${sceneNo}. ${block.intExt} ${loc}${block.time ? ' - ' + block.time.toUpperCase() : ''}`;
  };
  updatePreview();

  // INT/EXT chips
  const ieRow = el('div', { class: 'chip-row' });
  const drawIE = () => {
    ieRow.replaceChildren(...INT_EXT.map(v => chip(v, block.intExt === v, () => {
      block.intExt = v; markDirty(); drawIE(); updatePreview();
    })));
  };
  drawIE();

  // location input with datalist of saved locations
  const locInput = el('input', {
    type: 'text', class: 'main-field slug-location', list: 'locations-datalist',
    placeholder: 'WHERE ARE WE? (e.g. SARAH’S KITCHEN)', value: block.location || '',
    autocapitalize: 'characters', spellcheck: 'false',
  });
  locInput.addEventListener('input', () => { block.location = locInput.value; markDirty(); updatePreview(); });
  locInput.addEventListener('change', () => rememberLocation(locInput.value));
  locInput.addEventListener('blur', () => rememberLocation(locInput.value));
  locInput.addEventListener('keydown', e => mainFieldKeydown(e, block));

  // time chips + custom
  const timeRow = el('div', { class: 'chip-row' });
  const customTime = el('input', { type: 'text', class: 'chip-input', placeholder: 'custom…', spellcheck: 'false' });
  const drawTimes = () => {
    const isPreset = TIMES.includes(block.time);
    timeRow.replaceChildren(
      ...TIMES.map(t => chip(t, block.time === t, () => {
        block.time = t; customTime.value = ''; markDirty(); drawTimes(); updatePreview();
      })),
      customTime);
    if (!isPreset && block.time) customTime.value = block.time;
  };
  customTime.addEventListener('input', () => {
    block.time = customTime.value.toUpperCase();
    markDirty(); updatePreview();
    timeRow.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  });
  drawTimes();

  // cast chips
  const castRow = el('div', { class: 'chip-row cast-row' });
  const drawCast = () => {
    block.cast = block.cast || [];
    castRow.replaceChildren(
      el('span', { class: 'row-label' }, 'In this scene:'),
      ...state.project.characters.map(ch => chip(ch.name || '?', block.cast.includes(ch.id), () => {
        block.cast = block.cast.includes(ch.id) ? block.cast.filter(id => id !== ch.id) : [...block.cast, ch.id];
        markDirty(); drawCast();
      })),
      chip('+ new', false, () => {
        const name = prompt('New character name:');
        const ch = addCharacter(name);
        if (ch) { block.cast.push(ch.id); markDirty(); drawCast(); }
      }, 'chip-new'));
  };
  drawCast();

  body.append(preview, ieRow, locInput, timeRow, castRow);
  return body;
}

/* --- action --- */

function renderActionBlock(block) {
  const body = el('div', { class: 'block-body' });
  const ta = el('textarea', {
    class: 'main-field action-text', rows: 1,
    placeholder: 'What do we see? Action, description…',
  });
  ta.value = block.text || '';
  ta.addEventListener('input', () => { block.text = ta.value; autosize(ta); markDirty(); });
  ta.addEventListener('keydown', e => mainFieldKeydown(e, block));
  body.append(ta);
  requestAnimationFrame(() => autosize(ta));
  return body;
}

/* --- dialogue --- */

function characterById(id) {
  return state.project.characters.find(c => c.id === id) || null;
}

function renderDialogueBlock(block) {
  const body = el('div', { class: 'block-body dialogue-body' });

  const cueRow = el('div', { class: 'cue-row' });

  const charBtn = el('button', { class: 'char-btn', type: 'button' });
  const drawCharBtn = () => {
    const ch = characterById(block.characterId);
    charBtn.textContent = ch ? ch.name.toUpperCase() : 'WHO SPEAKS? ▾';
    charBtn.classList.toggle('unset', !ch);
  };
  drawCharBtn();
  charBtn.addEventListener('click', () => openCharacterPicker(charBtn, block, drawCharBtn));

  const extSel = el('select', { class: 'ext-select', title: 'Extension (V.O., O.S., …)' },
    ...EXTENSIONS.map(x => el('option', { value: x, selected: block.extension === x }, x || '—')));
  extSel.addEventListener('change', () => { block.extension = extSel.value; markDirty(); });

  const parenInput = el('input', {
    type: 'text', class: 'paren-input',
    placeholder: '(beat)', value: block.parenthetical || '',
  });
  parenInput.hidden = !block.parenthetical;
  parenInput.addEventListener('input', () => { block.parenthetical = parenInput.value; markDirty(); });

  const parenBtn = el('button', { class: 'ghost paren-toggle', type: 'button', title: 'Add a parenthetical — how the line is said' }, '(…)');
  parenBtn.addEventListener('click', () => {
    parenInput.hidden = !parenInput.hidden;
    if (!parenInput.hidden) parenInput.focus();
    else { block.parenthetical = ''; parenInput.value = ''; markDirty(); }
  });

  cueRow.append(charBtn, extSel, parenBtn);

  const ta = el('textarea', { class: 'main-field dialogue-text', rows: 1, placeholder: 'What do they say?' });
  ta.value = block.text || '';
  ta.addEventListener('input', () => { block.text = ta.value; autosize(ta); markDirty(); });
  ta.addEventListener('keydown', e => mainFieldKeydown(e, block));

  body.append(cueRow, parenInput, ta);
  requestAnimationFrame(() => autosize(ta));
  return body;
}

function openCharacterPicker(anchor, block, onPicked) {
  const scene = sceneForBlock(block.id);
  const cast = scene ? (scene.cast || []) : [];
  const inScene = state.project.characters.filter(c => cast.includes(c.id));
  const others = state.project.characters.filter(c => !cast.includes(c.id));

  const pick = ch => {
    block.characterId = ch.id;
    if (scene && !(scene.cast || []).includes(ch.id)) {
      scene.cast = [...(scene.cast || []), ch.id];
      renderScript(); // refresh the scene's cast chips
    }
    markDirty();
    onPicked();
    closePopover();
    focusBlock(block.id, 'main');
  };

  const section = (label, chars) => chars.length ? [
    el('div', { class: 'popover-label' }, label),
    ...chars.map(ch => el('button', { class: 'popover-item', onclick: () => pick(ch) },
      el('strong', {}, ch.name.toUpperCase()),
      ch.desc ? el('span', { class: 'popover-desc' }, ' ' + ch.desc) : null)),
  ] : [];

  const newBtn = el('button', { class: 'popover-item popover-new', onclick: () => {
    const name = prompt('New character name:');
    const ch = addCharacter(name);
    if (ch) pick(ch);
  } }, '+ New character…');

  const items = [
    ...section('In this scene', inScene),
    ...section(inScene.length ? 'Everyone else' : 'Characters', others),
    newBtn,
  ];
  if (!inScene.length && !others.length) {
    items.unshift(el('div', { class: 'popover-label' }, 'No characters yet'));
  }
  showPopover(anchor, items);
}

/* --- transition --- */

function renderTransitionBlock(block) {
  const body = el('div', { class: 'block-body' });
  const input = el('input', {
    type: 'text', class: 'main-field transition-text', value: block.text || '',
    placeholder: 'CUT TO:', spellcheck: 'false',
  });
  input.addEventListener('input', () => { block.text = input.value.toUpperCase(); markDirty(); });
  input.addEventListener('keydown', e => mainFieldKeydown(e, block));
  const row = el('div', { class: 'chip-row' },
    ...TRANSITIONS.map(t => chip(t, block.text === t, () => {
      block.text = t; input.value = t; markDirty();
      row.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c.textContent === t));
    })));
  body.append(row, input);
  return body;
}

/* --------------------------------- popover ---------------------------------- */

function showPopover(anchor, children) {
  const pop = $('#popover');
  pop.replaceChildren(...children);
  pop.hidden = false;
  const r = anchor.getBoundingClientRect();
  const top = r.bottom + window.scrollY + 4;
  let left = r.left + window.scrollX;
  pop.style.top = top + 'px';
  pop.style.left = left + 'px';
  // keep on screen
  requestAnimationFrame(() => {
    const pr = pop.getBoundingClientRect();
    if (pr.right > window.innerWidth - 8) {
      pop.style.left = Math.max(8, window.innerWidth - pr.width - 8) + window.scrollX + 'px';
    }
  });
  setTimeout(() => document.addEventListener('pointerdown', popoverOutside, { once: false }), 0);
}

function popoverOutside(e) {
  const pop = $('#popover');
  if (!pop.contains(e.target)) closePopover();
}

function closePopover() {
  const pop = $('#popover');
  pop.hidden = true;
  pop.replaceChildren();
  document.removeEventListener('pointerdown', popoverOutside);
}

/* ---------------------------------- print ----------------------------------- */

function printProject() {
  const p = state.project;
  const root = $('#print-root');
  root.replaceChildren();

  // --- title page ---
  const t = p.title;
  const tp = el('div', { class: 'print-title-page' },
    el('div', { class: 'ptp-center' },
      el('div', { class: 'ptp-title' }, (t.title || 'UNTITLED').toUpperCase()),
      t.credit ? el('div', { class: 'ptp-credit' }, t.credit) : null,
      t.author ? el('div', { class: 'ptp-author' }, t.author) : null,
      t.source ? el('div', { class: 'ptp-source' }, t.source) : null),
    el('div', { class: 'ptp-bottom' },
      el('div', { class: 'ptp-contact' },
        ...(t.contact ? t.contact.split('\n').map(l => el('div', {}, l)) : []),
        t.copyright ? el('div', {}, t.copyright) : null),
      el('div', { class: 'ptp-draft' }, t.draftDate || '')));
  root.append(tp);

  // --- script pages ---
  const script = el('div', { class: 'print-script' });
  for (const block of p.blocks) {
    switch (block.type) {
      case 'scene': {
        const loc = (block.location || '').toUpperCase();
        const time = block.time ? ' - ' + block.time.toUpperCase() : '';
        script.append(el('div', { class: 'p-scene' }, `${block.intExt} ${loc}${time}`.trim()));
        break;
      }
      case 'action': {
        if ((block.text || '').trim()) {
          for (const para of block.text.trim().split(/\n{2,}/)) {
            script.append(el('div', { class: 'p-action' }, para));
          }
        }
        break;
      }
      case 'dialogue': {
        const ch = characterById(block.characterId);
        const cue = (ch ? ch.name : 'CHARACTER').toUpperCase() + (block.extension ? ` (${block.extension})` : '');
        const group = el('div', { class: 'p-dialogue-group' }, el('div', { class: 'p-character' }, cue));
        if ((block.parenthetical || '').trim()) {
          let paren = block.parenthetical.trim();
          if (!paren.startsWith('(')) paren = '(' + paren;
          if (!paren.endsWith(')')) paren += ')';
          group.append(el('div', { class: 'p-paren' }, paren));
        }
        group.append(el('div', { class: 'p-speech' }, (block.text || '').trim()));
        script.append(group);
        break;
      }
      case 'transition': {
        if ((block.text || '').trim()) script.append(el('div', { class: 'p-transition' }, block.text.trim().toUpperCase()));
        break;
      }
    }
  }
  root.append(script);
  window.print();
}

/* ----------------------------------- init ----------------------------------- */

function wireChrome() {
  $('#btn-back').addEventListener('click', showLibrary);
  $('#btn-new').addEventListener('click', newProject);
  $('#btn-print').addEventListener('click', printProject);

  $('#btn-import').addEventListener('click', () => $('#file-input').click());
  $('#file-input').addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) importFile(file);
    e.target.value = '';
  });

  $('#btn-export').addEventListener('click', e => {
    e.stopPropagation();
    showPopover(e.currentTarget, [
      el('button', { class: 'popover-item', onclick: () => { exportJSON(state.project); closePopover(); } }, 'Screenr backup (.json)'),
      el('button', { class: 'popover-item', onclick: () => { exportFountain(state.project); closePopover(); } }, 'Fountain (.fountain)'),
    ]);
  });

  $$('#tabs button').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));

  $$('#block-toolbar button[data-add]').forEach(b =>
    b.addEventListener('click', () => addBlockAfter(b.dataset.add, state.focusBlockId)));

  $('#btn-first-scene').addEventListener('click', () => addBlockAfter('scene', null));

  $('#char-add-form').addEventListener('submit', e => {
    e.preventDefault();
    const nameInput = $('#char-add-name');
    const descInput = $('#char-add-desc');
    if (addCharacter(nameInput.value, descInput.value.trim())) {
      nameInput.value = '';
      descInput.value = '';
      nameInput.focus();
    }
  });

  $('#loc-add-form').addEventListener('submit', e => {
    e.preventDefault();
    const input = $('#loc-add-name');
    rememberLocation(input.value);
    markDirty();
    input.value = '';
    input.focus();
  });

  window.addEventListener('beforeunload', () => { if (state.project) saveNow(); });
}

wireChrome();
showLibrary();
