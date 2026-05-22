// js/hexmap.js — SVG hex map, setup mode, and hex detail panel
// Chunk 2: loaded after app.js. App.js checks typeof HexMap before rendering placeholder.

const HexMap = (() => {
  const SQRT3 = Math.sqrt(3);

  // ─── Hex geometry (flat-top, odd-q offset) ───────────────────────────────
  // Flat-top: vertices at 0°,60°,120°,180°,240°,300°
  // Column spacing = 1.5*size; row spacing = SQRT3*size; odd cols shift down SQRT3/2*size
  function hexCenter(col, row, size) {
    const cx = 1.5 * size * col;
    const cy = SQRT3 * size * row + (col % 2 !== 0 ? SQRT3 / 2 * size : 0);
    return { cx, cy };
  }

  function hexPoints(cx, cy, size) {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i; // flat-top: first vertex at 0° (right)
      pts.push(`${(cx + size * Math.cos(angle)).toFixed(2)},${(cy + size * Math.sin(angle)).toFixed(2)}`);
    }
    return pts.join(' ');
  }

  // ─── Module state ─────────────────────────────────────────────────────────
  let hexSize = 38;
  let selectedId = null;
  let setupMode = false;
  let setupBrush = 'surface';
  let placeMode = false;
  // Generator state
  let genPanelOpen = false;
  let genMode = 'chunked';
  let genDepth = 1;
  let genClusters = 3;
  let genClusterSize = 5;

  // ─── Pre-configured maps ────────────────────────────────────────────────────
  function _mh(col, row, num, type) {
    const id = `${col},${row}`;
    return { id, col, row, number: String(num), name: '', type,
      explored: false, notes: '', locationCode: null, conditionCode: null,
      locationRoll: null, conditionRoll: null, supplyReserve: 0,
      intelReserve: 0, cpReserve: 0, doomSearchCost: 0,
      hasBeast: false, beastDefeated: false, hasPrisoner: false };
  }

  const PRECONFIGURED_MAPS = [
    {
      id: 'ctesiphus_map1',
      label: 'Ctesiphus Expedition \u2013 Map 1',
      hexes: Object.fromEntries([
        _mh(0,0,1,'blocked'),  _mh(1,-1,2,'surface'), _mh(0,1,3,'surface'),
        _mh(1,0,4,'tomb'),     _mh(2,0,5,'surface'),  _mh(3,-1,6,'surface'),
        _mh(0,2,7,'surface'),  _mh(1,1,8,'tomb'),     _mh(2,1,9,'tomb'),
        _mh(3,0,10,'tomb'),    _mh(4,0,11,'blocked'), _mh(0,3,12,'surface'),
        _mh(1,2,13,'tomb'),    _mh(2,2,14,'tomb'),    _mh(3,1,15,'tomb'),
        _mh(4,1,16,'surface'), _mh(1,3,17,'surface'), _mh(2,3,18,'tomb'),
        _mh(3,2,19,'tomb'),    _mh(4,2,20,'surface'), _mh(1,4,21,'blocked'),
        _mh(2,4,22,'tomb'),    _mh(3,3,23,'surface'), _mh(4,3,24,'blocked'),
        _mh(2,5,25,'surface'), _mh(3,4,26,'surface'),
      ].map(h => [h.id, h]))
    },
    {
      id: 'ctesiphus_map2',
      label: 'Ctesiphus Expedition \u2013 Map 2',
      hexes: Object.fromEntries([
        _mh(0,0,1,'surface'),  _mh(1,-1,2,'surface'), _mh(2,-1,3,'blocked'), _mh(3,-2,4,'surface'),
        _mh(0,1,5,'surface'),  _mh(1,0,6,'tomb'),     _mh(2,0,7,'tomb'),     _mh(3,-1,8,'tomb'),
        _mh(4,-1,9,'surface'), _mh(0,2,10,'surface'), _mh(1,1,11,'tomb'),    _mh(2,1,12,'tomb'),
        _mh(3,0,13,'tomb'),    _mh(4,0,14,'tomb'),    _mh(5,-1,15,'blocked'),_mh(0,3,16,'surface'),
        _mh(1,2,17,'blocked'), _mh(2,2,18,'tomb'),    _mh(3,1,19,'tomb'),    _mh(4,1,20,'tomb'),
        _mh(5,0,21,'surface'), _mh(1,3,22,'surface'), _mh(2,3,23,'tomb'),    _mh(3,2,24,'tomb'),
        _mh(4,2,25,'surface'), _mh(5,1,26,'surface'), _mh(1,4,27,'surface'), _mh(2,4,28,'tomb'),
        _mh(3,3,29,'tomb'),    _mh(4,3,30,'blocked'), _mh(2,5,31,'surface'), _mh(3,4,32,'surface'),
        _mh(4,4,33,'surface'),
      ].map(h => [h.id, h]))
    },
    {
      id: 'ctesiphus_map3',
      label: 'Ctesiphus Expedition \u2013 Map 3',
      hexes: Object.fromEntries([
        _mh(0,0,1,'surface'),  _mh(1,-1,2,'blocked'), _mh(2,-1,3,'surface'), _mh(3,-2,4,'surface'),
        _mh(0,1,5,'surface'),  _mh(1,0,6,'tomb'),     _mh(2,0,7,'tomb'),     _mh(3,-1,8,'tomb'),
        _mh(4,-1,9,'surface'), _mh(0,2,10,'blocked'), _mh(1,1,11,'surface'), _mh(2,1,12,'tomb'),
        _mh(3,0,13,'tomb'),    _mh(4,0,14,'surface'), _mh(0,3,15,'surface'), _mh(1,2,16,'tomb'),
        _mh(2,2,17,'surface'), _mh(3,1,18,'tomb'),    _mh(4,1,19,'surface'), _mh(0,4,20,'surface'),
        _mh(1,3,21,'tomb'),    _mh(2,3,22,'tomb'),    _mh(3,2,23,'surface'), _mh(4,2,24,'blocked'),
        _mh(0,5,25,'blocked'), _mh(1,4,26,'tomb'),    _mh(2,4,27,'tomb'),    _mh(3,3,28,'tomb'),
        _mh(4,3,29,'surface'), _mh(1,5,30,'surface'), _mh(2,5,31,'tomb'),    _mh(3,4,32,'tomb'),
        _mh(4,4,33,'surface'), _mh(2,6,34,'surface'), _mh(3,5,35,'surface'), _mh(4,5,36,'blocked'),
      ].map(h => [h.id, h]))
    },
    {
      id: 'ctesiphus_map4',
      label: 'Ctesiphus Expedition \u2013 Map 4',
      hexes: Object.fromEntries([
        _mh(0,0,1,'surface'),  _mh(1,-1,2,'surface'), _mh(0,1,3,'surface'),  _mh(1,0,4,'tomb'),
        _mh(2,0,5,'surface'),  _mh(3,-1,6,'blocked'), _mh(0,2,7,'surface'),  _mh(1,1,8,'tomb'),
        _mh(2,1,9,'tomb'),     _mh(3,0,10,'tomb'),    _mh(4,0,11,'surface'), _mh(0,3,12,'surface'),
        _mh(1,2,13,'tomb'),    _mh(2,2,14,'tomb'),    _mh(3,1,15,'tomb'),    _mh(4,1,16,'surface'),
        _mh(0,4,17,'surface'), _mh(1,3,18,'tomb'),    _mh(2,3,19,'blocked'), _mh(3,2,20,'tomb'),
        _mh(4,2,21,'surface'), _mh(0,5,22,'blocked'), _mh(1,4,23,'tomb'),    _mh(2,4,24,'tomb'),
        _mh(3,3,25,'tomb'),    _mh(4,3,26,'surface'), _mh(0,6,27,'surface'), _mh(1,5,28,'tomb'),
        _mh(2,5,29,'tomb'),    _mh(3,4,30,'tomb'),    _mh(4,4,31,'surface'), _mh(1,6,32,'surface'),
        _mh(2,6,33,'surface'), _mh(3,5,34,'tomb'),    _mh(4,5,35,'blocked'), _mh(3,6,36,'surface'),
        _mh(4,6,37,'surface'),
      ].map(h => [h.id, h]))
    },
    {
      id: 'ctesiphus_map5',
      label: 'Ctesiphus Expedition \u2013 Map 5',
      hexes: Object.fromEntries([
        _mh(0,0,1,'surface'),  _mh(1,-1,2,'surface'), _mh(2,-1,3,'surface'), _mh(0,1,4,'surface'),
        _mh(1,0,5,'blocked'),  _mh(2,0,6,'tomb'),     _mh(3,-1,7,'blocked'), _mh(4,-1,8,'surface'),
        _mh(0,2,9,'surface'),  _mh(1,1,10,'tomb'),    _mh(2,1,11,'tomb'),    _mh(3,0,12,'tomb'),
        _mh(4,0,13,'tomb'),    _mh(5,-1,14,'surface'),_mh(0,3,15,'blocked'), _mh(1,2,16,'tomb'),
        _mh(2,2,17,'tomb'),    _mh(3,1,18,'tomb'),    _mh(4,1,19,'tomb'),    _mh(5,0,20,'surface'),
        _mh(0,4,21,'surface'), _mh(1,3,22,'tomb'),    _mh(2,3,23,'tomb'),    _mh(3,2,24,'tomb'),
        _mh(4,2,25,'blocked'), _mh(5,1,26,'surface'), _mh(0,5,27,'surface'), _mh(1,4,28,'tomb'),
        _mh(2,4,29,'tomb'),    _mh(3,3,30,'tomb'),    _mh(4,3,31,'tomb'),    _mh(5,2,32,'surface'),
        _mh(0,6,33,'surface'), _mh(1,5,34,'tomb'),    _mh(2,5,35,'blocked'), _mh(3,4,36,'tomb'),
        _mh(4,4,37,'tomb'),    _mh(5,3,38,'surface'), _mh(0,7,39,'surface'), _mh(1,6,40,'blocked'),
        _mh(2,6,41,'tomb'),    _mh(3,5,42,'tomb'),    _mh(4,5,43,'tomb'),    _mh(5,4,44,'blocked'),
        _mh(1,7,45,'surface'), _mh(2,7,46,'surface'), _mh(3,6,47,'tomb'),    _mh(4,6,48,'tomb'),
        _mh(5,5,49,'surface'), _mh(3,7,50,'surface'), _mh(4,7,51,'surface'), _mh(5,6,52,'surface'),
      ].map(h => [h.id, h]))
    },
  ];

  // ─── Position helpers ─────────────────────────────────────────────────────────
  function posKey(col, row) { return `${col},${row}`; }

  function nextHexNumber() {
    const used = new Set(Object.values(App.state.hexes).map(h => h.number));
    let n = 1;
    while (used.has(String(n))) n++;
    return String(n);
  }

  function placeHex(col, row) {
    const key = posKey(col, row);
    if (App.state.hexes[key]) return;
    App.state.hexes[key] = {
      id: key, col, row,
      number: nextHexNumber(),
      name: '',
      type: (setupMode && setupBrush !== 'unset') ? setupBrush : null,
      explored: false, notes: '',
      locationCode: null, conditionCode: null,
      locationRoll: null, conditionRoll: null,
      supplyReserve: 0, intelReserve: 0, cpReserve: 0,
      doomSearchCost: 0,
      hasBeast: false, beastDefeated: false, hasPrisoner: false,
    };
    selectedId = key;
    App.save();
    renderAll();
  }

  function deleteHex(id) {
    if (!App.state.hexes[id]) return;
    delete App.state.hexes[id];
    if (selectedId === id) selectedId = null;
    App.save();
    renderAll();
  }

  function getGhostPositions() {
    const placed = new Set(Object.keys(App.state.hexes));
    const ghosts = new Set();
    Object.values(App.state.hexes).forEach(({ col, row }) => {
      getHexNeighbors(col, row).forEach(([nc, nr]) => {
        const k = posKey(nc, nr);
        if (!placed.has(k)) ghosts.add(k);
      });
    });
    if (ghosts.size === 0) ghosts.add(posKey(0, 0)); // starter
    return [...ghosts].map(k => {
      const [c, r] = k.split(',').map(Number);
      return { col: c, row: r };
    });
  }

  // ─── Ensure every grid hex has an entry in App.state.hexes ─────────────────
  function syncStateHexes() { /* no-op: hexes are placed explicitly */ }

  function defaultHex(id) {
    const [col, row] = (typeof id === 'string' && id.includes(','))
      ? id.split(',').map(Number)
      : [0, 0];
    return {
      id, col, row,
      number: '', name: '',
      type: null, explored: false,
      locationCode: null, conditionCode: null,
      locationRoll: null, conditionRoll: null,
      supplyReserve: 0, intelReserve: 0, cpReserve: 0,
      doomSearchCost: 0,
      hasBeast: false, beastDefeated: false,
      hasPrisoner: false,
      notes: '',
    };
  }

  // ─── Init & Refresh ───────────────────────────────────────────────────────
  function init() {
    refresh();
  }

  function refresh() {
    renderAll();
  }

  // (remapHexData removed — freeform placement; hexes keyed by 'col,row')

  // ─── Master render ────────────────────────────────────────────────────────
  function renderAll() {
    const container = document.getElementById('tab-map');
    if (!container) return;

    container.innerHTML = `
      <div class="map-wrap">
        <div class="map-left">
          <div class="map-toolbar" id="map-toolbar"></div>
          <div class="map-canvas-wrap" id="map-canvas-wrap">
            <svg id="map-svg" xmlns="http://www.w3.org/2000/svg"></svg>
          </div>
        </div>
        <div class="map-detail-panel" id="map-detail-panel">
          <div class="detail-empty">
            <span class="detail-empty-icon">⬡</span>
            <p>Click a hex to view details</p>
          </div>
        </div>
      </div>
    `;

    renderToolbar();
    renderSVG();
    if (selectedId) renderDetail(selectedId);

    bindMapEvents();
  }

  // ─── Toolbar ──────────────────────────────────────────────────────────────
  function renderToolbar() {
    const tb = document.getElementById('map-toolbar');
    if (!tb) return;

    const brushes = [
      { val: 'surface', label: '🏔 Surface' },
      { val: 'tomb',    label: '⚰ Tomb' },
      { val: 'blocked', label: '⛔ Blocked' },
      { val: 'unset',   label: '✕ Clear' },
    ];

    tb.innerHTML = `
      <div class="map-tb-main">
        <div class="map-tb-left">
          <select class="map-preconfig-select" id="map-preconfig-select" title="Load a pre-built map layout">
            <option value="">📋 Pre-configured Maps…</option>
            ${PRECONFIGURED_MAPS.map(m => `<option value="${m.id}">${m.label}</option>`).join('')}
          </select>
          <span class="map-tb-sep"></span>
          <button class="btn btn-sm ${placeMode ? 'btn-primary' : ''}" id="map-btn-place"
            title="Toggle hex placement — click blue ghost outlines to add hexes">📌 Place</button>
          <span class="map-tb-sep"></span>
          <button class="btn ${setupMode ? 'btn-primary' : 'btn'} btn-sm" id="map-btn-setup"
            title="Toggle Setup mode — choose a brush then click hexes to paint their type">✎ Setup</button>
        </div>

        <div class="map-tb-right">
          <button class="btn btn-sm" id="map-zoom-out" title="Zoom out">−</button>
          <span class="map-tb-zoom">${hexSize}px</span>
          <button class="btn btn-sm" id="map-zoom-in" title="Zoom in">+</button>
          <button class="btn btn-sm" id="map-zoom-fit" title="Fit entire map in view">Fit</button>
          <span class="map-tb-sep"></span>
          <span class="map-tb-legend">
            <span class="legend-pip legend-surface"></span>Surface
            <span class="legend-pip legend-tomb"></span>Tomb
            <span class="legend-pip legend-blocked"></span>Blocked
          </span>
        </div>
      </div>

      ${placeMode ? `
        <div class="map-tb-sub">
          <span class="map-tb-sub-label">Place:</span>
          <button class="btn btn-sm btn-danger" id="map-btn-clear"
            title="Remove all hexes from the map">🗑 Clear All</button>
        </div>
      ` : ''}

      ${setupMode ? `
        <div class="map-tb-sub">
          <span class="map-tb-sub-label">Brush:</span>
          ${brushes.map(b => `
            <button class="btn btn-sm map-brush-btn ${setupBrush === b.val ? 'brush-active' : ''}"
              data-brush="${b.val}" title="Paint hexes as: ${b.val}">${b.label}</button>
          `).join('')}
          <span class="map-tb-sep"></span>
          <div class="gen-btn-wrap">
            <button class="btn btn-sm ${genPanelOpen ? 'btn-primary' : ''}" id="map-btn-generate"
              title="Auto-generate a hex map layout">⚡ Generate</button>
            ${genPanelOpen ? renderGenPanel() : ''}
          </div>
        </div>
      ` : ''}
    `;

    document.getElementById('map-preconfig-select').addEventListener('change', e => {
      const mapId = e.target.value;
      if (!mapId) return;
      const map = PRECONFIGURED_MAPS.find(m => m.id === mapId);
      e.target.value = '';
      if (!map) return;
      if (!confirm(`Load "${map.label}"? This will replace the current map.`)) return;
      App.state.hexes = JSON.parse(JSON.stringify(map.hexes));
      selectedId = null;
      App.save();
      renderAll();
      App.showToast(`Loaded: ${map.label}`, 'success');
    });
    document.getElementById('map-btn-place').addEventListener('click', () => {
      placeMode = !placeMode;
      if (placeMode) setupMode = false;
      renderSVG();
      renderToolbar();
    });
    document.getElementById('map-btn-setup').addEventListener('click', () => {
      setupMode = !setupMode;
      if (setupMode) { placeMode = false; renderSVG(); }
      renderToolbar();
    });
    document.querySelectorAll('.map-brush-btn').forEach(btn => {
      btn.addEventListener('click', () => { setupBrush = btn.dataset.brush; renderToolbar(); });
    });
    const genBtn = document.getElementById('map-btn-generate');
    if (genBtn) {
      genBtn.addEventListener('click', () => {
        genPanelOpen = !genPanelOpen;
        renderToolbar();
      });
    }
    if (genPanelOpen) {
      document.querySelectorAll('.gen-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => { genMode = btn.dataset.mode; renderToolbar(); });
      });
      const depthEl = document.getElementById('gen-depth');
      if (depthEl) depthEl.addEventListener('input', () => { genDepth = Math.max(1, parseInt(depthEl.value) || 1); });
      const clustEl = document.getElementById('gen-clusters');
      if (clustEl) clustEl.addEventListener('input', () => { genClusters = Math.max(1, parseInt(clustEl.value) || 1); });
      const csEl = document.getElementById('gen-cluster-size');
      if (csEl) csEl.addEventListener('input', () => { genClusterSize = Math.max(1, parseInt(csEl.value) || 1); });
      document.getElementById('gen-run-btn').addEventListener('click', () => {
        runGenerator();
        genPanelOpen = false;
        renderAll();
      });
    }
    document.getElementById('map-zoom-in').addEventListener('click', () => {
      hexSize = Math.min(hexSize + 4, 72);
      renderSVG();
      renderToolbar();
    });
    document.getElementById('map-zoom-out').addEventListener('click', () => {
      hexSize = Math.max(hexSize - 4, 18);
      renderSVG();
      renderToolbar();
    });
    document.getElementById('map-zoom-fit').addEventListener('click', fitZoom);
    const clearBtn = document.getElementById('map-btn-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        const count = Object.keys(App.state.hexes).length;
        if (count === 0) { App.showToast('Map is already empty.', 'info'); return; }
        if (!confirm(`Clear all ${count} hex${count !== 1 ? 'es' : ''} from the map? This cannot be undone.`)) return;
        App.state.hexes = {};
        selectedId = null;
        App.save();
        renderAll();
        App.showToast('Map cleared.', 'success');
      });
    }
  }

  function renderGenPanel() {
    return `
      <div class="gen-panel">
        <div class="gen-panel-title">Generate Map</div>
        <div class="gen-mode-row">
          <button class="btn btn-sm gen-mode-btn ${genMode === 'centralized' ? 'btn-primary' : ''}" data-mode="centralized">Centralized</button>
          <button class="btn btn-sm gen-mode-btn ${genMode === 'chunked' ? 'btn-primary' : ''}" data-mode="chunked">Chunked</button>
        </div>
        ${genMode === 'centralized' ? `
          <div class="gen-field">
            <label>Surface border depth</label>
            <input type="number" id="gen-depth" value="${genDepth}" min="1" max="10">
          </div>
          <p class="gen-hint">Outer N ring(s) of hexes → surface; inner → tomb</p>
        ` : `
          <div class="gen-field">
            <label>Tomb clusters</label>
            <input type="number" id="gen-clusters" value="${genClusters}" min="1" max="30">
          </div>
          <div class="gen-field">
            <label>Hexes per cluster</label>
            <input type="number" id="gen-cluster-size" value="${genClusterSize}" min="1" max="50">
          </div>
          <p class="gen-hint">Clusters placed randomly, growing by adjacency</p>
        `}
        <button class="btn btn-sm btn-primary" id="gen-run-btn" style="width:100%;margin-top:.5rem">Generate</button>
      </div>
    `;
  }

  // ─── SVG render ───────────────────────────────────────────────────────────
  function renderSVG() {
    const svg = document.getElementById('map-svg');
    if (!svg) return;

    const hexes = Object.values(App.state.hexes);
    const ghosts = placeMode ? getGhostPositions() : [];

    if (hexes.length === 0 && ghosts.length === 0) {
      svg.setAttribute('width', 400);
      svg.setAttribute('height', 200);
      svg.setAttribute('viewBox', '0 0 400 200');
      svg.innerHTML = `<text x="200" y="105" text-anchor="middle" fill="#555" font-size="14">Enable 📌 Place mode to add hexes</text>`;
      return;
    }

    const PAD = hexSize * 1.8;
    const allPos = [...hexes, ...ghosts];

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    allPos.forEach(({ col, row }) => {
      const { cx, cy } = hexCenter(col, row, hexSize);
      if (cx < minX) minX = cx; if (cx > maxX) maxX = cx;
      if (cy < minY) minY = cy; if (cy > maxY) maxY = cy;
    });

    const ox = PAD - minX;
    const oy = PAD - minY;
    const svgW = maxX - minX + PAD * 2;
    const svgH = maxY - minY + PAD * 2;

    svg.setAttribute('width', svgW);
    svg.setAttribute('height', svgH);
    svg.setAttribute('viewBox', `0 0 ${svgW} ${svgH}`);

    let html = '';

    // Ghost hexes (rendered first, behind real hexes)
    ghosts.forEach(({ col, row }) => {
      const { cx, cy } = hexCenter(col, row, hexSize);
      html += buildGhostSVG(posKey(col, row), cx + ox, cy + oy);
    });

    // Placed hexes
    hexes.forEach(hex => {
      const { cx, cy } = hexCenter(hex.col, hex.row, hexSize);
      html += buildHexSVG(hex.id, cx + ox, cy + oy, hex);
    });

    // Kill team position indicators
    App.state.killTeams.forEach((team, ti) => {
      if (!team.currentHex) return;
      const hex = App.state.hexes[team.currentHex];
      if (!hex) return;
      const { cx, cy } = hexCenter(hex.col, hex.row, hexSize);
      const hue = ti * 137 % 360;
      html += `<circle cx="${cx + ox}" cy="${cy + oy - hexSize * 0.25}" r="${hexSize * 0.18}"
        fill="hsl(${hue},70%,55%)" stroke="#000" stroke-width="1"
        class="kt-dot" data-hexid="${team.currentHex}" />`;
    });

    svg.innerHTML = html;
  }

  function buildGhostSVG(key, cx, cy) {
    const pts = hexPoints(cx, cy, hexSize - 2);
    return `
      <g class="hex-ghost" data-ghostkey="${key}" style="cursor:pointer">
        <polygon points="${pts}" fill="rgba(40,80,160,0.12)" stroke="#4a7acc"
          stroke-width="2" stroke-dasharray="6 4" pointer-events="all" data-ghostkey="${key}"/>
        <text x="${cx}" y="${cy + hexSize * 0.2}" text-anchor="middle"
          font-size="${hexSize * 0.5}" fill="#4a7acc" pointer-events="none">+</text>
      </g>
    `;
  }

  function buildHexSVG(id, cx, cy, hex) {
    const pts = hexPoints(cx, cy, hexSize - 1.5);
    const isSelected = id === selectedId;

    // Fill
    let fill = '#1a1a2e';
    if (hex.type === 'surface') fill = hex.explored ? '#7a5510' : '#3d2800';
    if (hex.type === 'tomb')    fill = hex.explored ? '#5a1080' : '#2a0940';
    if (hex.type === 'blocked') fill = '#111118';

    // Stroke
    let stroke = '#2a2a45';
    let strokeW = 1.5;
    if (isSelected)                             { stroke = '#e8b84b'; strokeW = 3; }
    else if (hex.type === 'surface' && hex.explored) stroke = '#c49a3a';
    else if (hex.type === 'tomb'    && hex.explored) stroke = '#9b59b6';

    const numFs   = Math.max(hexSize * 0.26, 8);
    const nameFs  = Math.max(hexSize * 0.20, 7);
    const codeFs  = Math.max(hexSize * 0.20, 7);

    // Number label (top area, gold)
    const numLabel = hex.number
      ? `<text x="${cx}" y="${cy - hexSize * 0.22}" text-anchor="middle" font-size="${numFs}"
          fill="#e8b84b" font-weight="bold" pointer-events="none" class="hex-num" data-hexid="${id}">${hex.number}</text>`
      : '';

    // Name label (centre, light)
    const nameLabel = hex.name
      ? `<text x="${cx}" y="${cy + hexSize * 0.1}" text-anchor="middle" font-size="${nameFs}"
          fill="#c8c8e0" pointer-events="none">${truncateLabel(hex.name, hexSize)}</text>`
      : '';

    // Location code (bottom area, when explored)
    const codeLabel = (hex.explored && hex.locationCode)
      ? `<text x="${cx}" y="${cy + hexSize * 0.38}" text-anchor="middle" font-size="${codeFs}"
          fill="#e8c87a" font-family="monospace" pointer-events="none">${hex.locationCode}</text>`
      : '';

    // Explored star
    const exploredMark = hex.explored
      ? `<text x="${cx}" y="${cy - hexSize * 0.52}" text-anchor="middle" font-size="${hexSize * 0.22}"
          fill="#e8b84b" pointer-events="none">★</text>`
      : '';

    const flags = buildHexFlags(id, hex, cx, cy);

    return `
      <polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}"
        class="hex-poly" data-hexid="${id}" style="cursor:pointer" />
      ${exploredMark}
      ${numLabel}
      ${nameLabel}
      ${codeLabel}
      ${flags}
    `;
  }

  function truncateLabel(str, size) {
    const maxChars = Math.max(4, Math.floor(size / 6));
    return str.length > maxChars ? str.slice(0, maxChars - 1) + '…' : str;
  }

  function buildHexFlags(id, hex, cx, cy) {
    const parts = [];
    const r = hexSize;

    // Beast lair indicator
    if (hex.hasBeast && !hex.beastDefeated) {
      parts.push(flagDot(cx + r * 0.55, cy - r * 0.55, '#e67e22', '!'));
    }
    // Prisoner
    if (hex.hasPrisoner) {
      parts.push(flagDot(cx - r * 0.55, cy - r * 0.55, '#c0392b', 'P'));
    }
    // Base hexes
    App.state.killTeams.forEach((team, ti) => {
      if (String(team.baseHex) === id) {
        parts.push(flagDot(cx + r * 0.55, cy + r * 0.55, '#27ae60', 'B'));
      }
      if ((team.campHexes || []).map(String).includes(id)) {
        parts.push(flagDot(cx - r * 0.55, cy + r * 0.55, '#3a7bd5', 'C'));
      }
    });

    return parts.join('');
  }

  function flagDot(fx, fy, color, letter) {
    const r = Math.max(hexSize * 0.18, 7);
    return `
      <circle cx="${fx}" cy="${fy}" r="${r}" fill="${color}" stroke="#000" stroke-width="1" pointer-events="none"/>
      <text x="${fx}" y="${fy + r * 0.38}" text-anchor="middle" font-size="${r * 1.1}"
        font-weight="bold" fill="#fff" pointer-events="none">${letter}</text>
    `;
  }

  // ─── Fit zoom ─────────────────────────────────────────────────────────────
  function fitZoom() {
    const wrap = document.getElementById('map-canvas-wrap');
    if (!wrap) return;
    const hexes = Object.values(App.state.hexes);
    if (hexes.length === 0) { hexSize = 38; renderSVG(); renderToolbar(); return; }
    let minCol = hexes[0].col, maxCol = hexes[0].col;
    let minRow = hexes[0].row, maxRow = hexes[0].row;
    hexes.forEach(({ col, row }) => {
      if (col < minCol) minCol = col; if (col > maxCol) maxCol = col;
      if (row < minRow) minRow = row; if (row > maxRow) maxRow = row;
    });
    const spanCols = maxCol - minCol + 2;
    const spanRows = maxRow - minRow + 2;
    const availW = wrap.clientWidth - 24;
    const availH = wrap.clientHeight - 24;
    // Flat-top: col spacing = 1.5*size, row spacing = SQRT3*size
    const sizeByW = availW / (spanCols * 1.5 + 0.5);
    const sizeByH = availH / (SQRT3 * (spanRows + 0.5));
    hexSize = Math.max(18, Math.min(72, Math.floor(Math.min(sizeByW, sizeByH))));
    renderSVG();
    renderToolbar();
  }

  // ─── Grid size change ─────────────────────────────────────────────────────────
  // (removed — freeform placement; use Place mode instead)

  // ─── Hex neighbours (flat-top, odd-q offset, unbounded) ────────────────────
  function getHexNeighbors(col, row) {
    const odd = col % 2 !== 0;
    const dirs = odd
      ? [[0,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0]]   // odd col: NE/SE shift down
      : [[0,-1],[1,-1],[1,0],[0,1],[-1,0],[-1,-1]]; // even col: NE/NW shift up
    return dirs.map(([dc, dr]) => [col + dc, row + dr]);
  }

  // ─── Generator ──────────────────────────────────────────────────────────────────
  function runGenerator() {
    // Reset all placed hexes to surface
    Object.values(App.state.hexes).forEach(hex => {
      Object.assign(hex, {
        type: 'surface', explored: false,
        locationCode: null, conditionCode: null,
        locationRoll: null, conditionRoll: null,
        supplyReserve: 0, intelReserve: 0, cpReserve: 0,
        doomSearchCost: 0, hasBeast: false, beastDefeated: false, hasPrisoner: false,
      });
    });
    if (genMode === 'centralized') {
      runCentralized();
    } else {
      runChunked();
    }

    // Sprinkle random blocked hexes (3-4 for <37 hexes, 4-5 for 37+)
    const _allIds = Object.keys(App.state.hexes);
    const _baseSet = new Set(App.state.killTeams.map(t => String(t.baseHex)).filter(Boolean));
    const _campSet = new Set(App.state.killTeams.flatMap(t => (t.campHexes || []).map(String)));
    const _candidates = _allIds.filter(id => !_baseSet.has(id) && !_campSet.has(id));
    const _blockMin = _allIds.length < 37 ? 3 : 4;
    const _blockMax = _allIds.length < 37 ? 4 : 5;
    const _blockCount = _blockMin + Math.floor(Math.random() * (_blockMax - _blockMin + 1));
    _candidates.sort(() => Math.random() - 0.5).slice(0, _blockCount).forEach(id => {
      App.state.hexes[id].type = 'blocked';
    });

    App.save();
    App.showToast('Map generated!', 'success');
  }

  function runCentralized() {
    // Mark edge hexes (those with any empty neighbor) as surface; inner as tomb
    const placed = new Set(Object.keys(App.state.hexes));
    Object.values(App.state.hexes).forEach(hex => {
      let depth = 0, frontier = [[hex.col, hex.row]], visited = new Set([posKey(hex.col, hex.row)]);
      while (frontier.length > 0 && depth < genDepth) {
        const next = [];
        for (const [c, r] of frontier) {
          if (getHexNeighbors(c, r).some(([nc, nr]) => !placed.has(posKey(nc, nr)))) {
            hex.type = 'surface'; return;
          }
          getHexNeighbors(c, r).forEach(([nc, nr]) => {
            const k = posKey(nc, nr);
            if (placed.has(k) && !visited.has(k)) { visited.add(k); next.push([nc, nr]); }
          });
        }
        frontier = next;
        depth++;
      }
      hex.type = 'tomb';
    });
  }

  function runChunked() {
    const hexList = Object.values(App.state.hexes);
    const placed = new Set(Object.keys(App.state.hexes));
    let clustersPlaced = 0;
    const shuffled = hexList.slice().sort(() => Math.random() - 0.5);
    for (const seed of shuffled) {
      if (clustersPlaced >= genClusters) break;
      if (App.state.hexes[seed.id].type === 'tomb') continue;
      const cluster = new Set([seed.id]);
      const frontier = [{ col: seed.col, row: seed.row }];
      while (cluster.size < genClusterSize && frontier.length > 0) {
        const i = Math.floor(Math.random() * frontier.length);
        const cur = frontier.splice(i, 1)[0];
        for (const [nc, nr] of getHexNeighbors(cur.col, cur.row)) {
          const nid = posKey(nc, nr);
          if (placed.has(nid) && !cluster.has(nid)) {
            cluster.add(nid);
            frontier.push({ col: nc, row: nr });
            if (cluster.size >= genClusterSize) break;
          }
        }
      }
      cluster.forEach(id => { App.state.hexes[id].type = 'tomb'; });
      clustersPlaced++;
    }
  }

  // ─── Event delegation ─────────────────────────────────────────────────────
  function bindMapEvents() {
    const svg = document.getElementById('map-svg');
    if (!svg) return;

    svg.addEventListener('click', e => {
      // Ghost hex placement
      const ghostKey = e.target.closest('[data-ghostkey]')?.dataset.ghostkey
                    || e.target.dataset.ghostkey;
      if (ghostKey && placeMode) {
        const [col, row] = ghostKey.split(',').map(Number);
        placeHex(col, row);
        return;
      }

      // Existing hex click
      const hexId = e.target.dataset.hexid || e.target.closest('[data-hexid]')?.dataset.hexid;
      if (!hexId || !App.state.hexes[hexId]) return;

      if (setupMode) {
        applyBrush(hexId);
      } else {
        selectedId = hexId;
        renderSVG();
        renderDetail(hexId);
      }
    });
  }

  function applyBrush(hexId) {
    const hex = App.state.hexes[hexId];
    if (!hex) return;

    if (setupBrush === 'unset') {
      hex.type = null;
      hex.explored = false;
      hex.locationCode = null;
      hex.conditionCode = null;
    } else {
      hex.type = setupBrush;
    }
    App.save();
    renderSVG();
    if (selectedId === hexId) renderDetail(hexId);
  }

  // ─── Detail panel ─────────────────────────────────────────────────────────
  function renderDetail(hexId) {
    const panel = document.getElementById('map-detail-panel');
    if (!panel) return;
    const hex = App.state.hexes[hexId];
    if (!hex) return;

    const typeLabel = hex.type
      ? hex.type.charAt(0).toUpperCase() + hex.type.slice(1)
      : 'Unset';

    const locationEntry = hex.locationCode ? lookupEntry(hex.locationCode) : null;
    const conditionEntry = hex.conditionCode ? lookupEntry(hex.conditionCode) : null;

    // Kill teams currently in this hex
    const teamsHere = App.state.killTeams
      .map((t, i) => ({ t, i }))
      .filter(({ t }) => String(t.currentHex) === hexId);

    panel.innerHTML = `
      <!-- Hex identity -->
      <div class="detail-section detail-identity">
        <div class="detail-identity-row">
          <div class="detail-id-field">
            <label class="detail-field-label">Number</label>
            <input class="detail-field-input" id="detail-hex-number" type="text"
              value="${App.escHtml(hex.number || '')}" placeholder="01" maxlength="6">
          </div>
          <div class="detail-id-field detail-id-name">
            <label class="detail-field-label">Name</label>
            <input class="detail-field-input" id="detail-hex-name" type="text"
              value="${App.escHtml(hex.name || '')}" placeholder="Hex name…" maxlength="32">
          </div>
          <button class="btn btn-sm btn-danger" id="btn-delete-hex" title="Delete this hex">✕</button>
        </div>
      </div>

      <!-- Type badge + selector -->
      <div class="detail-header">
        <div class="detail-type-badge detail-type-${hex.type || 'unset'}">${typeLabel}</div>
      </div>

      <!-- Type selector -->
      <div class="detail-section">
        <div class="detail-type-btns">
          <button class="btn btn-sm ${hex.type === 'surface' ? 'btn-primary' : ''} detail-type-btn" data-type="surface">🏔 Surface</button>
          <button class="btn btn-sm ${hex.type === 'tomb'    ? 'btn-primary' : ''} detail-type-btn" data-type="tomb">⚰ Tomb</button>
          <button class="btn btn-sm ${hex.type === 'blocked' ? 'btn-primary' : ''} detail-type-btn" data-type="blocked">⛔ Blocked</button>
          <button class="btn btn-sm ${!hex.type              ? 'btn-primary' : ''} detail-type-btn" data-type="">✕ Unset</button>
        </div>
      </div>

      <!-- Status -->
      ${hex.type === 'blocked' ? `
        <div class="detail-section detail-blocked-note">
          <span class="tag tag-warn">Blocked — no actions or movement through this hex</span>
          ${locationEntry ? `
            <div class="detail-blocked-reason">
              <div class="detail-roll-row" style="margin-top:.6rem">
                <span class="result-code">${locationEntry.code}</span>
                <span class="result-name">${locationEntry.name}</span>
              </div>
              <div class="result-rules detail-rules">${locationEntry.rules.replace(/\n/g, '<br>')}</div>
              ${conditionEntry ? `
                <hr class="detail-hr">
                <div class="detail-roll-row">
                  <span class="result-code">${conditionEntry.code}</span>
                  <span class="result-name">${conditionEntry.name}</span>
                </div>
                <div class="result-rules detail-rules">${conditionEntry.rules.replace(/\n/g, '<br>')}</div>
              ` : ''}
            </div>
          ` : ''}
        </div>
      ` : hex.type ? `
        <div class="detail-section">
          ${(() => {
            const isBase = App.state.killTeams.some(t => String(t.baseHex) === hexId);
            if (isBase) return `
              <div class="detail-unexplored">
                <span class="tag tag-warn">⛳ Base hex — cannot be explored (rules p.2)</span>
              </div>
            `;
            if (!hex.explored) return `
              <div class="detail-unexplored">
                <p class="text-dim">This hex is unexplored.</p>
                <button class="btn btn-primary" id="btn-explore-hex">Explore Hex</button>
              </div>
            `;
            return `
            <!-- Location -->
            ${locationEntry ? `
              <div class="detail-roll-row">
                <span class="result-code">${locationEntry.code}</span>
                <span class="result-name">${locationEntry.name}</span>
                <button class="btn btn-sm btn-reroll-loc" title="Re-roll location">↺</button>
              </div>
              ${buildReserveBadges(hex)}
              <div class="result-rules detail-rules">${locationEntry.rules.replace(/\n/g, '<br>')}</div>
            ` : ''}

            <!-- Condition -->
            ${conditionEntry ? `
              <hr class="detail-hr">
              <div class="detail-roll-row">
                <span class="result-code">${conditionEntry.code}</span>
                <span class="result-name">${conditionEntry.name}</span>
                <button class="btn btn-sm btn-reroll-con" title="Re-roll condition">↺</button>
              </div>
              <div class="result-rules detail-rules">${conditionEntry.rules.replace(/\n/g, '<br>')}</div>
            ` : ''}
          `;
          })()} 
        </div>
        </div>
      ` : `
        <div class="detail-section">
          <p class="text-dim">Set a hex type using the buttons above, or use Setup mode on the toolbar to paint multiple hexes.</p>
        </div>
      `}

      <!-- Kill teams here -->
      ${teamsHere.length ? `
        <div class="detail-section">
          <div class="detail-section-title">Kill Teams Here</div>
          ${teamsHere.map(({ t }) => `<div class="detail-team-chip">${App.escHtml(t.name)}</div>`).join('')}
        </div>
      ` : ''}

      <!-- Notes -->
      <div class="detail-section">
        <div class="detail-section-title">Notes</div>
        <textarea class="detail-notes" id="detail-notes-input" placeholder="Mission notes, special rules…">${App.escHtml(hex.notes || '')}</textarea>
      </div>

      <!-- Flags from kill team sheet -->
      <div class="detail-section">
        <div class="detail-section-title">Flags</div>
        <div class="detail-flags">
          ${App.state.killTeams.map((t, i) => `
            <div class="detail-flag-row">
              <strong>${App.escHtml(t.name)}:</strong>
              <label class="flag-label"><input type="checkbox" class="flag-base" data-tidx="${i}" ${String(t.baseHex) === hexId ? 'checked' : ''}> Base</label>
              <label class="flag-label"><input type="checkbox" class="flag-camp" data-tidx="${i}" ${(t.campHexes || []).map(String).includes(hexId) ? 'checked' : ''}> Camp</label>
            </div>
          `).join('') || '<span class="text-dim">No kill teams added yet.</span>'}
        </div>
      </div>
    `;

    bindDetailEvents(hexId);
  }

  function buildReserveBadges(hex) {
    const tags = [];
    if (hex.supplyReserve > 0)
      tags.push(`<span class="tag tag-sp">SP Reserve: ${hex.supplyReserve}</span>`);
    if (hex.intelReserve > 0)
      tags.push(`<span class="tag tag-sp">Intel Reserve: ${hex.intelReserve}</span>`);
    if (hex.cpReserve > 0)
      tags.push(`<span class="tag tag-cp">CP Reserve: ${hex.cpReserve}</span>`);
    if (hex.doomSearchCost > 0)
      tags.push(`<span class="tag tag-warn">Extra Search cost: ${hex.doomSearchCost} SP</span>`);
    if (hex.hasBeast && !hex.beastDefeated)
      tags.push(`<span class="tag tag-warn">⚠ Beast Lair — active!</span>`);
    if (hex.hasBeast && hex.beastDefeated)
      tags.push(`<span class="tag">Beast defeated</span>`);
    if (hex.hasPrisoner)
      tags.push(`<span class="tag tag-warn">Prisoner present</span>`);
    return tags.length ? `<div class="result-tags" style="margin:.4rem 0">${tags.join('')}</div>` : '';
  }

  function bindDetailEvents(hexId) {
    const hex = App.state.hexes[hexId];
    if (!hex) return;

    // Number / Name live update
    const numEl = document.getElementById('detail-hex-number');
    if (numEl) numEl.addEventListener('input', () => {
      hex.number = numEl.value;
      App.save();
      renderSVG();
    });
    const nameEl = document.getElementById('detail-hex-name');
    if (nameEl) nameEl.addEventListener('input', () => {
      hex.name = nameEl.value;
      App.save();
      renderSVG();
    });

    // Delete hex
    const delBtn = document.getElementById('btn-delete-hex');
    if (delBtn) delBtn.addEventListener('click', () => {
      if (confirm(`Delete hex "${hex.number || hexId}"? This cannot be undone.`)) {
        deleteHex(hexId);
      }
    });
    document.querySelectorAll('.detail-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        hex.type = btn.dataset.type || null;
        if (!hex.type) {
          hex.explored = false;
          hex.locationCode = null;
          hex.conditionCode = null;
        }
        App.save();
        renderSVG();
        renderDetail(hexId);
      });
    });

    // Explore button
    const exploreBtn = document.getElementById('btn-explore-hex');
    if (exploreBtn) {
      exploreBtn.addEventListener('click', () => exploreHex(hexId));
    }

    // Re-roll buttons
    const rerollLoc = document.querySelector('.btn-reroll-loc');
    if (rerollLoc) {
      rerollLoc.addEventListener('click', () => rerollLocation(hexId));
    }
    const rerollCon = document.querySelector('.btn-reroll-con');
    if (rerollCon) {
      rerollCon.addEventListener('click', () => rerollCondition(hexId));
    }

    // Notes
    const notesEl = document.getElementById('detail-notes-input');
    if (notesEl) {
      notesEl.addEventListener('change', () => {
        hex.notes = notesEl.value;
        App.save();
      });
    }

    // Flag checkboxes — Base
    document.querySelectorAll('.flag-base').forEach(cb => {
      cb.addEventListener('change', () => {
        const ti = parseInt(cb.dataset.tidx, 10);
        App.state.killTeams[ti].baseHex = cb.checked ? hexId : '';
        App.save();
        renderSVG();
        renderDetail(hexId);
      });
    });

    // Flag checkboxes — Camp
    document.querySelectorAll('.flag-camp').forEach(cb => {
      cb.addEventListener('change', () => {
        const ti = parseInt(cb.dataset.tidx, 10);
        const team = App.state.killTeams[ti];
        const camps = (team.campHexes || []).map(String);
        if (cb.checked) {
          if (!camps.includes(hexId)) camps.push(hexId);
        } else {
          const idx = camps.indexOf(hexId);
          if (idx > -1) camps.splice(idx, 1);
        }
        team.campHexes = camps;
        App.save();
        renderSVG();
        renderDetail(hexId);
      });
    });
  }

  // ─── Slot-machine explore animation ───────────────────────────────────────
  function showExploreAnimation(locEntry, conEntry, hexType, onComplete) {
    const locPool = [
      'Ruin','Tectonic Fissure','Abandoned Camp','Cryovolcanic Edifices',
      'Asteroid Impact','Landing Site','Observation Tower','Crashed Ship',
      'Resource Stockpile','Starsteles','Blackstone Obelisk','Forsaken Fortress','Beast Lair',
      'Transdimensional Portal','Transeptum Maze','Crucible of Whispers',
      'Power Cell Sanctum','Transtechnic Fulcrum','Energy Hot Spot',
      'Vivitrophic Terminal','Hyperfractal Gaol','Revivification Crypt',
      'Astral Augury','Doomsday Vault','Dimension Matrix',
    ];
    const conPool = [
      'Clear Conditions','Dust Storms','Radiation Field','Blighted Land',
      'Missile Strike','Minefield','Skull Mounds','Subterranean Tremors',
      'Exotic Particle Field','Metallic Infused Vegetation','Gyromantic Shards',
      'Cryoflux Blizzard','Gravitic Anomaly','Darkness',
    ];
    function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    function wrap(arr, centre) {
      const ci = arr.indexOf(centre);
      const base = ci >= 0 ? ci : 0;
      return [-2,-1,0,1,2].map(o => arr[(base + o + arr.length * 10) % arr.length]);
    }

    const overlay = document.createElement('div');
    overlay.id = 'explore-overlay';
    overlay.innerHTML = `
      <div class="explore-bandit">
        <div class="explore-bandit-title" id="explore-bandit-title">⚡ SCANNING HEX…</div>
        <div class="explore-bandit-reels">
          <div class="explore-reel-col">
            <div class="explore-reel-label">LOCATION</div>
            <div class="explore-reel-window">
              ${[0,1,2,3,4].map(i => `<div class="explore-reel-row${i===2?' explore-reel-center':''}" id="loc-r${i}"></div>`).join('')}
            </div>
          </div>
          <div class="explore-reel-col">
            <div class="explore-reel-label">CONDITION</div>
            <div class="explore-reel-window">
              ${[0,1,2,3,4].map(i => `<div class="explore-reel-row${i===2?' explore-reel-center':''}" id="con-r${i}"></div>`).join('')}
            </div>
          </div>
        </div>
        <button class="btn btn-primary" id="explore-confirm" disabled>Scanning…</button>
      </div>
    `;
    document.body.appendChild(overlay);

    function setReel(prefix, pool, centreVal, phase) {
      const rows = [0,1,2,3,4].map(i => document.getElementById(`${prefix}-r${i}`));
      let items;
      if (phase === 2)      items = wrap(pool, centreVal);
      else if (phase === 1) items = [rnd(pool), rnd(pool), centreVal, rnd(pool), rnd(pool)];
      else                  items = [0,1,2,3,4].map(() => rnd(pool));
      rows.forEach((el, i) => { el.textContent = items[i]; });
    }

    const TOTAL = 16;
    let tick = 0;
    function step() {
      tick++;
      const p = tick / TOTAL;
      let lp, cp;
      if (p < 0.65)      { lp = 0; cp = 0; }
      else if (p < 0.80) { lp = 1; cp = 0; }
      else if (p < 0.92) { lp = 2; cp = 1; }
      else               { lp = 2; cp = 2; }
      setReel('loc', locPool, locEntry.name, lp);
      setReel('con', conPool, conEntry.name, cp);
      if (tick >= TOTAL) {
        document.getElementById('explore-bandit-title').textContent = '✓ HEX SCANNED';
        const btn = document.getElementById('explore-confirm');
        btn.disabled = false;
        btn.textContent = 'Confirm';
        btn.addEventListener('click', () => { overlay.remove(); onComplete(); });
        return;
      }
      setTimeout(step, 40 + Math.pow(p, 2.5) * 160);
    }
    setTimeout(step, 80);
  }

  // ─── Threat roll (solo/cooperative) ───────────────────────────────────────
  function doThreatRoll(hexNum) {
    if (App.state.campaign.autoThreatRoll) {
      const roll = Generator.rollD6();
      if (roll >= 4) {
        App.state.campaign.threatLevel = Math.min(
          App.state.campaign.maxThreat,
          App.state.campaign.threatLevel + 1
        );
        App.save();
        const el = document.getElementById('header-threat');
        if (el) el.textContent = `Threat: ${App.state.campaign.threatLevel}/${App.state.campaign.maxThreat}`;
        App.showToast(`Tomb explored — threat roll: D6=${roll} (4+) → Threat raises to ${App.state.campaign.threatLevel}!`, 'warn');
      } else {
        App.showToast(`Tomb explored — threat roll: D6=${roll} (needs 4+) → Threat unchanged.`, 'info');
      }
    } else {
      showThreatRollPopup(hexNum);
    }
  }

  function showThreatRollPopup(hexNum) {
    const c = App.state.campaign;
    const overlay = document.createElement('div');
    overlay.id = 'threat-roll-overlay';
    overlay.innerHTML = `
      <div class="threat-roll-modal">
        <div class="threat-roll-header">⚠ THREAT ROLL — TOMB EXPLORED</div>
        <div class="threat-roll-body">
          <p class="threat-roll-rule-title">Solo / Cooperative Threat Rule</p>
          <div class="threat-roll-rule">
            <p>Whenever you explore a <strong>tomb hex</strong> (unless via the Scout campaign action), roll one D6:</p>
            <ul>
              <li>On a <strong>4, 5 or 6</strong> — raise the threat level by 1.</li>
              <li>On a <strong>1, 2 or 3</strong> — threat level is unchanged.</li>
            </ul>
            <p>If the threat level reaches its maximum (${c.maxThreat}), the campaign ends at the end of that campaign round — the area has become too intense for your kill team to conduct an expedition.</p>
          </div>
          <div class="threat-roll-status">
            Hex <strong>#${hexNum || '?'}</strong> &nbsp;|&nbsp; Threat: <span id="threat-popup-level" class="threat-popup-level">${c.threatLevel}</span>&thinsp;/&thinsp;${c.maxThreat}
          </div>
        </div>
        <div class="threat-roll-result" id="threat-roll-result"></div>
        <div class="threat-roll-footer">
          <button class="btn btn-primary threat-roll-dice-btn" id="threat-roll-btn">🎲 Roll D6</button>
          <button class="btn" id="threat-continue-btn" style="display:none">Continue</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('threat-roll-btn').addEventListener('click', () => {
      const roll = Generator.rollD6();
      const raised = roll >= 4;
      const resultEl = document.getElementById('threat-roll-result');
      const rollBtn  = document.getElementById('threat-roll-btn');
      const contBtn  = document.getElementById('threat-continue-btn');

      if (raised) {
        c.threatLevel = Math.min(c.maxThreat, c.threatLevel + 1);
        App.save();
        const hdr = document.getElementById('header-threat');
        if (hdr) hdr.textContent = `Threat: ${c.threatLevel}/${c.maxThreat}`;
        const lvlEl = document.getElementById('threat-popup-level');
        if (lvlEl) lvlEl.textContent = c.threatLevel;
        resultEl.innerHTML = `<div class="threat-result-raised">🎲 Rolled a <strong>${roll}</strong> — 4+ met! Threat level rises to <strong>${c.threatLevel}</strong>${c.threatLevel >= c.maxThreat ? ' — <em>maximum reached, campaign ends this round!</em>' : ''}.</div>`;
      } else {
        resultEl.innerHTML = `<div class="threat-result-safe">🎲 Rolled a <strong>${roll}</strong> — needs 4+. Threat level remains at <strong>${c.threatLevel}</strong>.</div>`;
      }

      rollBtn.style.display = 'none';
      contBtn.style.display = '';
      contBtn.addEventListener('click', () => { overlay.remove(); });
    });
  }

  // ─── Explore a hex ────────────────────────────────────────────────────────
  function exploreHex(hexId) {
    const hex = App.state.hexes[hexId];
    if (!hex || !hex.type || hex.type === 'blocked' || hex.explored) return;

    // Base hexes cannot be explored (rules p.2)
    const isBase = App.state.killTeams.some(t => String(t.baseHex) === hexId);
    if (isBase) {
      App.showToast('Base hexes cannot be explored.', 'warn');
      return;
    }

    const locTable  = hex.type === 'surface' ? 'surfaceLocation'  : 'tombLocation';
    const conTable  = hex.type === 'surface' ? 'surfaceCondition' : 'tombCondition';
    const existing  = getExistingCodes(App.state, locTable);
    const existing2 = getExistingCodes(App.state, conTable);

    const locResult = Generator.rollOnTable(locTable, existing);
    const conResult = Generator.rollOnTable(conTable, existing2);

    if (!locResult || !conResult) {
      App.showToast('Could not roll — all unique results may be used.', 'warn');
      return;
    }

    showExploreAnimation(locResult.entry, conResult.entry, hex.type, () => {
      hex.explored = true;
      hex.locationCode  = locResult.entry.code;
      hex.conditionCode = conResult.entry.code;
      hex.locationRoll  = locResult.roll;
      hex.conditionRoll = conResult.roll;

      // Handle on-explore triggers
      const needsThreatRoll = handleOnExplore(hex, locResult.entry, conResult.entry, hexId);

      App.save();
      renderSVG();
      renderDetail(hexId);

      if (needsThreatRoll) doThreatRoll(hex.number);
    });
  }

  function handleOnExplore(hex, locEntry, conEntry, hexId) {
    // Supply reserve (SL22, SL32)
    if (locEntry.hasSupplyReserve) {
      const dice = locEntry.supplyReserveDice === '2d6'
        ? Generator.rollD6() + Generator.rollD6()
        : Generator.rollD6();
      hex.supplyReserve = dice;
      App.showToast(`${locEntry.name}: rolled ${dice} Supply Points into this hex's reserve.`, 'info');
    }

    // Intel reserve (SL31)
    if (locEntry.hasIntelReserve) {
      const dice = Generator.rollD6();
      hex.intelReserve = dice;
      App.showToast(`${locEntry.name}: rolled ${dice} Intel into this hex's reserve.`, 'info');
    }

    // CP reserve (TL23)
    if (locEntry.hasCPReserve) {
      const dice = Generator.rollD3();
      hex.cpReserve = dice;
      App.showToast(`${locEntry.name}: rolled ${dice} Campaign Points into this hex's reserve.`, 'info');
    }

    // Doomsday Vault extra search cost (TL35)
    if (locEntry.hasDoomSearchCost) {
      const dice = Generator.rollD3();
      hex.doomSearchCost = dice;
      App.showToast(`${locEntry.name}: Search costs ${dice} extra SP this campaign.`, 'warn');
    }

    // Tectonic Fissure (SL21) — becomes blocked immediately
    if (locEntry.blocksHex) {
      hex.type = 'blocked';
      App.showToast(`Tectonic Fissure! Hex #${hexId} is now blocked.`, 'warn');
    }

    // Beast Lair (SL36)
    if (locEntry.hasBeast) {
      hex.hasBeast = true;
      App.showToast(`Beast Lair discovered in Hex #${hexId}! Kill teams within 2 hexes are at risk each Threat phase.`, 'warn');
    }

    // Hyperfractal Gaol (TL32) — prisoner flag
    if (locEntry.hasPrisoner) {
      hex.hasPrisoner = true;
      App.showToast(`Hyperfractal Gaol — a prisoner lurks in Hex #${hexId}. Released on first Encamp.`, 'warn');
    }

    App.showToast(
      `Hex #${hexId} explored: ${locEntry.name} (${locEntry.code}) / ${conEntry.name} (${conEntry.code})`,
      'success'
    );

    return hex.type === 'tomb' && App.state.campaign.isSolo;
  }

  // ─── Re-roll helpers ──────────────────────────────────────────────────────
  function rerollLocation(hexId) {
    const hex = App.state.hexes[hexId];
    if (!hex || !hex.type || hex.type === 'blocked') return;
    const locTable = hex.type === 'surface' ? 'surfaceLocation' : 'tombLocation';
    // Temporarily remove current code from "existing" so we don't block the re-roll of it
    const existing = getExistingCodes(App.state, locTable).filter(c => c !== hex.locationCode);
    const result = Generator.rollOnTable(locTable, existing);
    if (!result) { App.showToast('No valid location results available.', 'warn'); return; }
    hex.locationCode = result.entry.code;
    hex.locationRoll = result.roll;
    // Re-run explore triggers for new entry
    handleOnExplore(hex, result.entry, { hasPrisoner: false, hasBeast: false }, hexId);
    App.save();
    renderSVG();
    renderDetail(hexId);
  }

  function rerollCondition(hexId) {
    const hex = App.state.hexes[hexId];
    if (!hex || !hex.type || hex.type === 'blocked') return;
    const conTable = hex.type === 'surface' ? 'surfaceCondition' : 'tombCondition';
    const existing = getExistingCodes(App.state, conTable).filter(c => c !== hex.conditionCode);
    const result = Generator.rollOnTable(conTable, existing);
    if (!result) { App.showToast('No valid condition results available.', 'warn'); return; }
    hex.conditionCode = result.entry.code;
    hex.conditionRoll = result.roll;
    App.save();
    renderSVG();
    renderDetail(hexId);
  }

  // ─── Entry lookup ─────────────────────────────────────────────────────────
  function lookupEntry(code) {
    for (const table of Object.values(TABLES)) {
      for (const entry of Object.values(table.entries)) {
        if (entry.code === code) return entry;
      }
    }
    return null;
  }

  // ─── Public API ───────────────────────────────────────────────────────────
  return { init, refresh };
})();
