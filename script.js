const canvas = document.querySelector("#wheelCanvas");
const ctx = canvas.getContext("2d");
const spinBtn = document.querySelector("#spinBtn");
const itemList = document.querySelector("#itemList");
const templateList = document.querySelector("#templateList");
const historyList = document.querySelector("#historyList");
const itemCount = document.querySelector("#itemCount");
const setNameInput = document.querySelector("#setNameInput");
const noRepeatToggle = document.querySelector("#noRepeatToggle");
const resultDialog = document.querySelector("#resultDialog");
const resultText = document.querySelector("#resultText");
const resultMeta = document.querySelector("#resultMeta");
const toast = document.querySelector("#toast");
const cardGrid = document.querySelector(".card-grid");
const diceBtn = document.querySelector("#diceBtn");

const TAU = Math.PI * 2;
const STORAGE_KEY = "pickjoy-state-v1";
const palette = ["#ff5a3d", "#1d9a8a", "#4f73d9", "#f0b631", "#a05bd8", "#5c9d3b", "#ef7d45", "#2f9fb3"];

const templates = [
  {
    name: "吃什么",
    title: "今天吃什么",
    items: ["火锅", "烧烤", "寿司", "面条", "汉堡", "米饭套餐", "轻食", "随便走进一家"]
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
  },
  {
    name: "周末",
    title: "周末去哪",
    items: ["看电影", "逛公园", "找家咖啡店", "城市漫步", "在家做饭", "去书店", "拍照"]
  }
];

let state = {
  title: "选择困难破解器",
  mode: "wheel",
  noRepeat: false,
  rotation: 0,
  history: [],
  removedThisRound: [],
  items: templates[0].items.map((text) => ({ text, weight: 1 }))
};

let isSpinning = false;
let activeResult = "";

function normalizeAngle(angle) {
  return ((angle % TAU) + TAU) % TAU;
}

function weightedPick(items) {
  const total = items.reduce((sum, item) => sum + Number(item.weight || 1), 0);
  let ticket = Math.random() * total;

  for (let index = 0; index < items.length; index += 1) {
    ticket -= Number(items[index].weight || 1);
    if (ticket <= 0) return index;
  }

  return items.length - 1;
}

function visibleItems() {
  const usable = state.items.filter((item) => item.text.trim());
  if (!state.noRepeat) return usable;

  const filtered = usable.filter((item) => !state.removedThisRound.includes(item.text));
  if (filtered.length >= 2) return filtered;

  state.removedThisRound = [];
  return usable;
}

function getSegments(items) {
  const total = items.reduce((sum, item) => sum + Number(item.weight || 1), 0);
  let angle = -Math.PI / 2;

  return items.map((item, index) => {
    const size = (Number(item.weight || 1) / total) * TAU;
    const segment = {
      item,
      index,
      start: angle,
      end: angle + size,
      center: angle + size / 2
    };
    angle += size;
    return segment;
  });
}

function drawWheel() {
  const items = visibleItems();
  const size = canvas.width;
  const center = size / 2;
  const radius = center - 24;

  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(center, center);
  ctx.rotate(state.rotation);

  if (items.length < 2) {
    ctx.fillStyle = "#fff5dc";
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#6b6258";
    ctx.font = "700 34px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("至少需要两个选项", 0, 10);
    ctx.restore();
    return;
  }

  getSegments(items).forEach((segment, index) => {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, segment.start, segment.end);
    ctx.closePath();
    ctx.fillStyle = palette[index % palette.length];
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = "#fffaf1";
    ctx.stroke();

    ctx.save();
    ctx.rotate(segment.center);
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fffaf1";
    ctx.font = "800 32px Inter, Noto Sans SC, sans-serif";
    const label = segment.item.text.length > 9 ? `${segment.item.text.slice(0, 9)}...` : segment.item.text;
    ctx.fillText(label, radius - 34, 0);
    ctx.restore();
  });

  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, TAU);
  ctx.lineWidth = 12;
  ctx.strokeStyle = "#202124";
  ctx.stroke();
  ctx.restore();
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    title: state.title,
    items: state.items,
    noRepeat: state.noRepeat,
    history: state.history.slice(0, 12)
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
      history: Array.isArray(saved.history) ? saved.history.slice(0, 12) : [],
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

function renderItems() {
  const cleanCount = state.items.filter((item) => item.text.trim()).length;
  itemCount.textContent = `${cleanCount} 个选项`;
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
      drawWheel();
      renderCards();
      saveState();
    });
    weightInput.addEventListener("input", () => {
      state.items[index].weight = Math.max(1, Math.min(99, Number(weightInput.value || 1)));
      drawWheel();
      saveState();
    });
    row.querySelector("button").addEventListener("click", () => deleteItem(index));
    itemList.appendChild(row);
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

