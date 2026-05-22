// js/app.js — State management, tab routing, and all tab UIs (except hex map)

const App = (() => {

  // ─── Kill Team roster ─────────────────────────────────────────────────────
  const STORAGE_KEY = 'killteam24_campaign';

  const KILL_TEAMS = [
    'ANGELS OF DEATH',
    'BATTLECLADE',
    'BLADES OF KHAINE',
    'BROOD BROTHERS',
    'CANOPTEK CIRCLE',
    'CELESTIAN INSIDIANTS',
    'CHAOS CULT',
    'DEATHWATCH',
    'EXACTION SQUAD',
    'FARSTALKER KINBAND',
    'FELLGOR RAVAGERS',
    'GOREMONGERS',
    'HAND OF THE ARCHON',
    'HEARTHKYN SALVAGERS',
    'HERNKYN YAEGIRS',
    'HIEROTEK CIRCLE',
    'IMPERIAL NAVY BREACHERS',
    'KASRKIN',
    'MANDRAKES',
    'MURDERWING',
    'NEMESIS CLAW',
    'PLAGUE MARINES',
    'RATLINGS',
    'RAVENERS',
    'SANCTIFIERS',
    'SCOUT SQUAD',
    'SPECTRE SQUAD',
    'TEMPESTUS AQUILONS',
    'VESPID STINGWINGS',
    'WOLF SCOUTS',
    'WRECKA KREW',
    'XV26 STEALTH BATTLESUITS',
  ];

  // ─── Default state ────────────────────────────────────────────────────────
  function defaultState() {
    return {
      campaign: {
        name: 'Ctesiphus Expedition',
        mapCols: 8,
        mapRows: 7,
        isSolo: true,
        currentRound: 1,
        currentPhase: 0,       // 0=Movement, 1=Battle, 2=Action, 3=Threat
        threatLevel: 0,
        maxThreat: 10,
        threatLowerUsesLeft: 3,
        autoThreatRoll: false,
        tombWarningSeen: false,
        started: false
      },
      killTeams: [],
      campaignLog: [],
      hexes: {}
    };
  }

  let state = defaultState();

  // ─── Persistence ──────────────────────────────────────────────────────────
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Save failed:', e);
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        state = Object.assign(defaultState(), JSON.parse(raw));
        // Deep merge campaign sub-object
        state.campaign = Object.assign(defaultState().campaign, state.campaign);
        // Migrate from old mapSize to mapCols/mapRows
        if (!state.campaign.mapCols && state.campaign.mapSize) {
          const sizeMap = { A: [5,6], B: [6,6], C: [6,7], D: [7,6], E: [8,7] };
          const [mc, mr] = sizeMap[state.campaign.mapSize] || [8, 7];
          state.campaign.mapCols = mc;
          state.campaign.mapRows = mr;
          state.hexes = {}; // Clear hexes; old IDs don't align with new pure-rectangle layout
        }
      }
    } catch (e) {
      console.warn('Load failed, using defaults:', e);
      state = defaultState();
    }
  }

  function resetState() {
    localStorage.removeItem(STORAGE_KEY);
    state = defaultState();
    save();
  }

  // ─── Toast notifications ──────────────────────────────────────────────────
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // ─── Tab routing ─────────────────────────────────────────────────────────
  function switchTab(tabId) {
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const pane = document.getElementById(`tab-${tabId}`);
    const btn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    if (pane) pane.classList.add('active');
    if (btn) btn.classList.add('active');

    // Trigger render for active tab
    if (tabId === 'generator') Generator.init();
    if (tabId === 'killteam') renderKillTeamTab();
    if (tabId === 'log') renderLogTab();
    if (tabId === 'settings') renderSettingsTab();
    if (tabId === 'map') {
      if (typeof HexMap !== 'undefined') HexMap.refresh();
      else renderMapPlaceholder();
    }
  }

  // ─── Phase names ─────────────────────────────────────────────────────────
  const PHASE_NAMES = ['Movement Phase', 'Battle Phase', 'Action Phase', 'Threat Phase'];
  const PHASE_DESCS = [
    'Move your kill team up to 3 hexes (−1 SP per hex moved), or Regroup to your nearest base/camp (free), or Hold in place.',
    'Play a game of Kill Team using the condition rules of the relevant hex. Win → 1 Campaign point. Draw or Loss → 1 Supply point.',
    'Each player performs one campaign action: Scout, Resupply, Search, Encamp, or Demolish. Supply point cost must be paid.',
    'Resolve all location rules that trigger in the Threat phase, then raise threat by 1 (multiplayer) or use the Solo Threat controls below.',
  ];

  // ─── Help icon helper ────────────────────────────────────────────────
  function helpIcon(html) {
    return `<span class="help-icon" tabindex="0">?<span class="help-tip">${html}</span></span>`;
  }

  // ─── Kill Team Tab ────────────────────────────────────────────────────────
  function renderKillTeamTab() {
    const container = document.getElementById('tab-killteam');
    if (!container) return;

    container.innerHTML = `
      <div class="tab-toolbar">
        <h2>Kill Teams</h2>
        <button class="btn btn-primary" id="btn-add-team">+ Add Kill Team</button>
      </div>
      <div id="kill-team-list">
        ${state.killTeams.length === 0
          ? '<div class="empty-state">No kill teams yet. Add one to get started.</div>'
          : state.killTeams.map((team, i) => buildTeamCard(team, i)).join('')
        }
      </div>
    `;

    document.getElementById('btn-add-team').addEventListener('click', addKillTeam);
    bindTeamCardEvents();
  }

  function buildTeamCard(team, idx) {
    const ops = team.operatives || [];
    const activeCount    = ops.filter(o => o.status === 'active').length;
    const injuredCount   = ops.filter(o => o.status === 'injured').length;
    const casualtyCount  = ops.filter(o => o.status === 'casualty').length;

    return `
      <div class="team-card" data-idx="${idx}">
        <div class="team-card-header">
          <div class="team-card-title-block">
            <input class="team-name-input" type="text" value="${escHtml(team.name)}"
              placeholder="Kill Team Name" data-field="name" data-idx="${idx}">
            <select class="team-type-select" data-field="killTeamType" data-idx="${idx}">
              <option value="">— Select Kill Team —</option>
              ${KILL_TEAMS.map(t => `<option value="${t}" ${team.killTeamType === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
          </div>
          <button class="btn btn-danger btn-sm btn-delete-team" data-idx="${idx}">Remove</button>
        </div>

        <div class="team-fields">
          <div class="field-row">
            <label>Current Hex</label>
            <input type="text" value="${escHtml(team.currentHex || '')}" placeholder="e.g. 3,1"
              data-field="currentHex" data-idx="${idx}">
          </div>
          <div class="field-row">
            <label>Base Hex</label>
            <input type="text" value="${escHtml(team.baseHex || '')}" placeholder="e.g. 0,0"
              data-field="baseHex" data-idx="${idx}">
          </div>
          <div class="field-row">
            <label>Camp Hexes</label>
            <input type="text" value="${escHtml((team.campHexes || []).join(', '))}" placeholder="e.g. 1,0, 2,1"
              data-field="campHexes" data-idx="${idx}">
          </div>
        </div>

        <div class="team-counters">
          <div class="counter-group">
            <label>Campaign Points</label>
            <div class="counter">
              <button class="counter-btn" data-action="dec" data-field="cp" data-idx="${idx}">−</button>
              <span class="counter-val" id="cp-val-${idx}">${team.cp || 0}</span>
              <button class="counter-btn" data-action="inc" data-field="cp" data-idx="${idx}">+</button>
            </div>
          </div>
          <div class="counter-group">
            <label>Supply Points <span class="counter-hint">(0–10)</span></label>
            <div class="counter">
              <button class="counter-btn" data-action="dec" data-field="sp" data-idx="${idx}">−</button>
              <span class="counter-val" id="sp-val-${idx}">${team.sp !== undefined ? team.sp : 10}</span>
              <button class="counter-btn" data-action="inc" data-field="sp" data-idx="${idx}">+</button>
            </div>
          </div>
        </div>

        <!-- ─── Operatives Roster ─────────────────────────────────────── -->
        <div class="team-operatives">
          <div class="operatives-header">
            <div class="operatives-title">
              <h4>Operatives</h4>
              ${ops.length > 0 ? `<span class="op-summary">
                <span class="op-pip active" title="Active">●</span>${activeCount}
                ${injuredCount  > 0 ? `<span class="op-pip injured"  title="Injured">●</span>${injuredCount}` : ''}
                ${casualtyCount > 0 ? `<span class="op-pip casualty" title="Casualty">●</span>${casualtyCount}` : ''}
              </span>` : ''}
            </div>
            <button class="btn btn-sm btn-add-operative" data-idx="${idx}">+ Add Operative</button>
          </div>
          <div class="operatives-list" id="op-list-${idx}">
            ${ops.length === 0
              ? `<div class="op-empty">No operatives added yet.</div>`
              : ops.map((op, oi) => buildOperativeRow(op, idx, oi)).join('')
            }
          </div>
        </div>

        <div class="team-objectives">
          <h4>Objectives Tracker</h4>
          <div class="obj-grid">
            ${buildObjCounter('gamesWon',          'Games Won',                    team, idx)}
            ${buildObjCounter('gamesPlayed',        'Games Played',                 team, idx)}
            ${buildObjCounter('hexesExplored',      'Hexes Explored',               team, idx)}
            ${buildObjCounter('spSpent',            'SP Spent',                     team, idx)}
            ${buildObjCounter('opsIncapacitated',   'Ops Incapacitated*',           team, idx)}
          </div>
          <p class="obj-note">* Headhunter: ≤5 wounds = 0; 6–10 wounds = 1; 11+ wounds = 2.</p>
        </div>

        <div class="team-notes">
          <label>Notes</label>
          <textarea data-field="notes" data-idx="${idx}" placeholder="Mission notes, special rules, reminders…">${escHtml(team.notes || '')}</textarea>
        </div>
      </div>
    `;
  }

  function buildOperativeRow(op, ti, oi) {
    const status = op.status || 'active';
    const statusLabel = { active: 'Active', injured: 'Injured', casualty: 'Casualty' }[status] || 'Active';
    return `
      <div class="op-row op-status-${status}" data-tidx="${ti}" data-oidx="${oi}">
        <div class="op-row-main">
          <span class="op-status-indicator" title="${statusLabel}"></span>
          <input class="op-field op-name-input" type="text" value="${escHtml(op.name || '')}"
            placeholder="Operative name" data-opfield="name" data-tidx="${ti}" data-oidx="${oi}">
          <input class="op-field op-type-input" type="text" value="${escHtml(op.type || '')}"
            placeholder="Type / role" data-opfield="type" data-tidx="${ti}" data-oidx="${oi}">
          <select class="op-status-select" data-opfield="status" data-tidx="${ti}" data-oidx="${oi}">
            <option value="active"   ${status === 'active'   ? 'selected' : ''}>Active</option>
            <option value="injured"  ${status === 'injured'  ? 'selected' : ''}>Injured</option>
            <option value="casualty" ${status === 'casualty' ? 'selected' : ''}>Casualty</option>
          </select>
          <div class="op-xp-wrap">
            <button class="op-xp-btn" data-opaction="dec-xp" data-tidx="${ti}" data-oidx="${oi}">−</button>
            <span class="op-xp-val" id="op-xp-${ti}-${oi}">${op.xp || 0}</span><span class="op-xp-lbl">XP</span>
            <button class="op-xp-btn" data-opaction="inc-xp" data-tidx="${ti}" data-oidx="${oi}">+</button>
          </div>
          <button class="btn btn-danger btn-xs btn-del-operative" data-tidx="${ti}" data-oidx="${oi}" title="Remove operative">✕</button>
        </div>
        <input class="op-field op-injuries-input" type="text" value="${escHtml(op.injuries || '')}"
          placeholder="Injuries, abilities, notes…" data-opfield="injuries" data-tidx="${ti}" data-oidx="${oi}">
      </div>
    `;
  }

  function buildObjCounter(field, label, team, idx) {
    const val = team[field] || 0;
    return `
      <div class="counter-group">
        <label>${label}</label>
        <div class="counter">
          <button class="counter-btn" data-action="dec" data-field="${field}" data-idx="${idx}">−</button>
          <span class="counter-val" id="${field}-val-${idx}">${val}</span>
          <button class="counter-btn" data-action="inc" data-field="${field}" data-idx="${idx}">+</button>
        </div>
      </div>
    `;
  }

  function bindTeamCardEvents() {
    // Text inputs + kill team type select
    document.querySelectorAll('[data-field][data-idx]').forEach(el => {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
        el.addEventListener('change', e => {
          const { field, idx } = e.target.dataset;
          const i = parseInt(idx, 10);
          if (field === 'campHexes') {
            state.killTeams[i].campHexes = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
          } else {
            state.killTeams[i][field] = e.target.value;
          }
          save();
          if (field === 'killTeamType') renderKillTeamTab(); // refresh badge in header
        });
      }
    });

    // Counter buttons (CP / SP / objectives)
    document.querySelectorAll('.counter-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const { action, field, idx } = e.currentTarget.dataset;
        const i = parseInt(idx, 10);
        const team = state.killTeams[i];
        let val = team[field] !== undefined ? Number(team[field]) : 0;
        if (action === 'inc') val++;
        if (action === 'dec') val--;
        if (field === 'sp') val = Math.max(0, Math.min(10, val));
        else val = Math.max(0, val);
        team[field] = val;
        const display = document.getElementById(`${field}-val-${i}`);
        if (display) display.textContent = val;
        save();
      });
    });

    // Delete kill team
    document.querySelectorAll('.btn-delete-team').forEach(btn => {
      btn.addEventListener('click', e => {
        const i = parseInt(e.currentTarget.dataset.idx, 10);
        if (!confirm(`Remove "${state.killTeams[i].name || 'this kill team'}"?`)) return;
        state.killTeams.splice(i, 1);
        save();
        renderKillTeamTab();
      });
    });

    // ─── Operative events ────────────────────────────────────────────────────

    // Add operative
    document.querySelectorAll('.btn-add-operative').forEach(btn => {
      btn.addEventListener('click', e => {
        const i = parseInt(e.currentTarget.dataset.idx, 10);
        if (!state.killTeams[i].operatives) state.killTeams[i].operatives = [];
        state.killTeams[i].operatives.push({
          name: '', type: '', status: 'active', xp: 0, injuries: ''
        });
        save();
        renderKillTeamTab();
      });
    });

    // Operative text/select fields
    document.querySelectorAll('[data-opfield]').forEach(el => {
      const evt = el.tagName === 'SELECT' ? 'change' : 'change';
      el.addEventListener(evt, e => {
        const { opfield, tidx, oidx } = e.target.dataset;
        const ti = parseInt(tidx, 10);
        const oi = parseInt(oidx, 10);
        state.killTeams[ti].operatives[oi][opfield] = e.target.value;
        save();
        // Re-render the whole tab if status changed (updates colour row + summary pip)
        if (opfield === 'status') renderKillTeamTab();
      });
    });

    // Operative XP buttons
    document.querySelectorAll('.op-xp-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const { opaction, tidx, oidx } = e.currentTarget.dataset;
        const ti = parseInt(tidx, 10);
        const oi = parseInt(oidx, 10);
        const op = state.killTeams[ti].operatives[oi];
        op.xp = Math.max(0, (op.xp || 0) + (opaction === 'inc-xp' ? 1 : -1));
        save();
        const el = document.getElementById(`op-xp-${ti}-${oi}`);
        if (el) el.textContent = op.xp;
      });
    });

    // Delete operative
    document.querySelectorAll('.btn-del-operative').forEach(btn => {
      btn.addEventListener('click', e => {
        const ti = parseInt(e.currentTarget.dataset.tidx, 10);
        const oi = parseInt(e.currentTarget.dataset.oidx, 10);
        const op = state.killTeams[ti].operatives[oi];
        if (op.name && !confirm(`Remove operative "${op.name}"?`)) return;
        state.killTeams[ti].operatives.splice(oi, 1);
        save();
        renderKillTeamTab();
      });
    });
  }

  function addKillTeam() {
    state.killTeams.push({
      name: `Kill Team ${state.killTeams.length + 1}`,
      killTeamType: '',
      currentHex: '', baseHex: '', campHexes: [],
      cp: 0, sp: 10,
      gamesWon: 0, gamesPlayed: 0, hexesExplored: 0,
      spSpent: 0, opsIncapacitated: 0,
      operatives: [],
      notes: ''
    });
    save();
    renderKillTeamTab();
  }

  // ─── Campaign Log Tab ─────────────────────────────────────────────────────
  function renderLogTab() {
    const container = document.getElementById('tab-log');
    if (!container) return;
    const c = state.campaign;
    const isSolo = c.isSolo;

    container.innerHTML = `
      <div class="log-layout">

        <!-- Left: round tracker + threat -->
        <div class="log-sidebar">
          <div class="panel">
            <h3>Round ${c.currentRound}</h3>
            <div class="phase-tracker">
              ${PHASE_NAMES.map((name, i) => `
                <div class="phase-item ${i === c.currentPhase ? 'phase-current' : i < c.currentPhase ? 'phase-done' : ''}">
                  <span class="phase-check">${i < c.currentPhase ? '✓' : i === c.currentPhase ? '▶' : '○'}</span>
                  <span>${name}</span>${helpIcon(PHASE_DESCS[i])}
                </div>
              `).join('')}
            </div>
            <div class="phase-controls">
              <button class="btn btn-sm" id="btn-prev-phase" ${c.currentPhase === 0 && c.currentRound === 1 ? 'disabled' : ''}>◀ Prev Phase</button>
              <button class="btn btn-primary btn-sm" id="btn-next-phase"
                ${c.currentPhase === 3 && c.threatLevel >= c.maxThreat ? 'disabled title="Campaign over — threat level has reached maximum"' : ''}>
                ${c.currentPhase < 3 ? 'Next Phase ▶' : c.threatLevel >= c.maxThreat ? '☠ Campaign Over' : 'End Round →'}
              </button>
            </div>
          </div>

          <div class="panel">
            <h3>Threat Level</h3>
            <div class="threat-meter">
              ${Array.from({length: 10}, (_, i) => {
                const pip = i + 1;
                const filled = pip <= c.threatLevel;
                const cls = filled
                  ? pip <= 3 ? 'pip-green'
                  : pip <= 6 ? 'pip-yellow'
                  : pip <= 9 ? 'pip-orange'
                  : 'pip-red'
                  : '';
                return `<div class="threat-pip ${filled ? 'filled ' + cls : ''}" title="Threat ${pip}">${pip}</div>`;
              }).join('')}
            </div>
            <div class="threat-display">
              <span class="threat-num ${getThreatClass(c.threatLevel)}">${c.threatLevel}</span>
              <span class="threat-slash">/</span>
              <span class="threat-max">${c.maxThreat}</span>
            </div>
            ${c.threatLevel >= c.maxThreat ? '<div class="tag tag-warn threat-end-warn">☠ Campaign over — no further rounds</div>' : ''}

            ${isSolo ? renderSoloThreatControls() : renderMultiThreatControls()}
          </div>
        </div>

        <!-- Right: log entries -->
        <div class="log-main">
          <div class="panel">
            <div class="log-entry-form">
              <h3>Add Log Entry</h3>
              <div class="field-row">
                <label>Round</label>
                <input type="number" id="log-entry-round" value="${c.currentRound}" min="1">
              </div>
              <div class="field-row">
                <label>Phase</label>
                <select id="log-entry-phase">
                  ${PHASE_NAMES.map((n, i) => `<option value="${i}" ${i === c.currentPhase ? 'selected' : ''}>${n}</option>`).join('')}
                </select>
              </div>
              <div class="field-row">
                <label>Entry</label>
                <textarea id="log-entry-text" placeholder="What happened this phase? Battle results, hex explored, actions taken…"></textarea>
              </div>
              <button class="btn btn-primary" id="btn-add-log">Add Entry</button>
            </div>
          </div>

          <div class="panel">
            <h3>Log Entries</h3>
            ${state.campaignLog.length === 0
              ? '<div class="empty-state">No log entries yet.</div>'
              : `<div class="log-entries">${state.campaignLog.map((e, i) => buildLogEntry(e, i)).join('')}</div>`
            }
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-next-phase').addEventListener('click', advancePhase);
    document.getElementById('btn-prev-phase').addEventListener('click', prevPhase);
    document.getElementById('btn-add-log').addEventListener('click', addLogEntry);
    bindSoloThreatControls();
  }

  function getThreatClass(level) {
    if (level <= 3) return 'threat-green';
    if (level <= 6) return 'threat-yellow';
    if (level <= 9) return 'threat-orange';
    return 'threat-red';
  }

  function renderSoloThreatControls() {
    const c = state.campaign;
    const usesLeft = c.threatLowerUsesLeft;
    return `
      <div class="threat-controls">
        <h4>Solo Threat Controls</h4>
        <div class="threat-roll-group">
          <p class="threat-help">Raise threat (roll D6)${helpIcon('Solo/Coop rule: when these events occur, roll D6 against the threshold shown. The Explore Tomb roll is also triggered automatically from the Map tab.')}</p>
          <div class="threat-btn-row">
            <button class="btn btn-sm threat-raise-btn" data-threshold="4" title="Threshold 4+ (explore tomb)">Explore Tomb (4+)</button>
            <button class="btn btn-sm threat-raise-btn" data-threshold="3" title="Threshold 3+ (battle win)">Battle Win (3+)</button>
            <button class="btn btn-sm threat-raise-btn" data-threshold="5" title="Threshold 5+ (battle loss/draw)">Battle Draw/Loss (5+)</button>
            <button class="btn btn-sm threat-raise-btn" data-threshold="5" title="Threshold 5+ (search)">Search (5+)</button>
          </div>
          <div class="threat-btn-row">
            <button class="btn btn-sm btn-warn threat-raise-d3-btn" data-d3="true" title="Raise by D3">Doomsday Vault / Power Cell (+D3)</button>
          </div>
        </div>
        <div class="threat-lower-group">
          <p class="threat-help">Lower threat via Resupply <span class="threat-uses">(${usesLeft} use${usesLeft !== 1 ? 's' : ''} remaining)</span>${helpIcon('Rules p.6: During the Resupply action you may lower the threat level — by 1 from any hex, or by D3 if in your base or camp. You can only do this <strong>3 times per campaign total</strong>, so choose carefully. Uses are tracked here and cannot be recovered.')}</p>
          <div class="threat-btn-row">
            <button class="btn btn-sm btn-success threat-lower-btn" data-amount="1" ${usesLeft <= 0 ? 'disabled' : ''}>−1 (any hex)</button>
            <button class="btn btn-sm btn-success threat-lower-btn" data-amount="d3" ${usesLeft <= 0 ? 'disabled' : ''}>−D3 (base or camp)</button>
          </div>
        </div>
        <div class="threat-manual-group">
          <p class="threat-help">Manual override${helpIcon('Directly adjust the threat level for bookkeeping — e.g. correcting an error or applying a rule not covered by the buttons above.')}</p>
          <div class="threat-btn-row">
            <button class="btn btn-sm threat-manual-btn" data-delta="-1">−1</button>
            <button class="btn btn-sm threat-manual-btn" data-delta="1">+1</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderMultiThreatControls() {
    return `
      <div class="threat-controls">
        <p class="threat-help">Multiplayer: threat raises by 1 each Threat phase.</p>
        <div class="threat-btn-row">
          <button class="btn btn-sm threat-manual-btn" data-delta="-1">−1</button>
          <button class="btn btn-sm threat-manual-btn" data-delta="1">+1</button>
        </div>
      </div>
    `;
  }

  function bindSoloThreatControls() {
    // Solo raise buttons (roll D6 vs threshold)
    document.querySelectorAll('.threat-raise-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const threshold = parseInt(e.currentTarget.dataset.threshold, 10);
        const label = e.currentTarget.textContent.trim();
        const roll = Generator.rollD6();
        const raised = roll >= threshold;
        const msg = `D6 = ${roll} (needs ${threshold}+): Threat ${raised ? 'RAISES by 1' : 'stays the same'}.`;
        if (raised) {
          changeThreat(1);
          showToast(msg, 'warn');
        } else {
          showToast(msg, 'info');
        }
      });
    });

    // D3 raise button
    document.querySelectorAll('.threat-raise-d3-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const roll = Generator.rollD3();
        showToast(`D3 = ${roll}: Threat raises by ${roll}.`, 'warn');
        changeThreat(roll);
      });
    });

    // Lower buttons
    document.querySelectorAll('.threat-lower-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        if (state.campaign.threatLowerUsesLeft <= 0) {
          showToast('No threat-lowering uses remaining.', 'warn');
          return;
        }
        const amount = e.currentTarget.dataset.amount;
        let delta;
        if (amount === 'd3') {
          delta = Generator.rollD3();
          showToast(`D3 = ${delta}: Threat lowers by ${delta}.`, 'success');
        } else {
          delta = parseInt(amount, 10);
          showToast(`Threat lowers by ${delta}.`, 'success');
        }
        state.campaign.threatLowerUsesLeft--;
        changeThreat(-delta);
      });
    });

    // Manual buttons
    document.querySelectorAll('.threat-manual-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const delta = parseInt(e.currentTarget.dataset.delta, 10);
        changeThreat(delta);
      });
    });
  }

  function changeThreat(delta) {
    const c = state.campaign;
    c.threatLevel = Math.max(0, Math.min(c.maxThreat, c.threatLevel + delta));
    save();
    renderLogTab();
    if (c.threatLevel >= c.maxThreat) {
      showCampaignEndPopup();
    }
  }

  function showCampaignEndPopup() {
    if (document.getElementById('campaign-end-overlay')) return; // already shown
    const c = state.campaign;
    const overlay = document.createElement('div');
    overlay.id = 'campaign-end-overlay';
    overlay.innerHTML = `
      <div class="threat-roll-modal campaign-end-modal">
        <div class="threat-roll-header campaign-end-header">☠ CTESIPHUS EXPEDITION ENDED</div>
        <div class="threat-roll-body">
          <p class="threat-roll-rule-title">The campaign has come to an end</p>
          <div class="threat-roll-rule">
            <p>The threat level has reached its maximum of <strong>${c.maxThreat}</strong>. The area has become too intense for your kill team to conduct an expedition &mdash; <strong>they must withdraw.</strong>.</p>
            ${c.isSolo
              ? `<p>The campaign concludes at the end of Round <strong>${c.currentRound}</strong>. If you have scored <strong>10 or more Campaign points</strong>, your expedition was a success!</p>`
              : `<p>The campaign concludes at the end of Round <strong>${c.currentRound}</strong>. Award objectives and titles to determine the overall winner.</p>`
            }
            <p><em>You may still review your campaign log and stats, but no further rounds can be played.</em></p>
          </div>
        </div>
        <div class="threat-roll-footer">
          <button class="btn btn-primary" id="campaign-end-ack-btn">Acknowledge</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('campaign-end-ack-btn').addEventListener('click', () => {
      overlay.remove();
      renderLogTab();
    });
  }

  function advancePhase() {
    const c = state.campaign;
    if (c.currentPhase < 3) {
      c.currentPhase++;
      save();
      renderLogTab();
    } else {
      // End of round — check/apply threat before advancing
      if (!c.isSolo) {
        // Multiplayer: Threat Phase raises threat by 1. changeThreat shows popup if max hit.
        changeThreat(1);
        if (c.threatLevel >= c.maxThreat) return; // campaign over, don't start new round
      } else {
        // Solo: threat raises happen during the round; block if already at max
        if (c.threatLevel >= c.maxThreat) {
          showCampaignEndPopup();
          return;
        }
      }
      c.currentPhase = 0;
      c.currentRound++;
      save();
      renderLogTab();
    }
  }

  function prevPhase() {
    const c = state.campaign;
    if (c.currentPhase > 0) {
      c.currentPhase--;
    } else if (c.currentRound > 1) {
      c.currentRound--;
      c.currentPhase = 3;
    }
    save();
    renderLogTab();
  }

  function addLogEntry() {
    const roundEl = document.getElementById('log-entry-round');
    const phaseEl = document.getElementById('log-entry-phase');
    const textEl = document.getElementById('log-entry-text');
    const text = textEl.value.trim();
    if (!text) { showToast('Entry cannot be empty.', 'warn'); return; }

    state.campaignLog.unshift({
      id: Date.now(),
      round: parseInt(roundEl.value, 10) || state.campaign.currentRound,
      phase: parseInt(phaseEl.value, 10),
      text,
      timestamp: new Date().toISOString()
    });
    save();
    renderLogTab();
    showToast('Log entry added.', 'success');
  }

  function buildLogEntry(entry, idx) {
    const d = new Date(entry.timestamp);
    const ts = `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`;
    return `
      <div class="log-entry">
        <div class="log-entry-meta">
          <span class="log-round">Round ${entry.round}</span>
          <span class="log-phase">${PHASE_NAMES[entry.phase] || 'Unknown'}</span>
          <span class="log-ts">${ts}</span>
          <button class="btn-icon btn-delete-log" data-idx="${idx}" title="Delete entry">✕</button>
        </div>
        <div class="log-entry-body">${escHtml(entry.text).replace(/\n/g, '<br>')}</div>
      </div>
    `;
  }

  // ─── Settings Tab ─────────────────────────────────────────────────────────
  function renderSettingsTab() {
    const container = document.getElementById('tab-settings');
    if (!container) return;
    const c = state.campaign;

    container.innerHTML = `
      <div class="settings-layout">
        <div class="panel">
          <h3>Campaign Settings</h3>
          <div class="field-row">
            <label>Campaign Name</label>
            <input type="text" id="set-name" value="${escHtml(c.name)}">
          </div>
          <div class="field-row">
            <label>Mode${helpIcon('<strong>Solo/Cooperative:</strong> threat moves up and down based on D6 rolls each campaign event. <strong>Multiplayer:</strong> threat raises by 1 automatically each Threat phase.')}</label>
            <select id="set-mode">
              <option value="true" ${c.isSolo ? 'selected' : ''}>Solo / Cooperative</option>
              <option value="false" ${!c.isSolo ? 'selected' : ''}>Multiplayer</option>
            </select>
          </div>
          <div class="field-row">
            <label>Max Threat Level${helpIcon('When threat reaches this value the campaign ends at the end of that round. Rules recommend <strong>7</strong> for an average-length campaign.')}</label>
            <input type="number" id="set-maxthreat" value="${c.maxThreat}" min="1" max="20">
          </div>
          <div class="field-row">
            <label>Current Round</label>
            <input type="number" id="set-round" value="${c.currentRound}" min="1">
          </div>
          <div class="field-row">
            <label title="Solo/Cooperative only. When off, a popup presents the threat rule and lets you roll manually. When on, the D6 is rolled automatically.">Auto-roll Threat (Solo)${helpIcon('Only applies in Solo/Cooperative mode. <strong>No (default):</strong> when you explore a tomb hex, a popup shows the rule and lets you click to roll. <strong>Yes:</strong> the D6 is rolled automatically and result shown as a toast.')}</label>
            <select id="set-auto-threat-roll">
              <option value="false" ${!c.autoThreatRoll ? 'selected' : ''}>No</option>
              <option value="true" ${c.autoThreatRoll ? 'selected' : ''}>Yes</option>
            </select>
          </div>
          <button class="btn btn-primary" id="btn-save-settings">Save Settings</button>
        </div>

        <div class="panel">
          <h3>Data</h3>
          <p class="settings-help">Export a JSON backup of your campaign, or import a previously saved one.</p>
          <div class="settings-btn-row">
            <button class="btn btn-primary" id="btn-export">Export JSON</button>
            <label class="btn" for="btn-import-file" style="cursor:pointer">Import JSON</label>
            <input type="file" id="btn-import-file" accept=".json,application/json" style="display:none">
          </div>
        </div>

        <div class="panel panel-danger">
          <h3>Danger Zone</h3>
          <p class="settings-help">Reset all data and start a new campaign. <strong>This cannot be undone.</strong></p>
          <button class="btn btn-danger" id="btn-reset">Reset Campaign</button>
        </div>
      </div>
    `;

    document.getElementById('btn-save-settings').addEventListener('click', saveSettings);
    document.getElementById('btn-export').addEventListener('click', exportJSON);
    document.getElementById('btn-import-file').addEventListener('change', importJSON);
    document.getElementById('btn-reset').addEventListener('click', confirmReset);
  }

  function saveSettings() {
    const c = state.campaign;
    c.name = document.getElementById('set-name').value.trim() || c.name;
    c.isSolo = document.getElementById('set-mode').value === 'true';
    c.maxThreat = parseInt(document.getElementById('set-maxthreat').value, 10) || 10;
    c.currentRound = parseInt(document.getElementById('set-round').value, 10) || 1;
    c.autoThreatRoll = document.getElementById('set-auto-threat-roll').value === 'true';
    save();
    updateHeader();
    showToast('Settings saved.', 'success');
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = state.campaign.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    a.href = url;
    a.download = `${safeName}_campaign.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Campaign exported.', 'success');
  }

  function importJSON(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const imported = JSON.parse(evt.target.result);
        if (!imported.campaign) throw new Error('Not a valid campaign file.');
        state = Object.assign(defaultState(), imported);
        state.campaign = Object.assign(defaultState().campaign, imported.campaign);
        save();
        showToast('Campaign imported successfully.', 'success');
        updateHeader();
        renderSettingsTab();
      } catch (err) {
        showToast('Import failed: ' + err.message, 'danger');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function confirmReset() {
    if (!confirm('Reset all campaign data? This cannot be undone.')) return;
    resetState();
    showToast('Campaign reset.', 'info');
    updateHeader();
    renderSettingsTab();
    showModal();
  }

  // ─── New Campaign Modal ───────────────────────────────────────────────────
  function showModal() {
    const modal = document.getElementById('new-campaign-modal');
    if (modal) modal.classList.add('visible');
  }

  function hideModal() {
    const modal = document.getElementById('new-campaign-modal');
    if (modal) modal.classList.remove('visible');
  }

  function bindModal() {
    const form = document.getElementById('new-campaign-form');
    if (!form) return;
    form.addEventListener('submit', e => {
      e.preventDefault();
      const c = state.campaign;
      c.name = document.getElementById('modal-name').value.trim() || 'Ctesiphus Expedition';
      c.isSolo = document.getElementById('modal-mode').value === 'true';
      c.maxThreat = parseInt(document.getElementById('modal-maxthreat').value, 10) || 10;
      c.started = true;
      save();
      hideModal();
      updateHeader();
      showToast(`Campaign "${c.name}" started!`, 'success');
    });
  }

  // ─── Header ──────────────────────────────────────────────────────────────
  function updateHeader() {
    const nameEl = document.getElementById('header-campaign-name');
    const threatEl = document.getElementById('header-threat');
    if (nameEl) nameEl.textContent = state.campaign.name;
    if (threatEl) {
      threatEl.textContent = `Threat: ${state.campaign.threatLevel}/${state.campaign.maxThreat}`;
      threatEl.className = `threat-badge ${getThreatClass(state.campaign.threatLevel)}`;
    }
  }

  // ─── Map placeholder ─────────────────────────────────────────────────────
  function renderMapPlaceholder() {
    const container = document.getElementById('tab-map');
    if (!container) return;
    if (typeof HexMap !== 'undefined') return; // Will be handled by hexmap.js
    container.innerHTML = `
      <div class="map-placeholder">
        <div class="map-placeholder-icon">⬡</div>
        <h2>Hex Map</h2>
        <p>The interactive hex map is coming in the next update (Chunk 2).</p>
        <p>Use the Generator tab to roll location and condition results,<br>
           and the Campaign Log tab to track rounds and threat level.</p>
        <p class="map-size-note">Grid: <strong>${state.campaign.mapCols || 8} × ${state.campaign.mapRows || 7}</strong> (${(state.campaign.mapCols||8) * (state.campaign.mapRows||7)} hexes)</p>
      </div>
    `;
  }

  // ─── Utilities ────────────────────────────────────────────────────────────
  function escHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ─── Initialise ──────────────────────────────────────────────────────────
  function init() {
    load();

    // Wire up tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Show modal if never started
    if (!state.campaign.started) {
      showModal();
    }
    bindModal();
    updateHeader();

    // Activate the map tab by default
    if (typeof HexMap !== 'undefined') {
      HexMap.init();
    } else {
      renderMapPlaceholder();
    }
    switchTab('map');

    // Log tab needs live event delegation for delete buttons
    document.addEventListener('click', e => {
      if (e.target.matches('.btn-delete-log')) {
        const idx = parseInt(e.target.dataset.idx, 10);
        state.campaignLog.splice(idx, 1);
        save();
        renderLogTab();
      }
    });
  }

  // ─── Public API ──────────────────────────────────────────────────────────
  return {
    init,
    save,
    load,
    get state() { return state; },
    showToast,
    showCampaignEndPopup,
    switchTab,
    renderMapPlaceholder,
    escHtml
  };

})();

// Boot
document.addEventListener('DOMContentLoaded', App.init);
