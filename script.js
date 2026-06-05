const canvas = document.querySelector("#wheelCanvas");
const ctx = canvas.getContext("2d");
const spinBtn = document.querySelector("#spinBtn");
const quickBtn = document.querySelector("#quickBtn");
const boxBtn = document.querySelector("#boxBtn");
const itemList = document.querySelector("#itemList");
const templateList = document.querySelector("#templateList");
const historyList = document.querySelector("#historyList");
const itemCount = document.querySelector("#itemCount");
const previewCount = document.querySelector("#previewCount");
const previewChips = document.querySelector("#previewChips");
const setNameInput = document.querySelector("#setNameInput");
const noRepeatToggle = document.querySelector("#noRepeatToggle");
const resultPanel = document.querySelector("#resultPanel");
const resultText = document.querySelector("#resultText");
const resultMeta = document.querySelector("#resultMeta");
const toast = document.querySelector("#toast");
const boxGrid = document.querySelector("#boxGrid");

const TAU = Math.PI * 2;
const STORAGE_KEY = "pickjoy-state-v2";
const palette = ["#ff6048", "#159a8b", "#4d73d9", "#f0b631", "#9a61d6", "#5b9e3d", "#ef7d45", "#2d9db0", "#d94f7b"];

const templates = [
  {
    name: "吃什么",
    title: "今天吃什么",
    items: ["火锅", "烧烤", "寿司", "面条", "汉堡", "米饭套餐", "轻食", "随便走进一家"]
  },
  {
    name: "去哪",
    title: "周末去哪",
    items: ["看电影", "逛公园", "找家咖啡店", "城市漫步", "在家做饭", "去书店", "拍照"]
  },
  {
    name: "谁来",
    title: "谁先来",
    items: ["我来", "你来", "左边的人", "右边的人", "年龄最小", "年龄最大"]
  },
  {
    name: "奖励",
    title: "今日奖励",
    items: ["奶茶", "电影", "打游戏 1 小时", "早点睡", "买个小东西", "散步"]
  },
  {
    name: "惩罚",
    title: "轻量惩罚",
    items: ["做 10 个深蹲", "讲一个冷笑话", "发一句夸夸", "收拾桌面", "真心话", "大冒险"]
  },
  {
    name: "学习",
    title: "学习任务抽取",
    items: ["背 20 个单词", "刷 10 道题", "复盘笔记", "读 15 分钟", "写一段总结", "休息 5 分钟"]
  }
];

let state = {
  title: "今天吃什么",
  mode: "wheel",
  noRepeat: false,
  rotation: 0,
  history: [],
  removedThisRound: [],
  items: templates[0].items.map((text) => ({ text, weight: 1 }))
};

let isPicking = false;

function normalizeAngle(angle) {
  return ((angle % TAU) + TAU) % TAU;
}

function cleanItems() {
  return state.items
    .map((item) => ({ text: String(item.text || "").trim(), weight: Math.max(1, Number(item.weight || 1)) }))
    .filter((item) => item.text);
}

function availableItems() {
  const usable = cleanItems();
  if (!state.noRepeat) return usable;

  const filtered = usable.filter((item) => !state.removedThisRound.includes(item.text));
  if (filtered.length >= 2) return filtered;

  state.removedThisRound = [];
  return usable;
}

function weightedPick(items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let ticket = Math.random() * total;

  for (let index = 0; index < items.length; index += 1) {
    ticket -= items[index].weight;
    if (ticket <= 0) return index;
  }

  return items.length - 1;
}

function getSegments(items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let angle = -Math.PI / 2;

  return items.map((item) => {
    const size = (item.weight / total) * TAU;
    const segment = {
      item,
      start: angle,
      end: angle + size,
      center: angle + size / 2
    };
    angle += size;
    return segment;
  });
}

