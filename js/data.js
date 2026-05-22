// js/data.js — Roll table data for Ctesiphus Expedition
// D36 mechanic: roll D3 (tens digit) + D6 (units digit), combine → e.g. 2+5 = row 25
// Possible results: 11–16, 21–26, 31–36

const TABLES = {

  // ─── SURFACE LOCATION ──────────────────────────────────────────────────────
  surfaceLocation: {
    label: 'Surface Location',
    short: 'SL',
    hexType: 'surface',
    tableType: 'location',
    entries: (function () {
      const ruin = {
        name: 'Ruin', code: 'SL11', allowDuplicates: true,
        rules: 'No additional rules. Unlike other locations, duplicates are allowed.',
        blocksHex: false, hasSupplyReserve: false, hasIntelReserve: false,
        hasCPReserve: false, hasBeast: false, hasPrisoner: false
      };
      return {
        11: ruin, 12: ruin, 13: ruin, 14: ruin, 15: ruin, 16: ruin,
        21: {
          name: 'Tectonic Fissure', code: 'SL21', allowDuplicates: false,
          rules: 'This hex becomes blocked immediately upon exploration.',
          blocksHex: true, hasSupplyReserve: false, hasIntelReserve: false,
          hasCPReserve: false, hasBeast: false, hasPrisoner: false
        },
        22: {
          name: 'Abandoned Camp', code: 'SL22', allowDuplicates: false,
          rules: 'On explore: roll D6 — this hex gains that many Supply points.\n' +
                 'Search: gain D3 of this hex\'s Supply points (reduced accordingly). Once 0, no more.',
          blocksHex: false, hasSupplyReserve: true, supplyReserveDice: '1d6',
          hasIntelReserve: false, hasCPReserve: false, hasBeast: false, hasPrisoner: false
        },
        23: {
          name: 'Cryovolcanic Edifices', code: 'SL23', allowDuplicates: false,
          rules: 'Search: spend 1 or 2 SP. If 1 SP: roll D3. If 2 SP: roll 2D3.\n' +
                 '• 1: Nothing. • 2: Gain D3 SP. • 3: Gain 1 CP.\n' +
                 'Each player cannot gain results 2 or 3 more than once each per campaign.',
          blocksHex: false, hasSupplyReserve: false, hasIntelReserve: false,
          hasCPReserve: false, hasBeast: false, hasPrisoner: false
        },
        24: {
          name: 'Asteroid Impact', code: 'SL24', allowDuplicates: false,
          rules: 'Players in this hex cannot perform the Resupply action.\n' +
                 'Manoeuvre from this hex: costs 1 extra SP to move to a surface hex; costs 1 fewer SP to move to a tomb hex (free).',
          blocksHex: false, hasSupplyReserve: false, hasIntelReserve: false,
          hasCPReserve: false, hasBeast: false, hasPrisoner: false
        },
        25: {
          name: 'Landing Site', code: 'SL25', allowDuplicates: false,
          rules: 'While kill team is here: Encamp action costs 1 SP.\n' +
                 'Resupply action while here: gain D3 additional SP.',
          blocksHex: false, hasSupplyReserve: false, hasIntelReserve: false,
          hasCPReserve: false, hasBeast: false, hasPrisoner: false
        },
        26: {
          name: 'Observation Tower', code: 'SL26', allowDuplicates: false,
          rules: 'Search: immediately perform a Scout action costing 0 SP. Choose either:\n' +
                 '• Select any unexplored surface hex (not limited to within 3), OR\n' +
                 '• Select one unexplored surface hex within 3 hexes; generate two valid locations and pick one.\n' +
                 'Camp: when exploring a surface hex, generate two valid locations and pick one. Scout never costs more than 1 SP for surface hexes.',
          blocksHex: false, hasSupplyReserve: false, hasIntelReserve: false,
          hasCPReserve: false, hasBeast: false, hasPrisoner: false
        },
        31: {
          name: 'Crashed Ship', code: 'SL31', allowDuplicates: false,
          rules: 'On explore: roll D6 — this hex gains that many Intel.\n' +
                 'Search: gain D3 Intel (reduced accordingly). Once 0, no more.\n' +
                 'Each Intel: immediately perform a Scout action (0 SP, any unexplored surface hex, not tomb).',
          blocksHex: false, hasSupplyReserve: false, hasIntelReserve: true, intelReserveDice: '1d6',
          hasCPReserve: false, hasBeast: false, hasPrisoner: false
        },
        32: {
          name: 'Resource Stockpile', code: 'SL32', allowDuplicates: false,
          rules: 'On explore: roll 2D6 — this hex gains that many Supply points.\n' +
                 'Search: gain D6 of this hex\'s Supply points (reduced accordingly). Once 0, no more.',
          blocksHex: false, hasSupplyReserve: true, supplyReserveDice: '2d6',
          hasIntelReserve: false, hasCPReserve: false, hasBeast: false, hasPrisoner: false
        },
        33: {
          name: 'Starsteles', code: 'SL33', allowDuplicates: false,
          rules: 'Search: roll D3.\n' +
                 '• 1: Nothing. • 2: Move kill team to a different surface hex (if not already containing 2 kill teams).\n' +
                 '• 3: Move kill team to a tomb hex (if not already containing 2 kill teams).\n' +
                 'Camp: gain 1 CP (while you have a camp in this hex).',
          blocksHex: false, hasSupplyReserve: false, hasIntelReserve: false,
          hasCPReserve: false, hasBeast: false, hasPrisoner: false
        },
        34: {
          name: 'Blackstone Obelisk', code: 'SL34', allowDuplicates: false,
          rules: 'Search: gain 1 CP. Each player cannot search this hex more than once per campaign.\n' +
                 'Camp: gain 1 CP (while you have a camp in this hex).',
          blocksHex: false, hasSupplyReserve: false, hasIntelReserve: false,
          hasCPReserve: false, hasBeast: false, hasPrisoner: false
        },
        35: {
          name: 'Forsaken Fortress', code: 'SL35', allowDuplicates: false,
          rules: 'First Encamp here: you may move your base to this hex instead (+1 CP). Previous base becomes Abandoned Camp (SL22).\n' +
                 'Camp: gain 1 CP (while camp is here, but not if you moved base here).\n' +
                 'Search: gain D3 SP. Cannot search if an opponent has a base or camp here.',
          blocksHex: false, hasSupplyReserve: false, hasIntelReserve: false,
          hasCPReserve: false, hasBeast: false, hasPrisoner: false
        },
        36: {
          name: 'Beast Lair', code: 'SL36', allowDuplicates: false,
          rules: 'Threat phase: each player within 2 surface hexes may be attacked. Players roll off (+1 per hex distance, max 2). Loser loses D6 SP. If only one player is within range, they roll D6; on 5+ they are not attacked.\n' +
                 'Encamp cannot be performed here until after Demolish. Demolish cannot be performed same round it\'s explored.\n' +
                 'First Demolish: beast is destroyed (ignore above rule for rest of campaign).',
          blocksHex: false, hasSupplyReserve: false, hasIntelReserve: false,
          hasCPReserve: false, hasBeast: true, hasPrisoner: false
        }
      };
    })()
  },

  // ─── TOMB LOCATION ─────────────────────────────────────────────────────────
  tombLocation: {
    label: 'Tomb Location',
    short: 'TL',
    hexType: 'tomb',
    tableType: 'location',
    entries: (function () {
      const ruin = {
        name: 'Ruin', code: 'TL11', allowDuplicates: true,
        rules: 'No additional rules. Unlike other locations, duplicates are allowed.',
        blocksHex: false, hasSupplyReserve: false, hasIntelReserve: false,
        hasCPReserve: false, hasBeast: false, hasPrisoner: false
      };
      return {
        11: ruin, 12: ruin, 13: ruin, 14: ruin, 15: ruin, 16: ruin,
        21: {
          name: 'Transdimensional Portal', code: 'TL21', allowDuplicates: false,
          rules: 'Search: select one tomb hex and one surface hex (previously selected are deselected). In the Movement phase, a kill team starting Manoeuvre here can move to one of those hexes (distance = 1), then continue up to 2 more hexes. Cannot be searched more than once per campaign round.',
          blocksHex: false, hasSupplyReserve: false, hasIntelReserve: false,
          hasCPReserve: false, hasBeast: false, hasPrisoner: false
        },
        22: {
          name: 'Transeptum Maze', code: 'TL22', allowDuplicates: false,
          rules: 'Moving out of this hex costs 1 extra SP (moving to an adjacent hex costs 2 SP total).\n' +
                 'Camp: the Demolish action cannot be performed here by anyone (unless via Doomsday Vault TL35). Additionally, the above SP rule is ignored for the camp holder.',
          blocksHex: false, hasSupplyReserve: false, hasIntelReserve: false,
          hasCPReserve: false, hasBeast: false, hasPrisoner: false
        },
        23: {
          name: 'Crucible of Whispers', code: 'TL23', allowDuplicates: false,
          rules: 'On explore: roll D3 — this hex gains that many Campaign points.\n' +
                 'Search: spend 1, 3, or 5 SP. Roll that many D6s. Each 5+ result gains 1 of this hex\'s CP. Once 0, no more.\n' +
                 'Camp: at the start of each Threat phase, roll D6: on 5+, gain 1 of this hex\'s CP.',
          blocksHex: false, hasSupplyReserve: false, hasIntelReserve: false,
          hasCPReserve: true, cpReserveDice: '1d3', hasBeast: false, hasPrisoner: false
        },
        24: {
          name: 'Power Cell Sanctum', code: 'TL24', allowDuplicates: false,
          rules: 'First time Demolish is performed here: each other player with a kill team in a tomb hex loses D6 SP. Encamp cannot be performed here for the rest of the campaign.\n' +
                 'Camp: gain 1 CP (while camp is here).\n' +
                 'Note: performing Demolish here in a solo campaign raises threat by D3 — not recommended!',
          blocksHex: false, hasSupplyReserve: false, hasIntelReserve: false,
          hasCPReserve: false, hasBeast: false, hasPrisoner: false
        },
        25: {
          name: 'Transtechnic Fulcrum', code: 'TL25', allowDuplicates: false,
          rules: 'Search: select one other tomb hex to become blocked (the previously selected one is unblocked). If the newly blocked hex has a camp, the camp remains but is ignored for Regroup until unblocked.',
          blocksHex: false, hasSupplyReserve: false, hasIntelReserve: false,
          hasCPReserve: false, hasBeast: false, hasPrisoner: false
        },
        26: {
          name: 'Energy Hot Spot', code: 'TL26', allowDuplicates: false,
          rules: 'Camp: gain 1 CP (while camp is here). Additionally, at the start of each Threat phase, gain 1 SP.',
          blocksHex: false, hasSupplyReserve: false, hasIntelReserve: false,
          hasCPReserve: false, hasBeast: false, hasPrisoner: false
        },
        31: {
          name: 'Vivitrophic Terminal', code: 'TL31', allowDuplicates: false,
          rules: 'Search: roll 2D6. You may immediately spend SP equal to the result to gain 1 CP. Each player cannot gain more than 1 CP per campaign from searching here.\n' +
                 'Camp: at the end of the campaign, if you have a camp here and 5 or more SP, gain 1 CP.',
          blocksHex: false, hasSupplyReserve: false, hasIntelReserve: false,
          hasCPReserve: false, hasBeast: false, hasPrisoner: false
        },
        32: {
          name: 'Hyperfractal Gaol', code: 'TL32', allowDuplicates: false,
          rules: 'First time Encamp is performed here: the released prisoner is added to this hex. Track its position on the map.\n' +
                 'First time Demolish is performed here: the prisoner is removed from the campaign.\n' +
                 'Camp: at the start of each Threat phase, move the prisoner up to D3 hexes. When it stops (unless in Transeptum Maze TL22), each other player\'s kill team in that hex loses D6 SP and loses a camp. If any player loses SP or a camp, roll D6 at end of Threat phase: on 4+, prisoner is removed.',
          blocksHex: false, hasSupplyReserve: false, hasIntelReserve: false,
          hasCPReserve: false, hasBeast: false, hasPrisoner: true
        },
        33: {
          name: 'Revivification Crypt', code: 'TL33', allowDuplicates: false,
          rules: 'At the start of each Action phase, each player with a kill team here may perform a free Resupply action (does not prevent another action this phase, except Resupply).\n' +
                 'Camp: at the start of each Threat phase, roll D3: on 2+, gain that many SP.',
          blocksHex: false, hasSupplyReserve: false, hasIntelReserve: false,
          hasCPReserve: false, hasBeast: false, hasPrisoner: false
        },
        34: {
          name: 'Astral Augury', code: 'TL34', allowDuplicates: false,
          rules: 'Search: the first player to search gains D3 CP. Each subsequent player gains 1 CP. Each player cannot search more than once per campaign.',
          blocksHex: false, hasSupplyReserve: false, hasIntelReserve: false,
          hasCPReserve: false, hasBeast: false, hasPrisoner: false
        },
        35: {
          name: 'Doomsday Vault', code: 'TL35', allowDuplicates: false,
          rules: 'On explore: roll D3 — this is the additional SP cost to Search here.\n' +
                 'Search: select one tomb hex. Perform a Demolish action on it for free (even your own camp). That hex becomes blocked. Gain 1 CP.\n' +
                 'Solo: searching this hex raises threat level by D3.',
          blocksHex: false, hasSupplyReserve: false, hasIntelReserve: false,
          hasCPReserve: false, hasDoomSearchCost: true, hasBeast: false, hasPrisoner: false
        },
        36: {
          name: 'Dimension Matrix', code: 'TL36', allowDuplicates: false,
          rules: 'Search: gain the dimensional key (unless another player already has it).\n' +
                 'While holding the key, in the Movement phase you may perform the Dimensional Manoeuvre instead: move to any hex (not containing 2 kill teams) for 1 SP. You then no longer have the key — it becomes available for the next player to search this hex.',
          blocksHex: false, hasSupplyReserve: false, hasIntelReserve: false,
          hasCPReserve: false, hasBeast: false, hasPrisoner: false
        }
      };
    })()
  },

  // ─── SURFACE CONDITION ─────────────────────────────────────────────────────
  surfaceCondition: {
    label: 'Surface Condition',
    short: 'SC',
    hexType: 'surface',
    tableType: 'condition',
    entries: (function () {
      const clear = {
        name: 'Clear Conditions', code: 'SC11', allowDuplicates: true,
        rules: 'No additional rules. Unlike other conditions, duplicates are allowed.'
      };
      return {
        11: clear, 12: clear, 13: clear, 14: clear, 15: clear, 16: clear,
        21: {
          name: 'Dust Storms', code: 'SC21', allowDuplicates: false,
          rules: 'Worsen the Hit stat of ranged weapons by 1 (not cumulative with injury) unless: heavy terrain is within control range, the operative is wholly within a stronghold feature, or any part of its base is underneath Vantage terrain.'
        },
        22: {
          name: 'Radiation Field', code: 'SC22', allowDuplicates: false,
          rules: 'Whenever an operative is activated, if there is no Heavy terrain within its control range, roll D6: if the result is less than that operative\'s Save stat, inflict damage equal to the dice result.'
        },
        23: {
          name: 'Blighted Land', code: 'SC23', allowDuplicates: false,
          rules: 'In the Ready step of each Strategy phase, inflict 1 damage on each operative on the killzone floor, excluding operatives wholly within a stronghold terrain feature.'
        },
        24: {
          name: 'Missile Strike', code: 'SC24', allowDuplicates: false,
          rules: 'In the Ready step of the first Strategy phase, one player rolls D3 and adds 1. In the Ready step of that turning point, inflict D6+3 damage on each operative within 6" of the centre of the killzone (roll separately for each).'
        },
        25: {
          name: 'Minefield', code: 'SC25', allowDuplicates: false,
          rules: 'Set Up the Battle: set up one Mines marker on the centre of each objective marker. When selecting equipment, each player must select the mines universal equipment but may select up to 5 equipment options (instead of 4).'
        },
        26: {
          name: 'Skull Mounds', code: 'SC26', allowDuplicates: false,
          rules: 'The winner of the battle gains 1 additional Campaign point. Each player cannot gain a CP from this condition more than once per campaign.'
        },
        31: {
          name: 'Subterranean Tremors', code: 'SC31', allowDuplicates: false,
          rules: 'Whenever an operative performs the Charge action, subtract 1" from its Move stat. Whenever an operative performs the Dash action, subtract 1" from the distance it can move.'
        },
        32: {
          name: 'Exotic Particle Field', code: 'SC32', allowDuplicates: false,
          rules: 'Whenever a friendly operative is shooting, if the centreline is intervening, you must re-roll one of your critical successes (or one normal success if there are none).'
        },
        33: {
          name: 'Metallic Infused Vegetation', code: 'SC33', allowDuplicates: false,
          rules: 'Select Equipment: each player must select the heavy barricade universal equipment but may select up to 5 options. Each player may set up their heavy barricade wholly within their territory, on the killzone floor, more than 2" from other equipment.\n' +
                 'Whenever an operative crosses a heavy barricade within 1" of it, inflict D3 damage on that operative.'
        },
        34: {
          name: 'Gyromantic Shards', code: 'SC34', allowDuplicates: false,
          rules: 'Whenever a friendly operative is shooting, if any attack dice show a 1 (before re-rolls), you must re-roll all attack dice (you cannot choose which to re-roll).'
        },
        35: {
          name: 'Cryoflux Blizzard', code: 'SC35', allowDuplicates: false,
          rules: 'Whenever a friendly operative performs the Charge action, before moving, roll D6: if the result is higher than that operative\'s APL stat, select an enemy operative it can end the move within control range of. Your opponent then moves that operative for the action (it must end within control range of the selected enemy operative).'
        },
        36: {
          name: 'Gravitic Anomaly', code: 'SC36', allowDuplicates: false,
          rules: 'Once per turning point, each player can use this rule. When a friendly operative performs an action in which it moves, it can FLY: remove it from the killzone and set it up within a horizontal distance equal to its Move stat (or 3" for Dash) of its original location. It cannot be set up within control range of an enemy operative (unless Charge action).'
        }
      };
    })()
  },

  // ─── TOMB CONDITION ────────────────────────────────────────────────────────
  tombCondition: {
    label: 'Tomb Condition',
    short: 'TC',
    hexType: 'tomb',
    tableType: 'condition',
    entries: (function () {
      const clear = {
        name: 'Clear Conditions', code: 'TC11', allowDuplicates: true,
        rules: 'No additional rules. Unlike other conditions, duplicates are allowed.'
      };
      return {
        11: clear, 12: clear, 13: clear, 14: clear, 15: clear, 16: clear,
        21: {
          name: 'Darkness', code: 'TC21', allowDuplicates: false,
          rules: 'Whenever an operative is shooting an operative more than 8" away, that target is obscured.'
        },
        22: {
          name: 'Scarab Swarm', code: 'TC22', allowDuplicates: false,
          rules: 'Place a Scarab Swarm marker as close as possible to the centre of the killzone. In the Ready step of each Strategy phase, move the marker 2D3" towards the nearest operative (roll-off if tied). Once during each operative\'s activation, as soon as the marker is within control range, inflict D3 damage on that operative.'
        },
        23: {
          name: 'Tesla Rupture', code: 'TC23', allowDuplicates: false,
          rules: 'In the Ready step of the 2nd and 4th Strategy phases, inflict 1 damage on each operative that has Wall terrain within its control range, or is within control range of another operative that does (not cumulative).'
        },
        24: {
          name: 'Automated System Error', code: 'TC24', allowDuplicates: false,
          rules: 'In the Ready step of each Strategy phase, one player randomly determines one hatchway terrain feature and changes its status to open or closed.'
        },
        25: {
          name: 'Weakened Structure', code: 'TC25', allowDuplicates: false,
          rules: 'Operatives can perform the Breach and Operate Hatch actions for 1 less AP. This is cumulative with existing rules referenced in the Breach action, but not with other AP reductions.'
        },
        26: {
          name: 'Crypt Fatigue', code: 'TC26', allowDuplicates: false,
          rules: 'In the Ready step of each Strategy phase, each player must select a number of friendly operatives equal to the turning point number (or as many as possible); they cannot select an operative with a reduced APL. Subtract 1 from each selected operative\'s APL stat until the end of its next activation.'
        },
        31: {
          name: 'Temporal Diffusement', code: 'TC31', allowDuplicates: false,
          rules: 'Whenever an operative is activated, roll D6:\n' +
                 '• 1–2: subtract 1" from Move stat until end of activation.\n' +
                 '• 3–4: nothing.\n' +
                 '• 5–6: add 1" to Move stat until end of activation.'
        },
        32: {
          name: 'Hyperspatial Breach', code: 'TC32', allowDuplicates: false,
          rules: 'At the end of Set Up Operatives, each player randomly determines one of their operatives. Remove it from the killzone. In the Ready step of the 2nd Strategy phase, each player sets up their operative (player with initiative first) within 6" of their killzone edge or within 3" of a friendly operative, not within control range of enemies.'
        },
        33: {
          name: 'Xenoviral Demise', code: 'TC33', allowDuplicates: false,
          rules: 'Whenever an operative is incapacitated, before it is removed, roll D6 separately for each other operative within 2" of it. On a 4+, inflict 2 damage on that operative.'
        },
        34: {
          name: 'Collapsing Tomb', code: 'TC34', allowDuplicates: false,
          rules: 'In the Ready step of the 2nd Strategy phase, inflict D3 damage on each operative that has a breach point within its control range (roll separately). Then open every breach point in the killzone.'
        },
        35: {
          name: 'Nanoweave Web Traps', code: 'TC35', allowDuplicates: false,
          rules: 'Each time an operative ends the Dash action, roll D6: on a 1, it gains one Web token until the end of its next activation. An operative with a Web token cannot perform actions in which it moves.'
        },
        36: {
          name: 'Neurotechnic Haunting', code: 'TC36', allowDuplicates: false,
          rules: 'Whenever an operative is activated, if it contests an objective marker, roll D6: on a 1–2, until the start of that operative\'s next activation, whenever determining control of a marker, treat that operative\'s APL stat as 1 lower (cumulative with other changes).'
        }
      };
    })()
  }
};

// Helper: get an entry from a table by roll number
function getTableEntry(tableName, roll) {
  const table = TABLES[tableName];
  if (!table) return null;
  return table.entries[roll] || null;
}

// Helper: get all unique result codes currently on the map (for duplicate detection)
// Called by generator with the current app state
function getExistingCodes(state, tableName) {
  const table = TABLES[tableName];
  const field = table.tableType === 'location' ? 'locationCode' : 'conditionCode';
  const codes = [];
  for (const hex of Object.values(state.hexes || {})) {
    if (hex[field]) codes.push(hex[field]);
  }
  return codes;
}
