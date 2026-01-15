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
const depositInput = document.getElementById('deposit-input');
const suggestionForm = document.getElementById('suggestion-form');
const suggestionResult = document.getElementById('suggestion-result');
const applySuggestionButton = document.getElementById('apply-suggestion');

const checkedValues = new Set(loadState());
const buttonsByValue = new Map();
let activeSuggestion = null;

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

  for (let value = 1; value <= TOTAL_SLOTS; value += 1) {
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

function updateSuggestionHighlights(picks) {
  buttonsByValue.forEach((button) => {
    button.classList.remove('is-suggested');
  });

  if (!Array.isArray(picks)) {
    return;
  }

  picks.forEach((value) => {
    const button = buttonsByValue.get(value);
    if (button) {
      button.classList.add('is-suggested');
    }
  });
}

function renderSuggestionMessage(message, variant = 'neutral') {
  if (!suggestionResult) {
    return;
  }
  suggestionResult.textContent = message;
  suggestionResult.classList.toggle('is-success', variant === 'success');
  suggestionResult.classList.toggle('is-error', variant === 'error');
}

function renderActiveSuggestion(value, picks) {
  if (!suggestionResult) {
    return;
  }

  const chips = picks
    .map((pick) => `<span class="chip">${pick}</span>`)
    .join('');

  suggestionResult.innerHTML = `
    <div><strong>${picks.length}</strong> marcações para ${formatCurrency(value)}.</div>
    <div class="suggestion__meta">
      <span>Combinação: ${picks.join(' + ')} = ${formatCurrency(value)}</span>
    </div>
    <div class="suggestion__picks">${chips}</div>
  `;
  suggestionResult.classList.add('is-success');
  suggestionResult.classList.remove('is-error');
}

function clearSuggestion(reason, variant) {
  activeSuggestion = null;
  applySuggestionButton.disabled = true;
  updateSuggestionHighlights([]);
  const type = variant || (reason ? 'error' : 'neutral');
  renderSuggestionMessage(
    reason || 'Nenhuma sugestão ativa. Informe um valor e clique em “Sugerir números”.',
    type,
  );
}

function reconstructPath(prev, sum) {
  const picks = [];
  let current = sum;

  while (current > 0 && prev[current]) {
    const { prevSum, number } = prev[current];
    picks.push(number);
    current = prevSum;
  }

  return picks.reverse();
}

function suggestNumbersForDeposit(markedSet, depositValue) {
  if (!Number.isInteger(depositValue) || depositValue <= 0) {
    return { ok: false, picks: [], reason: 'Informe um valor inteiro maior que zero.' };
  }

  const available = [];
  for (let value = 1; value <= TOTAL_SLOTS; value += 1) {
    if (!markedSet.has(value)) {
      available.push(value);
    }
  }

  const availableSum = available.reduce((total, value) => total + value, 0);
  if (depositValue > availableSum) {
    return {
      ok: false,
      picks: [],
      reason: 'Valor maior que a soma dos números disponíveis.',
    };
  }

  const dp = new Array(depositValue + 1).fill(Infinity);
  const maxUsed = new Array(depositValue + 1).fill(Infinity);
  const prev = new Array(depositValue + 1).fill(null);

  dp[0] = 0; // quantidade
  maxUsed[0] = 0; // maior número usado (queremos minimizar)

  const isLexicographicallyBetter = (currentSum, candidatePrevSum, candidateNumber) => {
    if (dp[currentSum] === Infinity) {
      return true;
    }

    const currentPath = reconstructPath(prev, currentSum);
    const candidatePath = reconstructPath(prev, candidatePrevSum);
    candidatePath.push(candidateNumber);

    const len = Math.min(currentPath.length, candidatePath.length);
    for (let i = 0; i < len; i += 1) {
      if (candidatePath[i] !== currentPath[i]) {
        return candidatePath[i] < currentPath[i];
      }
    }
    return candidatePath.length < currentPath.length;
  };

  for (const value of available) {
    for (let sum = depositValue; sum >= value; sum -= 1) {
      if (dp[sum - value] === Infinity) {
        continue;
      }

      const candCount = dp[sum - value] + 1;
      const candMax = Math.max(maxUsed[sum - value], value);
      const shouldReplace =
        candMax < maxUsed[sum] ||
        (candMax === maxUsed[sum] && candCount < dp[sum]) ||
        (candMax === maxUsed[sum] &&
          candCount === dp[sum] &&
          isLexicographicallyBetter(sum, sum - value, value));

      if (shouldReplace) {
        dp[sum] = candCount;
        maxUsed[sum] = candMax;
        prev[sum] = { prevSum: sum - value, number: value };
      }
    }
  }

  if (dp[depositValue] === Infinity) {
    return {
      ok: false,
      picks: [],
      reason: 'Não existe combinação possível com os números disponíveis.',
    };
  }

  const picks = reconstructPath(prev, depositValue);
  return { ok: true, picks };
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

  if (activeSuggestion && activeSuggestion.picks.includes(value)) {
    clearSuggestion('Sugestão removida porque um número sugerido foi alterado.', 'neutral');
  }
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

if (suggestionForm) {
  suggestionForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!depositInput) {
      return;
    }
    const rawValue = Number.parseInt(depositInput.value, 10);

    const result = suggestNumbersForDeposit(checkedValues, rawValue);
    if (!result.ok) {
      clearSuggestion(result.reason);
      return;
    }

    activeSuggestion = { value: rawValue, picks: result.picks };
    applySuggestionButton.disabled = false;
    updateSuggestionHighlights(result.picks);
    renderActiveSuggestion(rawValue, result.picks);
  });
}

if (applySuggestionButton) {
  applySuggestionButton.addEventListener('click', () => {
    if (!activeSuggestion || !activeSuggestion.picks.length) {
      return;
    }

    activeSuggestion.picks.forEach((value) => {
      if (!checkedValues.has(value)) {
        checkedValues.add(value);
        setButtonChecked(value, true);
      }
    });

    saveState();
    updateSummary();
    updateSuggestionHighlights([]);
    renderSuggestionMessage('Sugeridos marcados com sucesso.', 'success');
    activeSuggestion = null;
    applySuggestionButton.disabled = true;
  });
}

buildGrid();
updateTotal();
updateSummary();
