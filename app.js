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

function uid(prefix) {
  if (window.crypto?.randomUUID) return crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function memberTasks(memberId) {
  return state.tasks.filter((task) => task.ownerId === memberId);
}

function memberHours(memberId) {
  return memberTasks(memberId).reduce((sum, task) => sum + Number(task.hours || 0), 0);
}

function totalHours() {
  return state.tasks.reduce((sum, task) => sum + Number(task.hours || 0), 0);
}

function memberPercent(memberId) {
  const total = totalHours();
  if (!total) return Math.round(100 / Math.max(state.members.length, 1));
  return Math.round((memberHours(memberId) / total) * 100);
}

function syncGroupName(value) {
  state.groupName = value.trim() || "グループ名";
  saveState();
  renderAll();
}

function addMember(name = "") {
  const cleanName = name.trim() || `name${state.members.length + 1}`;
  state.members.push({ id: uid("m"), name: cleanName });
  saveState();
  renderAll();
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
  renderAll();
}

function renameMember(memberId, name) {
  const member = state.members.find((item) => item.id === memberId);
  if (!member) return;
  member.name = name.trim() || member.name;
  saveState();
  renderAll();
}

function renderHome() {
  const panelGroupName = document.querySelector("#panelGroupName");
  const memberList = document.querySelector("#homeMemberList");
  const groupCards = document.querySelector("#homeGroupCards");
  if (!panelGroupName || !memberList) return;

  panelGroupName.value = state.groupName === "グループ名" ? "" : state.groupName;

  if (groupCards) {
    const hasGroup = state.groupName !== "グループ名" || state.members.length > 0 || state.tasks.length > 0;
    groupCards.innerHTML = hasGroup ? `
      <a class="group-card" href="main.html">
        <span class="group-card-dot" aria-hidden="true"></span>
        <span>
          <strong>${state.groupName}</strong>
          <small>${state.members.length}人 / ${state.tasks.length}タスク</small>
        </span>
      </a>
    ` : "";
  }

  memberList.innerHTML = state.members.length
    ? state.members.map((member) => `
    <div class="member-line">
      <span class="avatar" aria-hidden="true"></span>
      <input class="member-name-input" data-member-name="${member.id}" value="${member.name}" aria-label="${member.name}の名前">
    </div>
  `).join("")
    : `<p class="empty-note">メンバーを追加してください</p>`;

  document.querySelectorAll("[data-member-name]").forEach((input) => {
    input.addEventListener("change", () => renameMember(input.dataset.memberName, input.value));
  });
}

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
      <article class="rate-card" style="--member-color:${color}">
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
  }).join("") : `<p class="empty-note">メンバーを追加すると仕事率が表示されます。</p>`;
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
      renderAll();
    });
  });
}

function bindEvents() {
  document.querySelector("#panelGroupName")?.addEventListener("input", (event) => {
    syncGroupName(event.target.value);
  });

  document.querySelector("#openCreatePanel")?.addEventListener("click", () => {
    const panel = document.querySelector("#createPanel");
    panel?.classList.toggle("is-open");
    panel?.setAttribute("aria-hidden", panel.classList.contains("is-open") ? "false" : "true");
  });

  document.querySelector("#addMemberLine")?.addEventListener("click", () => addMember());

  document.querySelector("#homeMemberForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = document.querySelector("#newMemberName");
    addMember(input.value);
    input.value = "";
  });

  document.querySelectorAll("[data-member-add-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      addMember(String(formData.get("memberName")));
      form.reset();
    });
  });

}

function renderAll() {
  renderHome();
  renderRates();
  renderEdit();
}

bindEvents();
renderAll();
