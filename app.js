const STORAGE_KEY = "map-memo-items";

const map = L.map("map").setView([35.681236, 139.767125], 13);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

const memoList = document.getElementById("memo-list");
const memoDialog = document.getElementById("memo-dialog");
const memoForm = document.getElementById("memo-form");
const memoText = document.getElementById("memo-text");
const selectedPosition = document.getElementById("selected-position");
const cancelBtn = document.getElementById("cancel-btn");

let memos = loadMemos();
let markerLayer = L.layerGroup().addTo(map);
let pendingLatLng = null;

render();

map.on("click", (e) => {
  pendingLatLng = e.latlng;
  selectedPosition.textContent = `緯度: ${e.latlng.lat.toFixed(5)}, 経度: ${e.latlng.lng.toFixed(5)}`;
  memoText.value = "";
  memoDialog.showModal();
  memoText.focus();
});

cancelBtn.addEventListener("click", () => {
  memoDialog.close();
});

memoForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!pendingLatLng) return;

  const text = memoText.value.trim();
  if (!text) return;

  const newMemo = {
    id: crypto.randomUUID(),
    text,
    lat: pendingLatLng.lat,
    lng: pendingLatLng.lng,
    createdAt: new Date().toISOString(),
  };

  memos.unshift(newMemo);
  saveMemos(memos);
  memoDialog.close();
  pendingLatLng = null;
  render();
});

memoList.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  const { action, id } = target.dataset;
  if (action === "delete" && id) {
    memos = memos.filter((memo) => memo.id !== id);
    saveMemos(memos);
    render();
  }

  if (action === "focus" && id) {
    const memo = memos.find((item) => item.id === id);
    if (memo) {
      map.setView([memo.lat, memo.lng], 16);
    }
  }
});

function render() {
  markerLayer.clearLayers();

  memos.forEach((memo) => {
    const marker = L.marker([memo.lat, memo.lng]).addTo(markerLayer);
    marker.bindPopup(`<strong>メモ</strong><br>${escapeHtml(memo.text)}`);
  });

  memoList.innerHTML = memos
    .map(
      (memo) => `
      <li class="memo-item">
        <p>${escapeHtml(memo.text)}</p>
        <div class="memo-meta">${formatDate(memo.createdAt)} / ${memo.lat.toFixed(5)}, ${memo.lng.toFixed(5)}</div>
        <div class="memo-actions">
          <button data-action="focus" data-id="${memo.id}">地図で見る</button>
          <button data-action="delete" data-id="${memo.id}">削除</button>
        </div>
      </li>`
    )
    .join("");

  if (memos.length === 0) {
    memoList.innerHTML = "<li>まだメモがありません。地図をクリックして追加してください。</li>";
  }
}

function loadMemos() {
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

function saveMemos(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function formatDate(isoString) {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
