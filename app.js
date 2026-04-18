const STORAGE_KEY = 'poupancaChecks';
const EXTRA_STORAGE_KEY = 'poupancaExtra';
const GOAL_STORAGE_KEY = 'poupancaMeta';
const DEFAULT_GOAL = 6055;

function loadGoal() {
  const raw = localStorage.getItem(GOAL_STORAGE_KEY);
  if (raw !== null) {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return DEFAULT_GOAL;
}

function computeSlots(goal) {
  return Math.round((-1 + Math.sqrt(1 + 8 * goal)) / 2);
}

let goalValue = loadGoal();
let totalSlots = computeSlots(goalValue);

const grid = document.getElementById('grid');
const savedValue = document.getElementById('saved-value');
const remainingValue = document.getElementById('remaining-value');
const savedCount = document.getElementById('saved-count');
const remainingCount = document.getElementById('remaining-count');
const totalValue = document.getElementById('total-value');
const progressBar = document.getElementById('progress-bar');
const progressLabel = document.getElementById('progress-label');
const manualForm = document.getElementById('manual-form');
const manualInput = document.getElementById('manual-input');
const manualStatus = document.getElementById('manual-status');
const manualResetButton = document.getElementById('manual-reset');
const goalEditBtn = document.getElementById('goal-edit-btn');
const goalForm = document.getElementById('goal-form');
const goalInput = document.getElementById('goal-input');
const goalCancelBtn = document.getElementById('goal-cancel-btn');
const slotsInfo = document.getElementById('slots-info');

const checkedValues = new Set(loadState());
let manualValue = loadManualValue();
const buttonsByValue = new Map();

function formatCurrency(value) {
  return `R$ ${value.toLocaleString('pt-BR')}`;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((value) => Number.isInteger(value) && value >= 1 && value <= totalSlots);
  } catch (error) {
    return [];
  }
}

function saveState() {
  const list = Array.from(checkedValues).sort((a, b) => a - b);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function loadManualValue() {
  const raw = localStorage.getItem(EXTRA_STORAGE_KEY);
  const parsed = Number.parseInt(raw || '0', 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
}

function saveManualValue(value) {
  manualValue = value;
  localStorage.setItem(EXTRA_STORAGE_KEY, String(value));
}

function setButtonChecked(value, checked) {
  const button = buttonsByValue.get(value);
  if (!button) {
    return;
  }
  button.classList.toggle('is-checked', checked);
  button.setAttribute('aria-pressed', checked ? 'true' : 'false');
}

function buildGrid() {
  const fragment = document.createDocumentFragment();

  for (let value = 1; value <= totalSlots; value += 1) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = value;
    button.dataset.value = String(value);
    button.setAttribute('role', 'listitem');
    button.style.setProperty('--delay', `${value * 8}ms`);

    buttonsByValue.set(value, button);

    if (checkedValues.has(value)) {
      button.classList.add('is-checked');
      button.setAttribute('aria-pressed', 'true');
    } else {
      button.setAttribute('aria-pressed', 'false');
    }

    fragment.appendChild(button);
  }

  grid.appendChild(fragment);
}

function updateSummary() {
  const saved = Array.from(checkedValues).reduce((total, value) => total + value, 0);
  const totalSaved = saved + manualValue;
  const remaining = Math.max(goalValue - totalSaved, 0);
  const checkedCount = checkedValues.size;
  const remainingCountValue = totalSlots - checkedCount;
  const percent = Math.min(100, Math.round((totalSaved / goalValue) * 100));

  savedValue.textContent = formatCurrency(totalSaved);
  remainingValue.textContent = formatCurrency(remaining);
  savedCount.textContent = `${checkedCount}/${totalSlots} marcados`;
  remainingCount.textContent = `${remainingCountValue} valores restantes`;
  progressBar.style.width = `${percent}%`;
  progressLabel.textContent = `${percent}%`;
}

function updateTotal() {
  totalValue.textContent = formatCurrency(goalValue);
}

function updateSlotsInfo() {
  if (slotsInfo) {
    slotsInfo.textContent = `Sao ${totalSlots} valores de 1 a ${totalSlots}.`;
  }
}

function toggleValue(value) {
  if (checkedValues.has(value)) {
    checkedValues.delete(value);
    setButtonChecked(value, false);
  } else {
    checkedValues.add(value);
    setButtonChecked(value, true);
  }

  saveState();
  updateSummary();
}

grid.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  const value = Number(target.dataset.value);
  if (!Number.isInteger(value)) {
    return;
  }

  toggleValue(value);
});

function updateManualStatus() {
  if (!manualStatus) {
    return;
  }
  if (manualValue <= 0) {
    manualStatus.textContent = 'Nenhum valor direto registrado.';
    return;
  }
  manualStatus.textContent = `Valor direto acumulado: ${formatCurrency(manualValue)}.`;
}

if (manualForm) {
  manualForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!manualInput) {
      return;
    }
    const rawValue = Number.parseInt(manualInput.value, 10);
    if (!Number.isInteger(rawValue) || rawValue <= 0) {
      manualStatus.textContent = 'Informe um valor inteiro maior que zero.';
      return;
    }
    const newTotal = manualValue + rawValue;
    saveManualValue(newTotal);
    manualInput.value = '';
    updateManualStatus();
    updateSummary();
  });
}

if (manualResetButton) {
  manualResetButton.addEventListener('click', () => {
    saveManualValue(0);
    updateManualStatus();
    updateSummary();
  });
}

if (goalEditBtn && goalForm) {
  goalEditBtn.addEventListener('click', () => {
    goalInput.value = goalValue;
    goalForm.hidden = false;
    goalEditBtn.hidden = true;
    goalInput.focus();
  });
}

if (goalCancelBtn) {
  goalCancelBtn.addEventListener('click', () => {
    goalForm.hidden = true;
    goalEditBtn.hidden = false;
  });
}

if (goalForm) {
  goalForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const rawValue = Number.parseInt(goalInput.value, 10);
    if (!Number.isInteger(rawValue) || rawValue <= 0) return;
    goalValue = rawValue;
    totalSlots = computeSlots(goalValue);
    localStorage.setItem(GOAL_STORAGE_KEY, String(goalValue));
    for (const v of checkedValues) {
      if (v > totalSlots) checkedValues.delete(v);
    }
    saveState();
    grid.innerHTML = '';
    buttonsByValue.clear();
    buildGrid();
    goalForm.hidden = true;
    goalEditBtn.hidden = false;
    updateTotal();
    updateSlotsInfo();
    updateSummary();
  });
}

buildGrid();
updateTotal();
updateSlotsInfo();
updateSummary();
updateManualStatus();