function drawWheel() {
  const items = availableItems();
  const size = canvas.width;
  const center = size / 2;
  const radius = center - 34;

  ctx.clearRect(0, 0, size, size);

  ctx.save();
  ctx.translate(center, center);
  ctx.rotate(state.rotation);

  if (items.length < 2) {
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, TAU);
    ctx.fillStyle = "#fff5df";
    ctx.fill();
    ctx.lineWidth = 14;
    ctx.strokeStyle = "#1f2024";
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = "#746b5f";
    ctx.font = "800 36px Inter, Noto Sans SC, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("至少两个选项", center, center);
    return;
  }

  const segments = getSegments(items);

  segments.forEach((segment, index) => {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, segment.start, segment.end);
    ctx.closePath();
    ctx.fillStyle = palette[index % palette.length];
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = "#fffdf8";
    ctx.stroke();
  });

  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, TAU);
  ctx.lineWidth = 14;
  ctx.strokeStyle = "#1f2024";
  ctx.stroke();
  ctx.restore();

  // Draw labels after the wheel so every label remains horizontal and readable.
  segments.forEach((segment) => {
    const angle = segment.center + state.rotation;
    const x = center + Math.cos(angle) * radius * 0.6;
    const y = center + Math.sin(angle) * radius * 0.6;
    const label = segment.item.text.length > 8 ? `${segment.item.text.slice(0, 8)}...` : segment.item.text;

    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(31, 32, 36, 0.18)";
    roundedRect(ctx, -86, -22, 172, 44, 22);
    ctx.fill();
    ctx.fillStyle = "#fffdf8";
    ctx.font = "900 27px Inter, Noto Sans SC, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, 0, 1, 150);
    ctx.restore();
  });
}

function roundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    title: state.title,
    items: state.items,
    noRepeat: state.noRepeat,
    history: state.history.slice(0, 20)
  }));
}

function loadState() {
  const params = new URLSearchParams(location.search);
  const shared = params.get("set");

  if (shared) {
    try {
      const decoded = JSON.parse(decodeURIComponent(atob(shared)));
      if (Array.isArray(decoded.items) && decoded.items.length >= 2) {
        state.title = decoded.title || state.title;
        state.items = decoded.items.map((item) => ({
          text: String(item.text || "").slice(0, 28),
          weight: Math.max(1, Number(item.weight || 1))
        }));
        return;
      }
    } catch {
      showToast("分享链接读取失败，已打开默认模板");
    }
  }

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return;
    state = {
      ...state,
      title: saved.title || state.title,
      noRepeat: Boolean(saved.noRepeat),
      history: Array.isArray(saved.history) ? saved.history.slice(0, 20) : [],
      items: Array.isArray(saved.items) && saved.items.length >= 2 ? saved.items : state.items
    };
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function renderTemplates() {
  templateList.innerHTML = "";
  templates.forEach((template) => {
    const button = document.createElement("button");
    button.className = "template-btn";
    button.type = "button";
    button.textContent = template.name;
    button.addEventListener("click", () => applyTemplate(template));
    templateList.appendChild(button);
  });
}

function renderCounts() {
  const count = cleanItems().length;
  itemCount.textContent = `${count} 个选项`;
  previewCount.textContent = `${availableItems().length} 个`;
}

function renderItems() {
  renderCounts();
  setNameInput.value = state.title;
  noRepeatToggle.checked = state.noRepeat;
  itemList.innerHTML = "";

  state.items.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "item-row";
    row.innerHTML = `
      <input type="text" value="${escapeHtml(item.text)}" aria-label="选项 ${index + 1}">
      <input type="number" value="${Number(item.weight || 1)}" min="1" max="99" aria-label="权重 ${index + 1}">
      <button class="delete-btn" type="button" aria-label="删除选项 ${index + 1}">×</button>
    `;

    const [textInput, weightInput] = row.querySelectorAll("input");
    textInput.addEventListener("input", () => {
      state.items[index].text = textInput.value.slice(0, 28);
      state.removedThisRound = [];
      saveState();
      renderNonEditor();
    });
    weightInput.addEventListener("input", () => {
      state.items[index].weight = Math.max(1, Math.min(99, Number(weightInput.value || 1)));
      saveState();
      renderNonEditor();
    });
    row.querySelector("button").addEventListener("click", () => deleteItem(index));
    itemList.appendChild(row);
  });
}

