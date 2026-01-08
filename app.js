const TOTAL_SLOTS = 110;
const TOTAL_SUM = (TOTAL_SLOTS * (TOTAL_SLOTS + 1)) / 2;
const STORAGE_KEY = 'poupancaChecks';

const grid = document.getElementById('grid');
const savedValue = document.getElementById('saved-value');
const remainingValue = document.getElementById('remaining-value');
const savedCount = document.getElementById('saved-count');
const remainingCount = document.getElementById('remaining-count');
const totalValue = document.getElementById('total-value');
const progressBar = document.getElementById('progress-bar');
const progressLabel = document.getElementById('progress-label');

const checkedValues = new Set(loadState());

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
    return parsed.filter((value) => Number.isInteger(value) && value >= 1 && value <= TOTAL_SLOTS);
  } catch (error) {
    return [];
  }
}

function saveState() {
  const list = Array.from(checkedValues).sort((a, b) => a - b);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function buildGrid() {
  const fragment = document.createDocumentFragment();

  for (let value = 1; value <= TOTAL_SLOTS; value += 1) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = value;
    button.dataset.value = String(value);
    button.setAttribute('role', 'listitem');
    button.style.setProperty('--delay', `${value * 8}ms`);

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
  const remaining = TOTAL_SUM - saved;
  const checkedCount = checkedValues.size;
  const remainingCountValue = TOTAL_SLOTS - checkedCount;
  const percent = Math.round((saved / TOTAL_SUM) * 100);

  savedValue.textContent = formatCurrency(saved);
  remainingValue.textContent = formatCurrency(remaining);
  savedCount.textContent = `${checkedCount}/${TOTAL_SLOTS} marcados`;
  remainingCount.textContent = `${remainingCountValue} valores restantes`;
  progressBar.style.width = `${percent}%`;
  progressLabel.textContent = `${percent}%`;
}

function updateTotal() {
  totalValue.textContent = formatCurrency(TOTAL_SUM);
}

function toggleValue(value) {
  if (checkedValues.has(value)) {
    checkedValues.delete(value);
  } else {
    checkedValues.add(value);
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
  target.classList.toggle('is-checked');
  target.setAttribute('aria-pressed', target.classList.contains('is-checked') ? 'true' : 'false');
});

buildGrid();
updateTotal();
updateSummary();
