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

        ${c.currentPhase === 2 ? renderActionPanel() : ''}

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
                <label>Kill Team <span class="field-opt">(opt.)</span></label>
                <select id="log-entry-team">
                  <option value="">— None —</option>
                  ${state.killTeams.map((t, i) => `<option value="${i}">${escHtml(t.name)}</option>`).join('')}
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
    if (state.campaign.currentPhase === 2) bindActionPanel();
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

  // ─── Action Phase Panel ──────────────────────────────────────────────────
  function renderActionPanel() {
    const teams = state.killTeams;
    if (teams.length === 0) {
      return `<div class="panel"><h3>Action Phase</h3><p class="empty-state" style="margin:0">No kill teams — add one in the Kill Teams tab.</p></div>`;
    }
    return `
      <div class="panel" id="action-panel">
        <h3>Action Phase</h3>
        <div class="field-row">
          <label>Kill Team</label>
          <select id="action-team-sel">
            <option value="">— Select kill team —</option>
            ${teams.map((t, i) => `<option value="${i}">${escHtml(t.name)} · SP: ${t.sp !== undefined ? t.sp : 10}</option>`).join('')}
          </select>
        </div>
        <div id="action-team-info" class="action-team-info"></div>
        <div class="field-row">
          <label>Action</label>
          <select id="action-type-sel" disabled>
            <option value="">— Select action —</option>
            <option value="scout">Scout (1–3 SP)</option>
            <option value="resupply">Resupply (0 SP)</option>
            <option value="search">Search (1 SP)</option>
            <option value="encamp">Encamp (variable SP)</option>
            <option value="demolish">Demolish (3 SP)</option>
          </select>
        </div>
        <div id="action-fields" class="action-fields"></div>
        <p id="action-error" class="action-error"></p>
        <button class="btn btn-primary" id="action-confirm-btn" disabled style="width:100%">Perform Action</button>
      </div>
    `;
  }

  function bindActionPanel() {
    const teamSel   = document.getElementById('action-team-sel');
    const typeSel   = document.getElementById('action-type-sel');
    const confirmBtn = document.getElementById('action-confirm-btn');
    if (!teamSel) return;

    const refreshTeamInfo = (ti) => {
      const infoEl = document.getElementById('action-team-info');
      if (isNaN(ti) || ti < 0 || !state.killTeams[ti]) { infoEl.innerHTML = ''; return; }
      const t = state.killTeams[ti];
      infoEl.innerHTML = `
        <div class="action-team-stats">
          <span>SP <strong>${t.sp !== undefined ? t.sp : 10}</strong>/10</span>
          <span>CP <strong>${t.cp || 0}</strong></span>
          ${t.currentHex ? `<span>Hex <strong>${escHtml(t.currentHex)}</strong></span>` : ''}
          ${t.baseHex    ? `<span>Base <strong>${escHtml(t.baseHex)}</strong></span>` : ''}
        </div>
      `;
    };

    teamSel.addEventListener('change', () => {
      const ti = parseInt(teamSel.value, 10);
      typeSel.disabled = isNaN(ti) || teamSel.value === '';
      typeSel.value = '';
      document.getElementById('action-fields').innerHTML = '';
      document.getElementById('action-error').textContent = '';
      confirmBtn.disabled = true;
      refreshTeamInfo(ti);
    });

    typeSel.addEventListener('change', () => {
      const ti = parseInt(teamSel.value, 10);
      const actionType = typeSel.value;
      confirmBtn.disabled = !actionType;
      document.getElementById('action-error').textContent = '';
      renderActionFields(ti, actionType);
    });

    confirmBtn.addEventListener('click', performAction);
  }

  function renderActionFields(ti, actionType) {
    const fieldsEl = document.getElementById('action-fields');
    if (!fieldsEl || !actionType) { if (fieldsEl) fieldsEl.innerHTML = ''; return; }
    const isSolo = state.campaign.isSolo;

    switch (actionType) {
      case 'scout':
        fieldsEl.innerHTML = `
          <div class="field-row">
            <label>SP to spend</label>
            <select id="af-scout-sp">
              <option value="1">1 SP — explore within 1 hex</option>
              <option value="2">2 SP — explore within 2 hexes</option>
              <option value="3">3 SP — explore within 3 hexes</option>
            </select>
          </div>
          <div class="field-row">
            <label>Target hex</label>
            <input type="text" id="af-scout-hex" placeholder="Hex ID, e.g. 3,1">
          </div>
          <p class="action-rule-note">Select an unexplored, unblocked hex within the chosen range and explore it from the Map tab. In Solo/Coop, Scout is exempt from the tomb threat roll.</p>
        `;
        break;
      case 'resupply':
        fieldsEl.innerHTML = `
          <div class="field-row">
            <label>Current location</label>
            <select id="af-resupply-loc">
              <option value="base">Base hex — gain 10 SP</option>
              <option value="camp">Camp hex — gain D3+3 SP</option>
              <option value="other">Any other hex — gain 1 SP</option>
              <option value="blocked">Blocked hex — gain 0 SP</option>
            </select>
          </div>
          <p class="action-rule-note">No SP cost. SP caps at 10.${isSolo ? ' You may also lower threat via the Threat Controls above (max 3 times per campaign).' : ''}</p>
        `;
        break;
      case 'search':
        fieldsEl.innerHTML = `
          ${isSolo ? `
            <div class="field-row">
              <label>Location</label>
              <select id="af-search-loc">
                <option value="normal">Normal hex — D6: 5+ raises threat</option>
                <option value="special">Doomsday Vault (TL35) / Power Cell Sanctum (TL24) — raise threat by D3</option>
              </select>
            </div>
          ` : ''}
          <p class="action-rule-note">Cost: 1 SP. Resolves the Search rule of your current hex.${isSolo ? ' A dice roll determines threat impact in Solo/Coop.' : ''}</p>
        `;
        break;
      case 'encamp':
        fieldsEl.innerHTML = `
          <div class="field-row">
            <label>Hexes to nearest base/camp</label>
            <input type="number" id="af-encamp-dist" min="0" value="1" style="width:80px">
          </div>
          <p class="action-rule-note">Cost = hexes to nearest base or camp (excluding blocked hexes). Gain a camp in your current hex (max 2 camps). You may remove an existing camp when performing this action.</p>
        `;
        break;
      case 'demolish':
        fieldsEl.innerHTML = `
          <p class="action-rule-note">Cost: 3 SP. Removes an opponent's camp in your current hex. Requires you to have won (or challenged) a game against that opponent this campaign round.</p>
        `;
        break;
    }
  }

  function performAction() {
    const teamSel    = document.getElementById('action-team-sel');
    const typeSel    = document.getElementById('action-type-sel');
    const errorEl    = document.getElementById('action-error');
    const ti         = parseInt(teamSel.value, 10);
    const actionType = typeSel.value;
    if (isNaN(ti) || !actionType) return;

    const team  = state.killTeams[ti];
    const sp    = team.sp !== undefined ? team.sp : 10;
    const isSolo = state.campaign.isSolo;
    const round  = state.campaign.currentRound;
    const phase  = state.campaign.currentPhase;
    errorEl.textContent = '';

    switch (actionType) {
      case 'scout': {
        const spCost = parseInt(document.getElementById('af-scout-sp').value, 10) || 1;
        const hexId  = (document.getElementById('af-scout-hex').value || '').trim();
        if (sp < spCost) { errorEl.textContent = `Need ${spCost} SP — only have ${sp}.`; return; }
        if (!hexId)      { errorEl.textContent = 'Enter a target hex ID.'; return; }
        const before = sp;
        team.sp       = Math.max(0, sp - spCost);
        team.spSpent  = (team.spSpent || 0) + spCost;
        addAutoLogEntry(ti, round, phase, `\uD83D\uDD2D Scout: targeted hex ${hexId} within ${spCost} hex${spCost > 1 ? 'es' : ''} (${spCost} SP). Explore that hex from the Map tab. SP: ${before} \u2192 ${team.sp}.`);
        save(); renderLogTab();
        showToast(`Scout logged. SP: ${before} \u2192 ${team.sp}.`, 'success');
        break;
      }
      case 'resupply': {
        const loc    = (document.getElementById('af-resupply-loc') || {}).value || 'other';
        const before = sp;
        if (loc === 'camp') {
          let spGained = 0;
          showActionDicePopup({
            title: '\u26FA Resupply at Camp',
            bodyHtml: `<p>Roll a D3, then add 3 to determine Supply points gained (maximum 10). Current SP: <strong>${before}</strong>.</p>`,
            die: 'd3',
            onRolled(roll) {
              spGained   = Math.min(3 + roll, 10 - before);
              team.sp    = Math.min(10, before + spGained);
              return `D3 = <strong>${roll}</strong> \u2192 ${3 + roll} SP (capped to ${spGained} gained). SP: ${before} \u2192 ${team.sp}.`;
            },
            onClose() {
              addAutoLogEntry(ti, round, phase, `\u26FA Resupply at camp: gained ${team.sp - before} SP (D3+3). SP: ${before} \u2192 ${team.sp}.`);
              save(); renderLogTab();
              showToast('Resupply at camp logged.', 'success');
            }
          });
        } else {
          const gained = loc === 'base' ? 10 - before : loc === 'other' ? Math.min(1, 10 - before) : 0;
          team.sp = Math.min(10, before + gained);
          const locLabel = { base: 'base hex', other: 'other hex', blocked: 'blocked hex' }[loc] || loc;
          addAutoLogEntry(ti, round, phase, `\uD83C\uDFE0 Resupply at ${locLabel}: gained ${gained} SP. SP: ${before} \u2192 ${team.sp}.`);
          save(); renderLogTab();
          showToast(`Resupply: gained ${gained} SP.`, gained > 0 ? 'success' : 'info');
        }
        break;
      }
      case 'search': {
        if (sp < 1) { errorEl.textContent = 'Need 1 SP to Search.'; return; }
        const before = sp;
        team.sp      = sp - 1;
        team.spSpent = (team.spSpent || 0) + 1;
        save();
        if (!isSolo) {
          addAutoLogEntry(ti, round, phase, `\uD83D\uDD0D Search: resolved Search rule of current hex. Cost: 1 SP. SP: ${before} \u2192 ${team.sp}.`);
          save(); renderLogTab();
          showToast('Search action logged.', 'success');
        } else {
          const loc = (document.getElementById('af-search-loc') || {}).value || 'normal';
          if (loc === 'special') {
            showActionDicePopup({
              title: '\u26A0 Search \u2014 Threat Roll (D3)',
              bodyHtml: `<p>Searching the Doomsday Vault or demolishing the Power Cell Sanctum raises the threat level by D3.</p>`,
              die: 'd3',
              onRolled(roll) {
                changeThreat(roll);
                return `D3 = <strong>${roll}</strong>: threat raised by ${roll}.`;
              },
              onClose() {
                addAutoLogEntry(ti, round, phase, `\uD83D\uDD0D Search (Doomsday Vault / Power Cell): threat raised by D3. Cost: 1 SP. SP: ${before} \u2192 ${team.sp}.`);
                save(); renderLogTab();
                showToast('Search action logged.', 'success');
              }
            });
          } else {
            showSearchThreatPopup(ti, before, team, round, phase);
          }
        }
        break;
      }
      case 'encamp': {
        const dist = parseInt((document.getElementById('af-encamp-dist') || {}).value, 10) || 0;
        if (sp < dist) { errorEl.textContent = `Need ${dist} SP — only have ${sp}.`; return; }
        const before = sp;
        team.sp      = Math.max(0, sp - dist);
        team.spSpent = (team.spSpent || 0) + dist;
        addAutoLogEntry(ti, round, phase, `\u26FA Encamp: camp established at hex ${escHtml(team.currentHex || '?')}. Cost: ${dist} SP. SP: ${before} \u2192 ${team.sp}.`);
        save(); renderLogTab();
        showToast(`Encamp logged. SP: ${before} \u2192 ${team.sp}.`, 'success');
        break;
      }
      case 'demolish': {
        if (sp < 3) { errorEl.textContent = 'Need 3 SP to Demolish.'; return; }
        const before = sp;
        team.sp      = sp - 3;
        team.spSpent = (team.spSpent || 0) + 3;
        addAutoLogEntry(ti, round, phase, `\uD83D\uDCA5 Demolish: opponent's camp removed at hex ${escHtml(team.currentHex || '?')}. Cost: 3 SP. SP: ${before} \u2192 ${team.sp}.`);
        save(); renderLogTab();
        showToast(`Demolish logged. SP: ${before} \u2192 ${team.sp}.`, 'success');
        break;
      }
    }
  }

  function showActionDicePopup({ title, bodyHtml, die, onRolled, onClose }) {
    if (document.getElementById('action-dice-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'action-dice-overlay';
    overlay.innerHTML = `
      <div class="threat-roll-modal">
        <div class="threat-roll-header">${title}</div>
        <div class="threat-roll-body threat-roll-rule">${bodyHtml}</div>
        <div class="threat-roll-result" id="adp-result"></div>
        <div class="threat-roll-footer">
          <button class="btn btn-primary threat-roll-dice-btn" id="adp-roll-btn">\uD83C\uDFB2 Roll ${die.toUpperCase()}</button>
          <button class="btn" id="adp-cont-btn" style="display:none">Continue</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('adp-roll-btn').addEventListener('click', () => {
      const roll = die === 'd3' ? Generator.rollD3() : Generator.rollD6();
      const msg  = onRolled(roll);
      document.getElementById('adp-result').innerHTML = `<div class="threat-result-raised">${msg}</div>`;
      document.getElementById('adp-roll-btn').style.display = 'none';
      document.getElementById('adp-cont-btn').style.display = '';
    });

    document.getElementById('adp-cont-btn').addEventListener('click', () => {
      overlay.remove();
      if (onClose) onClose();
    });
  }

  function showSearchThreatPopup(ti, spBefore, team, round, phase) {
    if (document.getElementById('action-dice-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'action-dice-overlay';
    overlay.innerHTML = `
      <div class="threat-roll-modal">
        <div class="threat-roll-header">\u26A0 Search \u2014 Threat Roll</div>
        <div class="threat-roll-body">
          <p class="threat-roll-rule-title">Solo / Cooperative Search Rule</p>
          <div class="threat-roll-rule">
            <p>After performing the Search action, roll one D6:</p>
            <ul>
              <li>On a <strong>5 or 6</strong> \u2014 raise the threat level by 1 (or spend 1 additional SP to avoid it).</li>
              <li>On a <strong>1\u20134</strong> \u2014 threat level is unchanged.</li>
            </ul>
            <p>SP remaining: <span id="stp-sp"><strong>${team.sp}</strong></span> / 10</p>
          </div>
        </div>
        <div class="threat-roll-result" id="stp-result"></div>
        <div id="stp-avoid-row" style="display:none;text-align:center;margin-top:.5rem">
          <button class="btn btn-sm btn-warn" id="stp-avoid-btn">Spend 1 SP to cancel threat raise</button>
        </div>
        <div class="threat-roll-footer">
          <button class="btn btn-primary threat-roll-dice-btn" id="stp-roll-btn">\uD83C\uDFB2 Roll D6</button>
          <button class="btn" id="stp-cont-btn" style="display:none">Continue</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    let threatWillRaise = false;

    document.getElementById('stp-roll-btn').addEventListener('click', () => {
      const roll = Generator.rollD6();
      const raised = roll >= 5;
      const resultEl = document.getElementById('stp-result');
      if (raised) {
        threatWillRaise = true;
        const canAvoid = team.sp > 0;
        resultEl.innerHTML = `<div class="threat-result-raised">\uD83C\uDFB2 Rolled <strong>${roll}</strong> \u2014 5+ met! Threat will raise by 1${canAvoid ? ' \u2014 or spend 1 SP to avoid.' : '.'}</div>`;
        if (canAvoid) document.getElementById('stp-avoid-row').style.display = '';
      } else {
        resultEl.innerHTML = `<div class="threat-result-safe">\uD83C\uDFB2 Rolled <strong>${roll}</strong> \u2014 needs 5+. Threat unchanged.</div>`;
      }
      document.getElementById('stp-roll-btn').style.display = 'none';
      document.getElementById('stp-cont-btn').style.display = '';
    });

    document.getElementById('stp-avoid-btn').addEventListener('click', () => {
      team.sp       = Math.max(0, team.sp - 1);
      team.spSpent  = (team.spSpent || 0) + 1;
      threatWillRaise = false;
      document.getElementById('stp-sp').innerHTML = `<strong>${team.sp}</strong>`;
      document.getElementById('stp-result').innerHTML = `<div class="threat-result-safe">Spent 1 additional SP to avoid threat raise. SP: ${team.sp + 1} \u2192 ${team.sp}.</div>`;
      document.getElementById('stp-avoid-row').style.display = 'none';
      save();
    });

    document.getElementById('stp-cont-btn').addEventListener('click', () => {
      overlay.remove();
      if (threatWillRaise) changeThreat(1);
      const avoidNote = !threatWillRaise && team.sp < spBefore - 1 ? ' Spent 1 extra SP to avoid threat raise.' : '';
      const threatNote = threatWillRaise ? ' Threat raised by 1.' : ' Threat unchanged.';
      addAutoLogEntry(ti, round, phase, `\uD83D\uDD0D Search: resolved Search rule. Cost: 1 SP.${threatNote}${avoidNote} SP: ${spBefore} \u2192 ${team.sp}.`);
      save(); renderLogTab();
      showToast('Search action logged.', 'success');
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
    const teamEl  = document.getElementById('log-entry-team');
    const textEl  = document.getElementById('log-entry-text');
    const text = textEl.value.trim();
    if (!text) { showToast('Entry cannot be empty.', 'warn'); return; }
    const killTeamIdx = teamEl && teamEl.value !== '' ? parseInt(teamEl.value, 10) : undefined;

    state.campaignLog.unshift({
      id: Date.now(),
      round: parseInt(roundEl.value, 10) || state.campaign.currentRound,
      phase: parseInt(phaseEl.value, 10),
      text,
      timestamp: new Date().toISOString(),
      ...(killTeamIdx !== undefined && { killTeamIdx })
    });
    save();
    renderLogTab();
    showToast('Log entry added.', 'success');
  }

  function addAutoLogEntry(killTeamIdx, round, phase, text) {
    state.campaignLog.unshift({
      id: Date.now(),
      round,
      phase,
      text,
      timestamp: new Date().toISOString(),
      killTeamIdx,
      auto: true
    });
  }

  function buildLogEntry(entry, idx) {
    const d = new Date(entry.timestamp);
    const ts = `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`;
    const team = entry.killTeamIdx !== undefined ? state.killTeams[entry.killTeamIdx] : null;
    const ktBadge = team ? `<span class="log-kt-badge">${escHtml(team.name)}</span>` : '';
    return `
      <div class="log-entry${entry.auto ? ' log-entry-auto' : ''}">
        <div class="log-entry-meta">
          <span class="log-round">Round ${entry.round}</span>
          <span class="log-phase">${PHASE_NAMES[entry.phase] || 'Unknown'}</span>
          ${ktBadge}
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
