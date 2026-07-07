/* Screenr — Fountain (.fountain) export
   Spec: https://fountain.io/syntax */
'use strict';

const ScreenrFountain = (() => {

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
    const parts = [];
    const prefix = block.intExt || 'INT.';
    let s = prefix + ' ' + (block.location || '').toUpperCase();
    if (block.time) s += ' - ' + block.time.toUpperCase();
    parts.push(s.trim());
    return parts.join(' ');
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
          const parts = [characterCue(project, block)];
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

  return { toFountain };
})();
