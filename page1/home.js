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

function uid(prefix) {
  if (window.crypto?.randomUUID) return crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function syncGroupName(value) {
  state.groupName = value.trim() || "グループ名";
  saveState();
  renderHome();
}

function addMember(name = "") {
  const cleanName = name.trim() || `name${state.members.length + 1}`;
  state.members.push({ id: uid("m"), name: cleanName });
  saveState();
  renderHome();
}

function renameMember(memberId, name) {
  const member = state.members.find((item) => item.id === memberId);
  if (!member) return;
  member.name = name.trim() || member.name;
  saveState();
  renderHome();
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
      <a class="group-card" href="../page2/main.html">
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

bindEvents();
renderHome();