function renderPreview() {
  previewChips.innerHTML = "";
  availableItems().forEach((item) => {
    const chip = document.createElement("span");
    chip.className = "preview-chip";
    chip.textContent = item.weight > 1 ? `${item.text} ×${item.weight}` : item.text;
    previewChips.appendChild(chip);
  });
}

function renderHistory() {
  historyList.innerHTML = "";
  if (!state.history.length) {
    const empty = document.createElement("li");
    empty.textContent = "还没有结果";
    historyList.appendChild(empty);
    return;
  }

  state.history.slice(0, 8).forEach((entry) => {
    const item = document.createElement("li");
    item.textContent = entry;
    historyList.appendChild(item);
  });
}

function renderBoxes(revealedWinner = "") {
  const items = availableItems();
  boxGrid.innerHTML = "";
  items.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = `mystery-card ${revealedWinner ? "" : "is-hidden"}`;
    if (item.text === revealedWinner) card.classList.add("is-winner");
    card.dataset.index = String(index);
    card.innerHTML = `<span>盲盒 ${index + 1}</span><strong>${escapeHtml(item.text)}</strong>`;
    boxGrid.appendChild(card);
  });
}

function renderMode() {
  document.querySelectorAll(".mode-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === state.mode);
  });
  document.querySelectorAll("[data-view]").forEach((view) => {
    view.classList.toggle("hidden", view.dataset.view !== state.mode);
  });
}

function renderNonEditor() {
  renderCounts();
  renderPreview();
  renderBoxes();
  drawWheel();
}

function renderDynamic() {
  renderNonEditor();
}

function renderAll() {
  renderMode();
  renderItems();
  renderPreview();
  renderBoxes();
  drawWheel();
  renderHistory();
}

function applyTemplate(template) {
  state.title = template.title;
  state.items = template.items.map((text) => ({ text, weight: 1 }));
  state.history = [];
  state.removedThisRound = [];
  state.rotation = 0;
  setResult("还没抽", `${template.title} 已载入。`, true);
  showToast(`已切换到「${template.title}」`);
  saveState();
  renderAll();
}

function deleteItem(index) {
  if (state.items.length <= 2) {
    showToast("至少保留两个选项");
    return;
  }
  state.items.splice(index, 1);
  state.removedThisRound = [];
  saveState();
  renderAll();
}

function addItem() {
  state.items.push({ text: `新选项 ${state.items.length + 1}`, weight: 1 });
  state.removedThisRound = [];
  saveState();
  renderAll();
  itemList.lastElementChild?.querySelector("input")?.focus();
}

function spinWheel() {
  const items = availableItems();
  if (isPicking || items.length < 2) {
    showToast("至少需要两个可用选项");
    return;
  }

  isPicking = true;
  spinBtn.disabled = true;
  quickBtn.disabled = true;
  setResult("转动中...", "等它停下来，不会马上弹窗。", true);

  const winnerIndex = weightedPick(items);
  const segment = getSegments(items)[winnerIndex];
  const desiredRotation = normalizeAngle(-Math.PI / 2 - segment.center);
  const currentNorm = normalizeAngle(state.rotation);
  const delta = normalizeAngle(desiredRotation - currentNorm);
  const start = state.rotation;
  const end = state.rotation + delta + TAU * (6 + Math.floor(Math.random() * 3));
  const duration = 4200;
  const startedAt = performance.now();

  function tick(now) {
    const progress = Math.min(1, (now - startedAt) / duration);
    const eased = 1 - Math.pow(1 - progress, 4.2);
    state.rotation = start + (end - start) * eased;
    drawWheel();

    if (progress < 1) {
      requestAnimationFrame(tick);
      return;
    }

    state.rotation = normalizeAngle(end);
    isPicking = false;
    spinBtn.disabled = false;
    quickBtn.disabled = false;
    drawWheel();
    finishPick(items[winnerIndex].text, "转盘");
  }

  requestAnimationFrame(tick);
}

