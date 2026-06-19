const defaultState = {
  groupName: "グループ名",
  members: [],
  tasks: []
};

const storageKey = "task-scale-rough-v2";
let state = loadState();

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

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

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

// 編集画面内でのメンバー追加用に定義
function addMember(name = "") {
  const cleanName = name.trim() || `name${state.members.length + 1}`;
  state.members.push({ id: uid("m"), name: cleanName });
  saveState();
  renderEdit();
}

function uid(prefix) {
  if (window.crypto?.randomUUID) return crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function memberTasks(memberId) {
  return state.tasks.filter((task) => task.ownerId === memberId);
}

function addTask(ownerId, name, hours) {
  if (!ownerId) return;
  state.tasks.push({
    id: uid("t"),
    ownerId,
    name: name.trim() || "タスク",
    hours: Number(hours) || 1
  });
  saveState();
  renderEdit();
}

function renderEdit() {
  const editList = document.querySelector("#editMemberList");
  if (!editList) return;

  editList.innerHTML = state.members.length ? state.members.map((member) => {
    const tasks = memberTasks(member.id);
    return `
      <article class="edit-row">
        <div class="edit-person">
          <span class="avatar large" aria-hidden="true"></span>
          <strong>${member.name}</strong>
        </div>
        <div class="task-board">
          <form class="task-input-row" data-task-form="${member.id}">
            <input class="task-name-input" name="taskName" type="text" placeholder="タスク名" required>
            <input class="task-hour-input" name="taskHours" type="number" min="1" step="1" value="1" aria-label="時間">
            <button class="mini-button" type="submit">追加</button>
          </form>
          <div class="task-list">
            ${tasks.map((task) => `
              <div class="task-pill">
                <span>${task.name}</span>
                <span>${task.hours}h</span>
                <button data-delete-task="${task.id}" type="button" aria-label="${task.name}を削除">×</button>
              </div>
            `).join("")}
          </div>
        </div>
      </article>
    `;
  }).join("") : `<p class="empty-note">先にグループ作成ページでメンバーを追加してください。</p>`;

  document.querySelectorAll("[data-task-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      addTask(form.dataset.taskForm, String(formData.get("taskName")), Number(formData.get("taskHours")));
    });
  });

  document.querySelectorAll("[data-delete-task]").forEach((button) => {
    button.addEventListener("click", () => {
      state.tasks = state.tasks.filter((task) => task.id !== button.dataset.deleteTask);
      saveState();
      renderEdit();
    });
  });
}

function bindEvents() {
  document.querySelectorAll("[data-member-add-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      addMember(String(formData.get("memberName")));
      form.reset();
    });
  });
}

bindEvents();
renderEdit();
