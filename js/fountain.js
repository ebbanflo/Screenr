/* Screenr — Fountain (.fountain) export and import
   Spec: https://fountain.io/syntax */
'use strict';

const ScreenrFountain = (() => {

  function fid() {
    return (crypto.randomUUID) ? crypto.randomUUID()
      : 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function line(label, value) {
    return value && value.trim() ? `${label}: ${value.trim()}\n` : '';
  }

  function multiline(label, value) {
    if (!value || !value.trim()) return '';
    const lines = value.trim().split('\n').map(l => '   ' + l).join('\n');
    return `${label}:\n${lines}\n`;
  }

  function characterCue(project, block) {
    const ch = (project.characters || []).find(c => c.id === block.characterId);
    let cue = (ch ? ch.name : (block.characterName || 'CHARACTER')).toUpperCase();
    if (block.extension) cue += ` (${block.extension})`;
    // Fountain auto-detects all-caps character cues; force with @ if the
    // name contains lowercase-only glyphs (e.g. numbers-only names are fine).
    return /[A-Z]/.test(cue) ? cue : '@' + cue;
  }

  function slugText(block) {
    let s = ((block.intExt || '') + ' ' + (block.location || '').toUpperCase()).trim();
    if (block.time) s += ' - ' + block.time.toUpperCase();
    return s;
  }

  function toFountain(project) {
    const out = [];
    const t = project.title || {};

    let titlePage = '';
    titlePage += line('Title', t.title);
    titlePage += line('Credit', t.credit);
    titlePage += line('Author', t.author);
    titlePage += line('Source', t.source);
    titlePage += line('Draft date', t.draftDate);
    titlePage += multiline('Contact', t.contact);
    titlePage += line('Copyright', t.copyright);
    if (titlePage) out.push(titlePage.trimEnd());

    for (const block of (project.blocks || [])) {
      switch (block.type) {
        case 'scene': {
          const slug = slugText(block);
          // Force scene heading with '.' when it wouldn't auto-detect.
          const auto = /^(INT|EXT|EST|INT\.?\/EXT|I\/E)[. ]/i.test(slug);
          out.push(auto ? slug : '.' + slug);
          break;
        }
        case 'action': {
          if (block.text && block.text.trim()) out.push(block.text.trim());
          break;
        }
        case 'dialogue': {
          const parts = [characterCue(project, block) + (block.dual ? ' ^' : '')];
          if (block.parenthetical && block.parenthetical.trim()) {
            let p = block.parenthetical.trim();
            if (!p.startsWith('(')) p = '(' + p;
            if (!p.endsWith(')')) p = p + ')';
            parts.push(p);
          }
          parts.push((block.text || '').trim() || ' ');
          out.push(parts.join('\n'));
          break;
        }
        case 'transition': {
          const txt = (block.text || 'CUT TO:').trim().toUpperCase();
          // Auto-detected if uppercase and ends with TO:, otherwise force with >
          out.push(/TO:$/.test(txt) ? txt : '> ' + txt);
          break;
        }
      }
    }

    return out.join('\n\n') + '\n';
  }

  /* ------------------------------- import ------------------------------- */

  const TITLE_KEYS = {
    'title': 'title', 'credit': 'credit', 'author': 'author', 'authors': 'author',
    'source': 'source', 'draft date': 'draftDate', 'contact': 'contact', 'copyright': 'copyright',
  };

  const SCENE_RE = /^(INT\s*\.?\s*\/\s*EXT|I\/E|INT|EXT|EST)\.?\s+(.+)$/i;
  const TRANSITION_RE = /^[A-Z0-9 .,'\-]+TO:$/;

  function parseSceneHeading(text) {
    let rest = text.trim().replace(/#[^#]*#\s*$/, '').trim(); // strip scene numbers
    let intExt = ''; // forced headings like ".MONTAGE" have no INT./EXT. prefix
    const m = rest.match(SCENE_RE);
    if (m) {
      const p = m[1].toUpperCase().replace(/\s/g, '');
      intExt = (p === 'I/E' || p.includes('/')) ? 'INT./EXT.' : p.replace(/\.$/, '') + '.';
      rest = m[2];
    }
    let location = rest, time = '';
    const dash = rest.lastIndexOf(' - ');
    if (dash >= 0) { location = rest.slice(0, dash); time = rest.slice(dash + 3); }
    return {
      id: fid(), type: 'scene', intExt,
      location: location.trim().toUpperCase(),
      time: time.trim().toUpperCase(),
      cast: [],
    };
  }

  function fromFountain(text) {
    const title = {};
    const characters = [];
    const locations = [];
    const blocks = [];
    const charByName = new Map();

    const getChar = name => {
      const key = name.trim().toUpperCase();
      if (!charByName.has(key)) {
        const ch = { id: fid(), name: key, desc: '' };
        charByName.set(key, ch);
        characters.push(ch);
      }
      return charByName.get(key);
    };

    text = text.replace(/\/\*[\s\S]*?\*\//g, ''); // boneyard
    const lines = text.split(/\r?\n/);

    /* --- title page: leading "Key: value" pairs until the first blank line --- */
    let i = 0;
    const titleKeyRe = /^([A-Za-z][A-Za-z ]*):\s*(.*)$/;
    if (titleKeyRe.test(lines[0] || '')) {
      let curKey = null, curVal = [];
      const commit = () => {
        if (curKey && TITLE_KEYS[curKey.toLowerCase()]) {
          title[TITLE_KEYS[curKey.toLowerCase()]] = curVal.join('\n').trim();
        }
      };
      for (; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim() === '') { i++; break; }
        const m = line.match(titleKeyRe);
        if (m && !/^\s/.test(line)) {
          commit();
          curKey = m[1];
          curVal = m[2].trim() ? [m[2].trim()] : [];
        } else if (curKey) {
          curVal.push(line.trim());
        }
      }
      commit();
    }

    /* --- body --- */
    let currentScene = null;
    let dialogue = null;   // dialogue block being filled
    let actionAcc = null;  // consecutive action lines

    const flushDialogue = () => { if (dialogue) { blocks.push(dialogue); dialogue = null; } };
    const flushAction = () => {
      if (actionAcc && actionAcc.join('\n').trim()) {
        blocks.push({ id: fid(), type: 'action', text: actionAcc.join('\n').trim() });
      }
      actionAcc = null;
    };
    const pushScene = txt => {
      flushAction();
      currentScene = parseSceneHeading(txt);
      blocks.push(currentScene);
      if (currentScene.location && !locations.includes(currentScene.location)) {
        locations.push(currentScene.location);
      }
    };

    for (; i < lines.length; i++) {
      const t = lines[i].replace(/\[\[.*?\]\]/g, '').trim(); // strip notes

      if (t === '') { flushDialogue(); flushAction(); continue; }

      if (dialogue) {
        if (/^\(.*\)$/.test(t)) {
          dialogue.parenthetical = dialogue.parenthetical ? dialogue.parenthetical + ' ' + t : t;
        } else {
          dialogue.text = dialogue.text ? dialogue.text + '\n' + t : t;
        }
        continue;
      }

      if (/^#/.test(t) || /^=/.test(t)) continue; // sections, synopses, page breaks

      if (/^\.[^.]/.test(t)) { pushScene(t.slice(1)); continue; }         // forced scene
      if (SCENE_RE.test(t)) { pushScene(t); continue; }                   // auto scene

      if (/^>.*<$/.test(t)) {                                             // centered text → action
        flushAction();
        blocks.push({ id: fid(), type: 'action', text: t.slice(1, -1).trim() });
        continue;
      }
      if (/^>/.test(t)) {                                                 // forced transition
        flushAction();
        blocks.push({ id: fid(), type: 'transition', text: t.slice(1).trim().toUpperCase() });
        continue;
      }
      if (TRANSITION_RE.test(t)) {
        flushAction();
        blocks.push({ id: fid(), type: 'transition', text: t });
        continue;
      }

      /* character cue: forced with @, or an all-caps line followed by a non-blank line */
      const next = (lines[i + 1] || '').trim();
      const isCaps = t === t.toUpperCase() && /[A-Z]/.test(t);
      if ((t.startsWith('@') || isCaps) && next !== '') {
        let cue = t, dual = false, ext = '';
        if (cue.endsWith('^')) { dual = true; cue = cue.slice(0, -1).trim(); }
        if (cue.startsWith('@')) cue = cue.slice(1).trim();
        const em = cue.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
        if (em) { cue = em[1].trim(); ext = em[2].trim(); }
        if (cue) {
          flushAction();
          const ch = getChar(cue);
          if (currentScene && !currentScene.cast.includes(ch.id)) currentScene.cast.push(ch.id);
          dialogue = { id: fid(), type: 'dialogue', characterId: ch.id, extension: ext, parenthetical: '', text: '', dual };
          continue;
        }
      }

      /* action (forced ! stripped) */
      if (!actionAcc) actionAcc = [];
      actionAcc.push(t.startsWith('!') ? t.slice(1) : t);
    }
    flushDialogue();
    flushAction();

    return { title, characters, locations, blocks };
  }

  return { toFountain, fromFountain };
})();
