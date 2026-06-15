const defaultState = {
  groupName: "グループ名",
  members: [],
  tasks: []
};

const storageKey = "task-scale-rough-v2";
const memberColors = ["#f4a5a1", "#86b6d8", "#d7b56d", "#91c7a8", "#b9a1d8", "#e39abf", "#93b7ad", "#c8a2a8"];
let state = loadState();

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

// localStorageからデータを読み込む
function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return clone(defaultState);

  try {
    const parsed = JSON.parse(saved);
    return {
      groupName: parsed.groupName || defaultState.groupName,
      members: Array.isArray(parsed.members) ? parsed.members : clone(defaultState.members),
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : clone(defaultState.tasks)
    };
  } catch {
    return clone(defaultState);
  }
}

// localStorageにデータを保存する
function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

// メンバーごとのタスクを抽出
function memberTasks(memberId) {
  return state.tasks.filter((task) => task.ownerId === memberId);
}

// メンバーごとの合計時間を計算
function memberHours(memberId) {
  return memberTasks(memberId).reduce((sum, task) => sum + Number(task.hours || 0), 0);
}

// 全体の合計時間を計算
function totalHours() {
  return state.tasks.reduce((sum, task) => sum + Number(task.hours || 0), 0);
}

// メンバーごとの仕事率（%）を計算
function memberPercent(memberId) {
  const total = totalHours();
  if (!total) return Math.round(100 / Math.max(state.members.length, 1));
  return Math.round((memberHours(memberId) / total) * 100);
}

// ==========================================
// 【追加機能】メンバーの削除（紐づくタスクも一括削除）
// ==========================================
function deleteMember(memberId) {
  const member = state.members.find(m => m.id === memberId);
  if (!member) return;

  if (confirm(`「${member.name}」と、このメンバーに紐づくすべてのタスクを削除しますか？`)) {
    // メンバーを一覧から除外
    state.members = state.members.filter((m) => m.id !== memberId);
    // 紐づいていたタスクも一緒に削除して計算の崩れを防ぐ
    state.tasks = state.tasks.filter((t) => t.ownerId !== memberId);
    
    saveState();
    renderRates(); // 画面を再描画
  }
}

// ==========================================
// 【追加機能】グループの削除（全データ初期化）
// ==========================================
function deleteGroup() {
  if (confirm("本当にグループを削除し、すべてのデータを初期化しますか？\nこの操作は取り消せません。")) {
    state = clone(defaultState);
    saveState();
    renderRates(); // 画面を再描画
  }
}

// main.html（仕事率画面）の描画処理
function renderRates() {
  const title = document.querySelector("#rateGroupName");
  const rateList = document.querySelector("#rateList");
  const totalWorkHours = document.querySelector("#totalWorkHours");
  
  if (!title || !rateList || !totalWorkHours) return;

  title.textContent = state.groupName;
  
  const total = totalHours();
  totalWorkHours.textContent = `${total}h`;

  rateList.innerHTML = state.members.length ? state.members.map((member, index) => {
    const percent = memberPercent(member.id);
    const hours = memberHours(member.id);
    const color = memberColors[index % memberColors.length];
    return `
      <article class="rate-card" style="--member-color:${color}; position: relative;">
        <button class="delete-member-btn" data-delete-member="${member.id}" aria-label="${member.name}を削除" style="position: absolute; top: 12px; right: 12px; background: none; border: none; color: #b3b3b3; cursor: pointer; font-size: 18px; padding: 0; line-height: 1;">×</button>
        
        <div class="rate-person">
          <span class="avatar large" aria-hidden="true"></span>
          <div class="rate-name-line">
            <strong>${member.name}</strong>
            <span>${hours}h</span>
          </div>
        </div>
        <div class="rate-meter">
          <div class="rate-meter-fill" style="width:${Math.max(4, percent)}%"></div>
        </div>
        <div class="rate-percent">
          <span>仕事率</span>
          <strong>${percent}%</strong>
        </div>
      </article>
    `;
  }).join("") : `<p class="empty-note">メンバーを追加すると仕事率が表示されます!</p>`;

  // ★動的に作成されたメンバー削除ボタンにクリックイベントをバインド
  document.querySelectorAll("[data-delete-member]").forEach((button) => {
    button.onclick = () => deleteMember(button.dataset.deleteMember);
  });
}

// 静的な要素（最初からHTMLにあるグループ削除ボタンなど）のイベントバインド
function bindEvents() {
  document.querySelector("#btnDeleteGroup")?.addEventListener("click", deleteGroup);
}

// ページ読み込み時に初期実行
bindEvents();
renderRates();