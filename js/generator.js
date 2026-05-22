// js/generator.js — D36 dice roller and Generator tab UI

const Generator = (() => {

  // ─── Core dice functions ──────────────────────────────────────────────────

  /** Roll a D3: returns 1, 2, or 3 */
  function rollD3() { return Math.floor(Math.random() * 3) + 1; }

  /** Roll a D6: returns 1–6 */
  function rollD6() { return Math.floor(Math.random() * 6) + 1; }

  /**
   * Roll D36 → returns a number like 11, 23, 35, etc.
   * D3 gives tens digit (1/2/3), D6 gives units digit (1–6).
   */
  function rollD36() {
    return rollD3() * 10 + rollD6();
  }

  /**
   * Roll on a table, avoiding duplicates (re-rolls until a valid result).
   * Ruin and Clear Conditions (allowDuplicates: true) are always accepted.
   * existingCodes: array of codes already in use (e.g. ['SL22', 'TL31'])
   * Returns { roll, entry } or null if all unique slots are filled.
   */
  function rollOnTable(tableName, existingCodes = []) {
    const table = TABLES[tableName];
    if (!table) return null;

    // Count how many unique (non-duplicate) entries exist
    const uniqueEntries = Object.values(table.entries).filter(e => !e.allowDuplicates);
    const usedUnique = existingCodes.filter(c => {
      const entry = Object.values(table.entries).find(e => e.code === c);
      return entry && !entry.allowDuplicates;
    });

    // If all unique slots are taken, can only roll Ruin/Clear
    const allUniqueFilled = usedUnique.length >= uniqueEntries.length;

    let attempts = 0;
    while (attempts < 100) {
      attempts++;
      const roll = rollD36();
      const entry = table.entries[roll];
      if (!entry) continue;

      if (entry.allowDuplicates) return { roll, entry };
      if (allUniqueFilled) continue; // avoid infinite loop
      if (!existingCodes.includes(entry.code)) return { roll, entry };
    }
    return null;
  }

  // ─── Dice animation ───────────────────────────────────────────────────────

  /**
   * Animate a D3 and D6 element, then settle on final values.
   * Calls callback when animation completes.
   */
  function animateDice(d3El, d6El, finalD3, finalD6, callback) {
    const FRAMES = 14;
    const INTERVAL_MS = 55;
    let frame = 0;

    const id = setInterval(() => {
      frame++;
      if (frame >= FRAMES) {
        clearInterval(id);
        d3El.textContent = finalD3;
        d6El.textContent = finalD6;
        d3El.classList.remove('spinning');
        d6El.classList.remove('spinning');
        if (callback) callback();
      } else {
        d3El.textContent = Math.floor(Math.random() * 3) + 1;
        d6El.textContent = Math.floor(Math.random() * 6) + 1;
      }
    }, INTERVAL_MS);
  }

  // ─── Generator tab UI ─────────────────────────────────────────────────────

  /** Groups of sections */
  const GROUPS = [
    {
      id: 'surface',
      label: 'Surface',
      btnLabel: 'Roll Surface',
      sections: [
        { key: 'surfaceLocation',  label: 'Surface Location',  icon: '🏔' },
        { key: 'surfaceCondition', label: 'Surface Condition', icon: '🌩' }
      ]
    },
    {
      id: 'tomb',
      label: 'Tomb World',
      btnLabel: 'Roll Tomb World',
      sections: [
        { key: 'tombLocation',    label: 'Tomb Location',    icon: '⚰' },
        { key: 'tombCondition',   label: 'Tomb Condition',   icon: '👁' }
      ]
    }
  ];

  /** Track last result per section */
  const lastResults = {};

  /** Build the generator tab HTML */
  function renderTab() {
    const container = document.getElementById('tab-generator');
    if (!container) return;

    container.innerHTML = `
      <div class="gen-intro">
        <p>Roll D3 (tens) + D6 (units) = D36 result. Duplicate non-Ruin results are automatically re-rolled.</p>
      </div>
      <div class="gen-groups">
        ${GROUPS.map(g => buildGroup(g)).join('')}
      </div>
    `;

    GROUPS.forEach(g => {
      g.sections.forEach(s => bindSection(s));
      bindGroupButton(g);
    });
  }

  function buildGroup({ id, label, btnLabel, sections }) {
    return `
      <div class="gen-group" id="gen-group-${id}">
        <div class="gen-group-header">
          <h2 class="gen-group-title">${label}</h2>
          <button class="btn btn-group-roll" id="btn-group-${id}">${btnLabel}</button>
        </div>
        <div class="gen-group-grid">
          ${sections.map(s => buildSection(s)).join('')}
        </div>
      </div>
    `;
  }

  function buildSection({ key, label, icon }) {
    return `
      <div class="gen-section" id="gen-${key}">
        <div class="gen-section-header">
          <span class="gen-icon">${icon}</span>
          <h3>${label}</h3>
        </div>
        <div class="gen-dice-row">
          <div class="die-wrap">
            <div class="die die-d3" id="die-d3-${key}">–</div>
            <div class="die-label">D3</div>
          </div>
          <div class="die-plus">+</div>
          <div class="die-wrap">
            <div class="die die-d6" id="die-d6-${key}">–</div>
            <div class="die-label">D6</div>
          </div>
          <div class="die-equals">=</div>
          <div class="die-wrap">
            <div class="die die-result" id="die-result-${key}">–</div>
            <div class="die-label">Result</div>
          </div>
        </div>
        <button class="btn btn-roll" id="btn-roll-${key}" data-table="${key}">
          Roll D36
        </button>
        <div class="gen-result-card hidden" id="result-${key}"></div>
      </div>
    `;
  }

  function bindSection({ key }) {
    const btn = document.getElementById(`btn-roll-${key}`);
    if (!btn) return;
    btn.addEventListener('click', () => performRoll(key));
  }

  function bindGroupButton({ id, btnLabel, sections }) {
    const btn = document.getElementById(`btn-group-${id}`);
    if (!btn) return;
    btn.addEventListener('click', () => {
      btn.disabled = true;
      btn.textContent = 'Rolling…';
      let remaining = sections.length;
      const onDone = () => {
        remaining--;
        if (remaining === 0) {
          btn.disabled = false;
          btn.textContent = btnLabel;
        }
      };
      sections.forEach(s => performRoll(s.key, onDone));
    });
  }

  function performRoll(key, onComplete) {
    const btn = document.getElementById(`btn-roll-${key}`);
    const d3El = document.getElementById(`die-d3-${key}`);
    const d6El = document.getElementById(`die-d6-${key}`);
    const resultEl = document.getElementById(`die-result-${key}`);
    const cardEl = document.getElementById(`result-${key}`);

    btn.disabled = true;
    btn.textContent = 'Rolling…';
    resultEl.textContent = '?';
    cardEl.classList.add('hidden');
    d3El.classList.add('spinning');
    d6El.classList.add('spinning');

    // Build existing codes from App state
    const existingCodes = typeof App !== 'undefined'
      ? getExistingCodes(App.state, key)
      : [];

    const result = rollOnTable(key, existingCodes);
    if (!result) {
      btn.disabled = false;
      btn.textContent = 'Roll D36';
      d3El.classList.remove('spinning');
      d6El.classList.remove('spinning');
      App && App.showToast('All unique results already on map.', 'warn');
      if (onComplete) onComplete();
      return;
    }

    const { roll, entry } = result;
    const d3Val = Math.floor(roll / 10);
    const d6Val = roll % 10;

    animateDice(d3El, d6El, d3Val, d6Val, () => {
      resultEl.textContent = roll;
      lastResults[key] = { roll, entry };
      renderResultCard(cardEl, entry, roll, key);
      cardEl.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = 'Roll Again';
      if (onComplete) onComplete();
    });
  }

  function renderResultCard(el, entry, roll, tableKey) {
    const table = TABLES[tableKey];
    const dupNote = entry.allowDuplicates
      ? '<span class="tag tag-dup">Duplicates allowed</span>'
      : '';
    const blockNote = entry.blocksHex
      ? '<span class="tag tag-warn">Blocks hex on exploration</span>'
      : '';
    const reserveNotes = buildReserveNotes(entry);

    el.innerHTML = `
      <div class="result-header">
        <span class="result-code">${entry.code}</span>
        <span class="result-name">${entry.name}</span>
        ${dupNote}${blockNote}
      </div>
      ${reserveNotes}
      <div class="result-rules">${entry.rules.replace(/\n/g, '<br>')}</div>
    `;
  }

  function buildReserveNotes(entry) {
    const tags = [];
    if (entry.hasSupplyReserve) {
      tags.push(`<span class="tag tag-sp">SP Reserve: roll ${entry.supplyReserveDice} on explore</span>`);
    }
    if (entry.hasIntelReserve) {
      tags.push(`<span class="tag tag-sp">Intel Reserve: roll ${entry.intelReserveDice} on explore</span>`);
    }
    if (entry.hasCPReserve) {
      tags.push(`<span class="tag tag-cp">CP Reserve: roll ${entry.cpReserveDice} on explore</span>`);
    }
    if (entry.hasBeast) {
      tags.push(`<span class="tag tag-warn">Beast — threatens nearby kill teams!</span>`);
    }
    if (entry.hasPrisoner) {
      tags.push(`<span class="tag tag-warn">Prisoner released on first Encamp</span>`);
    }
    if (entry.hasDoomSearchCost) {
      tags.push(`<span class="tag tag-warn">Search cost: roll D3 on explore (solo: raises threat D3)</span>`);
    }
    return tags.length ? `<div class="result-tags">${tags.join('')}</div>` : '';
  }

  // ─── Public API ───────────────────────────────────────────────────────────
  return {
    init: renderTab,
    rollD3,
    rollD6,
    rollD36,
    rollOnTable
  };

})();