function quickPick() {
  const items = availableItems();
  if (isPicking || items.length < 2) {
    showToast("至少需要两个可用选项");
    return;
  }

  isPicking = true;
  spinBtn.disabled = true;
  quickBtn.disabled = true;
  const winner = items[weightedPick(items)].text;
  let frame = 0;
  const totalFrames = 26;

  const timer = setInterval(() => {
    const item = items[frame % items.length];
    setResult(item.text, "快抽滚动中...", true);
    frame += 1;

    if (frame >= totalFrames) {
      clearInterval(timer);
      isPicking = false;
      spinBtn.disabled = false;
      quickBtn.disabled = false;
      finishPick(winner, "快抽");
    }
  }, 70);
}

function boxPick() {
  const items = availableItems();
  if (isPicking || items.length < 2) {
    showToast("至少需要两个可用选项");
    return;
  }

  isPicking = true;
  boxBtn.disabled = true;
  renderBoxes();
  const winnerIndex = weightedPick(items);
  let frame = 0;
  const totalFrames = 34;

  const timer = setInterval(() => {
    document.querySelectorAll(".mystery-card").forEach((card) => card.classList.remove("is-active"));
    const active = document.querySelector(`.mystery-card[data-index="${frame % items.length}"]`);
    active?.classList.add("is-active");
    frame += 1;

    if (frame >= totalFrames) {
      clearInterval(timer);
      isPicking = false;
      boxBtn.disabled = false;
      renderBoxes(items[winnerIndex].text);
      finishPick(items[winnerIndex].text, "盲盒");
    }
  }, 76);
}

function finishPick(value, source) {
  state.history.unshift(value);
  state.history = state.history.slice(0, 20);

  if (state.noRepeat && !state.removedThisRound.includes(value)) {
    state.removedThisRound.push(value);
  }

  setResult(value, `${state.title} · ${source}抽取`, false);
  saveState();
  renderHistory();
  renderPreview();
  drawWheel();
  playPop();
}

function setResult(value, meta, empty) {
  resultText.textContent = value;
  resultMeta.textContent = meta;
  resultPanel.classList.toggle("empty", Boolean(empty));
  resultPanel.classList.remove("flash");
  void resultPanel.offsetWidth;
  resultPanel.classList.add("flash");
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast("已复制");
  } catch {
    showToast("复制失败，可以手动选中复制");
  }
}

function shareCurrentSet() {
  const payload = {
    title: state.title,
    items: cleanItems().map((item) => ({
      text: item.text,
      weight: item.weight
    }))
  };
  const encoded = btoa(encodeURIComponent(JSON.stringify(payload)));
  const url = `${location.origin}${location.pathname}?set=${encoded}`;
  copyText(url);
}

function resetAll() {
  applyTemplate(templates[0]);
  showToast("已重置");
}

function surpriseTemplate() {
  const next = templates[Math.floor(Math.random() * templates.length)];
  applyTemplate(next);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 1700);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function playPop() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audio = new AudioContext();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(360, audio.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(760, audio.currentTime + 0.16);
    gain.gain.setValueAtTime(0.0001, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.13, audio.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.2);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.22);
  } catch {
    // Sound is optional.
  }
}

document.querySelectorAll(".mode-btn").forEach((button) => {
  button.addEventListener("click", () => {
    state.mode = button.dataset.mode;
    renderAll();
  });
});

setNameInput.addEventListener("input", () => {
  state.title = setNameInput.value.slice(0, 24) || "未命名抽奖盘";
  saveState();
});

noRepeatToggle.addEventListener("change", () => {
  state.noRepeat = noRepeatToggle.checked;
  state.removedThisRound = [];
  saveState();
  renderNonEditor();
});

document.querySelector("#addItemBtn").addEventListener("click", addItem);
document.querySelector("#resetBtn").addEventListener("click", resetAll);
document.querySelector("#surpriseBtn").addEventListener("click", surpriseTemplate);
document.querySelector("#shareBtn").addEventListener("click", shareCurrentSet);
document.querySelector("#clearHistoryBtn").addEventListener("click", () => {
  state.history = [];
  saveState();
  renderHistory();
});
spinBtn.addEventListener("click", spinWheel);
quickBtn.addEventListener("click", quickPick);
boxBtn.addEventListener("click", boxPick);

loadState();
renderTemplates();
renderAll();
