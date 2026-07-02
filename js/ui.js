/**
 * @fileoverview UI wiring. Builds the radio groups and plate buttons,
 * connects widgets to the shared animation state and the barbell rig, and
 * keeps the total-weight readout, plate chips, and scoreboard in sync.
 */

import {BAR_TYPES, CONFIG_MODES, PLATE_SPECS} from './config.js';

/**
 * Initializes all UI widgets.
 * @param {!Object} state Shared mutable animation/lighting state.
 * @param {!Object} rig BarbellRig instance.
 * @param {{onModeChange: function(string), onWeightChange:
 *     function(string, string)}} handlers Scene callbacks.
 */
export function initUi(state, rig, handlers) {
  const el = (id) => document.getElementById(id);

  buildRadios(el('modeRadios'), 'mode', CONFIG_MODES.map((m) => ({
    value: m.id,
    label: m.label,
    checked: m.id === 'rack',
  })), (value) => {
    handlers.onModeChange(value);
  });

  buildRadios(el('unitRadios'), 'unit', [
    {value: 'lb', label: 'Pounds (lb)', checked: true},
    {value: 'kg', label: 'Kilograms (kg)', checked: false},
  ], (value) => {
    rig.setUnit(value);
    buildPlateButtons();
    refresh();
  });

  buildRadios(el('barRadios'), 'bar', Object.values(BAR_TYPES).map((b) => ({
    value: b.id,
    label: `${b.label}: ${b.weightLb} lb / ${b.weightKg} kg`,
    checked: b.id === 'olympic',
  })), (value) => {
    rig.setBarType(value);
    refresh();
  });

  /** Rebuilds the add-plate buttons for the active unit system. */
  function buildPlateButtons() {
    const box = el('plateButtons');
    box.textContent = '';
    for (const spec of PLATE_SPECS[rig.unit]) {
      const button = document.createElement('button');
      button.className = 'plateBtn';
      button.style.setProperty('--plate', spec.color);
      button.innerHTML = `<span class="chip"></span>Add ${spec.label} ` +
          rig.unit;
      button.addEventListener('click', () => {
        if (rig.addPlate(spec)) {
          refresh();
        } else {
          toast('Sleeve is full: remove a plate first.');
        }
      });
      box.appendChild(button);
    }
  }

  el('removeLastBtn').addEventListener('click', () => {
    rig.removeLast();
    refresh();
  });
  el('clearBtn').addEventListener('click', () => {
    rig.clearPlates();
    refresh();
  });

  bindCheckbox('keyLight', state);
  bindCheckbox('fillLight', state);
  bindCheckbox('shadows', state);
  bindCheckbox('texturesOn', state);
  bindCheckbox('autoRotate', state);
  bindSlider('ambient', state);
  bindSlider('rotateSpeed', state);

  /** Updates the readout, chips, and scoreboard after any weight change. */
  function refresh() {
    const info = rig.getTotalInfo();
    const unit = info.unit.toUpperCase();
    el('totalMain').textContent = `${formatWeight(info.total)} ${unit}`;
    const sub = info.perSide ?
        `${formatWeight(info.totalOther)} ${info.otherUnit}: bar ` +
        `${formatWeight(info.barWeight)} + ${formatWeight(info.perSide)} ` +
        `per side` :
        `${formatWeight(info.totalOther)} ${info.otherUnit}: bar only`;
    el('totalSub').textContent = sub;

    const chips = el('plateChips');
    chips.textContent = '';
    for (const spec of rig.getLoadedSpecs()) {
      const chip = document.createElement('span');
      chip.className = 'loadedChip';
      chip.style.background = spec.color;
      chip.textContent = spec.label;
      chips.appendChild(chip);
    }

    handlers.onWeightChange(
        `TOTAL ${formatWeight(info.total)} ${unit}`,
        info.perSide ?
            `${formatWeight(info.totalOther)} ${info.otherUnit} • ` +
            `${formatWeight(info.perSide)}/SIDE` :
            `${formatWeight(info.totalOther)} ${info.otherUnit} • BAR ONLY`);
  }

  let toastTimer = 0;
  /**
   * Shows a transient warning message.
   * @param {string} message Text to display.
   */
  function toast(message) {
    const box = el('toast');
    box.textContent = message;
    box.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => box.classList.remove('show'), 2200);
  }

  buildPlateButtons();
  refresh();
}

/**
 * Formats a weight, dropping the decimal for whole numbers.
 * @param {number} value Weight value.
 * @return {string} Display string.
 */
function formatWeight(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/**
 * Builds a labeled radio group inside a container.
 * @param {!Element} container Target element.
 * @param {string} name Radio group name.
 * @param {!Array<{value: string, label: string, checked: boolean}>} options
 *     Radio options.
 * @param {function(string)} onChange Called with the selected value.
 */
function buildRadios(container, name, options, onChange) {
  for (const opt of options) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.value = opt.value;
    input.checked = opt.checked;
    input.addEventListener('change', () => onChange(opt.value));
    label.appendChild(input);
    label.appendChild(document.createTextNode(' ' + opt.label));
    container.appendChild(label);
  }
}

/**
 * Binds a checkbox to a boolean field of the shared state.
 * @param {string} id Element id, which is also the state key.
 * @param {!Object} state Shared state object.
 */
function bindCheckbox(id, state) {
  const input = document.getElementById(id);
  input.checked = state[id];
  input.addEventListener('change', () => {
    state[id] = input.checked;
  });
}

/**
 * Binds a range slider to a numeric field of the shared state.
 * @param {string} id Element id, which is also the state key.
 * @param {!Object} state Shared state object.
 */
function bindSlider(id, state) {
  const input = document.getElementById(id);
  input.value = state[id];
  input.addEventListener('input', () => {
    state[id] = parseFloat(input.value);
  });
}