function renderCards() {
  const items = visibleItems();
  cardGrid.innerHTML = "";
  items.forEach((item) => {
    const card = document.createElement("button");
    card.className = "choice-card";
    card.type = "button";
    card.textContent = item.text;
    card.addEventListener("click", () => {
      card.classList.add("revealed");
      finishPick(item.text, "翻牌抽取");
    });
    cardGrid.appendChild(card);
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

function renderAll() {
  renderMode();
  renderItems();
  renderHistory();
  renderCards();
  drawWheel();
}

function applyTemplate(template) {
  state.title = template.title;
  state.items = template.items.map((text) => ({ text, weight: 1 }));
  state.history = [];
  state.removedThisRound = [];
  state.rotation = 0;
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
  const items = visibleItems();
  if (isSpinning || items.length < 2) {
    showToast("至少需要两个可用选项");
    return;
  }

  isSpinning = true;
  spinBtn.disabled = true;

  const winnerIndex = weightedPick(items);
  const segment = getSegments(items)[winnerIndex];
  const desiredRotation = normalizeAngle(-Math.PI / 2 - segment.center);
  const currentNorm = normalizeAngle(state.rotation);
  const delta = normalizeAngle(desiredRotation - currentNorm);
  const start = state.rotation;
  const end = state.rotation + delta + TAU * (5 + Math.floor(Math.random() * 3));
  const duration = 3800;
  const startedAt = performance.now();

  function tick(now) {
    const progress = Math.min(1, (now - startedAt) / duration);
    const eased = 1 - Math.pow(1 - progress, 4);
    state.rotation = start + (end - start) * eased;
    drawWheel();

    if (progress < 1) {
      requestAnimationFrame(tick);
      return;
    }

    state.rotation = normalizeAngle(end);
    isSpinning = false;
    spinBtn.disabled = false;
    drawWheel();
    finishPick(items[winnerIndex].text, "转盘抽取");
  }

  requestAnimationFrame(tick);
}

function quickPick(source) {
  const items = visibleItems();
  if (items.length < 2) {
    showToast("至少需要两个可用选项");
    return;
  }
  const winner = items[weightedPick(items)].text;
  diceBtn.textContent = String(Math.max(1, Math.ceil(Math.random() * 6)));
  finishPick(winner, source);
}

function finishPick(value, source) {
  activeResult = value;
  state.history.unshift(value);
  state.history = state.history.slice(0, 20);
  if (state.noRepeat && !state.removedThisRound.includes(value)) {
    state.removedThisRound.push(value);
  }
  resultText.textContent = value;
  resultMeta.textContent = `${state.title} · ${source}`;
  saveState();
  renderHistory();
  renderCards();
  drawWheel();
  playPop();
  openDialog();
}

function openDialog() {
  if (typeof resultDialog.showModal === "function") {
    resultDialog.showModal();
  } else {
    showToast(`抽中了：${activeResult}`);
  }
}

function closeDialog() {
  if (resultDialog.open) resultDialog.close();
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
    items: state.items.filter((item) => item.text.trim()).map((item) => ({
      text: item.text.trim(),
      weight: Number(item.weight || 1)
    }))
  };
  const encoded = btoa(encodeURIComponent(JSON.stringify(payload)));
  const url = `${location.origin}${location.pathname}?set=${encoded}`;
  copyText(url);
}

function resetAll() {
  applyTemplate(templates[0]);
  showToast("已重置为默认盘");
}

function surpriseTemplate() {
  const next = templates[Math.floor(Math.random() * templates.length)];
  applyTemplate(next);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 1800);
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
    oscillator.frequency.setValueAtTime(440, audio.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(780, audio.currentTime + 0.12);
    gain.gain.setValueAtTime(0.0001, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.16, audio.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.18);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.2);
  } catch {
    // Audio is optional. Some browsers block it until direct user input.
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
  renderAll();
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
document.querySelector("#againBtn").addEventListener("click", () => {
  closeDialog();
  state.mode === "wheel" ? spinWheel() : quickPick("快速抽取");
});
document.querySelector("#copyResultBtn").addEventListener("click", () => copyText(activeResult));
document.querySelector("#closeDialogBtn").addEventListener("click", closeDialog);
spinBtn.addEventListener("click", spinWheel);
diceBtn.addEventListener("click", () => quickPick("骰子抽取"));

loadState();
renderTemplates();
renderAll();
