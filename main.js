var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => GoalTrackerPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  goalsFolder: "Goals"
};
var GT_VIEW_TYPE = "gt-sidebar-view";
function today() {
  return new Date().toISOString().split("T")[0];
}
async function ensureFolder(app, folderPath) {
  const normalized = (0, import_obsidian.normalizePath)(folderPath);
  if (!app.vault.getAbstractFileByPath(normalized)) {
    await app.vault.createFolder(normalized);
  }
}
function parseFrontmatter(content) {
  const fm = {};
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match)
    return fm;
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1)
      continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    fm[key] = val;
  }
  return fm;
}
var NewGoalModal = class extends import_obsidian.Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "New Goal" });
    let title = "";
    let category = "personal";
    let targetDate = today();
    let why = "";
    let successCriteria = "";
    new import_obsidian.Setting(contentEl).setName("Title").addText((t) => {
      t.setPlaceholder("e.g. Run a 5K").onChange((v) => title = v);
    });
    new import_obsidian.Setting(contentEl).setName("Category").addDropdown((d) => {
      d.addOption("personal", "Personal");
      d.addOption("career", "Career");
      d.addOption("health", "Health");
      d.addOption("financial", "Financial");
      d.addOption("learning", "Learning");
      d.setValue("personal");
      d.onChange((v) => category = v);
    });
    new import_obsidian.Setting(contentEl).setName("Target Date").addText((t) => {
      t.setValue(today()).onChange((v) => targetDate = v);
    });
    new import_obsidian.Setting(contentEl).setName("Why (motivation)").addTextArea((t) => {
      t.setPlaceholder("Why is this goal important to you?").onChange(
        (v) => why = v
      );
    });
    new import_obsidian.Setting(contentEl).setName("Success Criteria").addTextArea((t) => {
      t.setPlaceholder(
        "How will you know you've succeeded?"
      ).onChange((v) => successCriteria = v);
    });
    new import_obsidian.Setting(contentEl).addButton((btn) => {
      btn.setButtonText("Create Goal").setCta().onClick(async () => {
        if (!title.trim()) {
          new import_obsidian.Notice("Please enter a goal title.");
          return;
        }
        await this.createGoal(
          title.trim(),
          category,
          targetDate,
          why,
          successCriteria
        );
        this.close();
      });
    });
  }
  async createGoal(title, category, targetDate, why, successCriteria) {
    const folder = this.plugin.settings.goalsFolder;
    await ensureFolder(this.app, folder);
    const safeTitle = title.replace(/[\\/:*?"<>|]/g, "-");
    const filePath = (0, import_obsidian.normalizePath)(`${folder}/${safeTitle}.md`);
    const content = `---
title: "${title}"
category: ${category}
targetDate: ${targetDate}
progress: 0
status: active
created: ${today()}
---

## Why

${why || "_Not specified._"}

## Success Criteria

${successCriteria || "_Not specified._"}

## Milestones

## Progress Log
`;
    const existing = this.app.vault.getAbstractFileByPath(filePath);
    if (existing) {
      new import_obsidian.Notice(`Goal "${title}" already exists.`);
      return;
    }
    await this.app.vault.create(filePath, content);
    new import_obsidian.Notice(`Goal "${title}" created.`);
    await this.app.workspace.openLinkText(filePath, "", false);
    this.plugin.refreshView();
  }
  onClose() {
    this.contentEl.empty();
  }
};
var AddMilestoneModal = class extends import_obsidian.Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Add Milestone" });
    let goalTitle = "";
    let milestoneName = "";
    let dueDate = today();
    new import_obsidian.Setting(contentEl).setName("Goal Title").addText((t) => {
      t.setPlaceholder("Exact goal title").onChange(
        (v) => goalTitle = v
      );
    });
    new import_obsidian.Setting(contentEl).setName("Milestone Name").addText((t) => {
      t.setPlaceholder("e.g. Complete first week").onChange(
        (v) => milestoneName = v
      );
    });
    new import_obsidian.Setting(contentEl).setName("Due Date").addText((t) => {
      t.setValue(today()).onChange((v) => dueDate = v);
    });
    new import_obsidian.Setting(contentEl).addButton((btn) => {
      btn.setButtonText("Add Milestone").setCta().onClick(async () => {
        if (!goalTitle.trim() || !milestoneName.trim()) {
          new import_obsidian.Notice("Goal title and milestone name are required.");
          return;
        }
        await this.addMilestone(
          goalTitle.trim(),
          milestoneName.trim(),
          dueDate
        );
        this.close();
      });
    });
  }
  async addMilestone(goalTitle, name, dueDate) {
    const folder = this.plugin.settings.goalsFolder;
    const safeTitle = goalTitle.replace(/[\\/:*?"<>|]/g, "-");
    const filePath = (0, import_obsidian.normalizePath)(`${folder}/${safeTitle}.md`);
    const file = this.app.vault.getAbstractFileByPath(filePath);
    if (!(file instanceof import_obsidian.TFile)) {
      new import_obsidian.Notice(`Goal "${goalTitle}" not found.`);
      return;
    }
    const content = await this.app.vault.read(file);
    const milestoneEntry = `- [ ] **${name}** \u2014 due ${dueDate}
`;
    const updated = content.replace(
      /## Milestones\n/,
      `## Milestones
${milestoneEntry}`
    );
    await this.app.vault.modify(file, updated);
    new import_obsidian.Notice(`Milestone added to "${goalTitle}".`);
  }
  onClose() {
    this.contentEl.empty();
  }
};
var LogProgressModal = class extends import_obsidian.Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Log Progress" });
    let goalTitle = "";
    let note = "";
    let percent = 0;
    new import_obsidian.Setting(contentEl).setName("Goal Title").addText((t) => {
      t.setPlaceholder("Exact goal title").onChange(
        (v) => goalTitle = v
      );
    });
    new import_obsidian.Setting(contentEl).setName("Note").addTextArea((t) => {
      t.setPlaceholder("What did you accomplish?").onChange(
        (v) => note = v
      );
    });
    const percentDisplay = contentEl.createEl("span", {
      text: "0%",
      cls: "gt-percent-display"
    });
    new import_obsidian.Setting(contentEl).setName("% Complete").addSlider((s) => {
      s.setLimits(0, 100, 1).setValue(0).setDynamicTooltip().onChange((v) => {
        percent = v;
        percentDisplay.setText(`${v}%`);
      });
    });
    new import_obsidian.Setting(contentEl).addButton((btn) => {
      btn.setButtonText("Log Progress").setCta().onClick(async () => {
        if (!goalTitle.trim()) {
          new import_obsidian.Notice("Goal title is required.");
          return;
        }
        await this.logProgress(goalTitle.trim(), note, percent);
        this.close();
      });
    });
  }
  async logProgress(goalTitle, note, percent) {
    const folder = this.plugin.settings.goalsFolder;
    const safeTitle = goalTitle.replace(/[\\/:*?"<>|]/g, "-");
    const filePath = (0, import_obsidian.normalizePath)(`${folder}/${safeTitle}.md`);
    const file = this.app.vault.getAbstractFileByPath(filePath);
    if (!(file instanceof import_obsidian.TFile)) {
      new import_obsidian.Notice(`Goal "${goalTitle}" not found.`);
      return;
    }
    let content = await this.app.vault.read(file);
    content = content.replace(
      /^progress: \d+/m,
      `progress: ${percent}`
    );
    const entry = `- **${today()}** (${percent}%): ${note || "_No note._"}
`;
    content = content.replace(/## Progress Log\n/, `## Progress Log
${entry}`);
    await this.app.vault.modify(file, content);
    new import_obsidian.Notice(`Progress logged for "${goalTitle}": ${percent}%`);
    this.plugin.refreshView();
  }
  onClose() {
    this.contentEl.empty();
  }
};
var QuarterlyReviewModal = class extends import_obsidian.Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Quarterly Review" });
    let quarter = "Q2 2026";
    let whatWorked = "";
    let whatDidnt = "";
    let carryForward = "";
    new import_obsidian.Setting(contentEl).setName("Quarter").addText((t) => {
      t.setValue("Q2 2026").onChange((v) => quarter = v);
    });
    new import_obsidian.Setting(contentEl).setName("What Worked").addTextArea((t) => {
      t.setPlaceholder("What went well this quarter?").onChange(
        (v) => whatWorked = v
      );
    });
    new import_obsidian.Setting(contentEl).setName("What Didn't Work").addTextArea((t) => {
      t.setPlaceholder("What fell short or didn't work?").onChange(
        (v) => whatDidnt = v
      );
    });
    new import_obsidian.Setting(contentEl).setName("Goals to Carry Forward").addTextArea((t) => {
      t.setPlaceholder("Which goals continue next quarter?").onChange(
        (v) => carryForward = v
      );
    });
    new import_obsidian.Setting(contentEl).addButton((btn) => {
      btn.setButtonText("Create Review").setCta().onClick(async () => {
        if (!quarter.trim()) {
          new import_obsidian.Notice("Quarter is required.");
          return;
        }
        await this.createReview(
          quarter.trim(),
          whatWorked,
          whatDidnt,
          carryForward
        );
        this.close();
      });
    });
  }
  async createReview(quarter, whatWorked, whatDidnt, carryForward) {
    const folder = this.plugin.settings.goalsFolder;
    await ensureFolder(this.app, folder);
    const safeQ = quarter.replace(/[\\/:*?"<>|]/g, "-");
    const filePath = (0, import_obsidian.normalizePath)(
      `${folder}/Review - ${safeQ}.md`
    );
    const content = `---
type: quarterly-review
quarter: "${quarter}"
date: ${today()}
---

# Quarterly Review \u2014 ${quarter}

## What Worked

${whatWorked || "_Not specified._"}

## What Didn't Work

${whatDidnt || "_Not specified._"}

## Goals to Carry Forward

${carryForward || "_Not specified._"}
`;
    if (this.app.vault.getAbstractFileByPath(filePath)) {
      new import_obsidian.Notice(`Review for ${quarter} already exists.`);
      return;
    }
    await this.app.vault.create(filePath, content);
    new import_obsidian.Notice(`Quarterly review for ${quarter} created.`);
    await this.app.workspace.openLinkText(filePath, "", false);
  }
  onClose() {
    this.contentEl.empty();
  }
};
var GoalsSidebarView = class extends import_obsidian.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
  }
  getViewType() {
    return GT_VIEW_TYPE;
  }
  getDisplayText() {
    return "Goal Tracker";
  }
  getIcon() {
    return "target";
  }
  async onOpen() {
    await this.render();
  }
  async onClose() {
  }
  async render() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("goal-tracker-view");
    const header = container.createEl("div", { cls: "goal-tracker-header" });
    header.createEl("h4", { text: "Goal Tracker" });
    const addBtn = header.createEl("button", {
      text: "+",
      cls: "gt-add-btn"
    });
    addBtn.onclick = () => new NewGoalModal(this.plugin.app, this.plugin).open();
    const goals = await this.loadGoals();
    if (goals.length === 0) {
      container.createEl("p", {
        text: "No goals yet. Click + to create one.",
        cls: "gt-empty"
      });
      return;
    }
    for (const goal of goals) {
      const card = container.createEl("div", { cls: "gt-goal-card" });
      const topRow = card.createEl("div", { cls: "gt-goal-top-row" });
      topRow.createEl("span", { text: goal.title, cls: "gt-goal-title" });
      topRow.createEl("span", {
        text: goal.category,
        cls: `gt-badge gt-badge-${goal.category}`
      });
      const progressBar = card.createEl("div", { cls: "gt-progress-bar" });
      const fill = progressBar.createEl("div", { cls: "gt-progress-fill" });
      fill.style.width = `${goal.progress}%`;
      const meta = card.createEl("div", { cls: "gt-goal-meta" });
      meta.createEl("span", { text: `${goal.progress}%`, cls: "gt-progress-text" });
      if (goal.targetDate) {
        meta.createEl("span", {
          text: `Due: ${goal.targetDate}`,
          cls: "gt-target-date"
        });
      }
    }
  }
  async loadGoals() {
    const folder = this.plugin.settings.goalsFolder;
    const folderObj = this.app.vault.getAbstractFileByPath(
      (0, import_obsidian.normalizePath)(folder)
    );
    if (!folderObj)
      return [];
    const files = this.app.vault.getMarkdownFiles().filter((f) => f.path.startsWith((0, import_obsidian.normalizePath)(folder) + "/") && !f.name.startsWith("Review -"));
    const goals = [];
    for (const file of files) {
      const content = await this.app.vault.read(file);
      const fm = parseFrontmatter(content);
      goals.push({
        title: fm.title || file.basename,
        category: fm.category || "personal",
        progress: parseInt(fm.progress || "0", 10),
        targetDate: fm.targetDate || "",
        status: fm.status || "active"
      });
    }
    goals.sort((a, b) => {
      if (a.status === "active" && b.status !== "active")
        return -1;
      if (b.status === "active" && a.status !== "active")
        return 1;
      return a.title.localeCompare(b.title);
    });
    return goals;
  }
};
var GoalTrackerSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Goal Tracker Settings" });
    new import_obsidian.Setting(containerEl).setName("Goals Folder").setDesc("Folder where goal notes are stored.").addText((t) => {
      t.setValue(this.plugin.settings.goalsFolder).onChange(
        async (v) => {
          this.plugin.settings.goalsFolder = v;
          await this.plugin.saveSettings();
        }
      );
    });
  }
};
var GoalTrackerPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
  }
  async onload() {
    await this.loadSettings();
    this.registerView(
      GT_VIEW_TYPE,
      (leaf) => new GoalsSidebarView(leaf, this)
    );
    this.addCommand({
      id: "open-goal-tracker",
      name: "Open Goal Tracker Sidebar",
      callback: () => this.activateView()
    });
    this.addCommand({
      id: "new-goal",
      name: "New Goal",
      callback: () => new NewGoalModal(this.app, this).open()
    });
    this.addCommand({
      id: "add-milestone",
      name: "Add Milestone",
      callback: () => new AddMilestoneModal(this.app, this).open()
    });
    this.addCommand({
      id: "log-progress",
      name: "Log Progress",
      callback: () => new LogProgressModal(this.app, this).open()
    });
    this.addCommand({
      id: "quarterly-review",
      name: "Quarterly Review",
      callback: () => new QuarterlyReviewModal(this.app, this).open()
    });
    this.addSettingTab(new GoalTrackerSettingTab(this.app, this));
    this.app.workspace.onLayoutReady(() => this.activateView());
  }
  async onunload() {
    this.app.workspace.detachLeavesOfType(GT_VIEW_TYPE);
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  async activateView() {
    const existing = this.app.workspace.getLeavesOfType(GT_VIEW_TYPE);
    if (existing.length > 0) {
      this.app.workspace.revealLeaf(existing[0]);
      return;
    }
    const leaf = this.app.workspace.getRightLeaf(false);
    if (leaf) {
      await leaf.setViewState({ type: GT_VIEW_TYPE, active: true });
      this.app.workspace.revealLeaf(leaf);
    }
  }
  refreshView() {
    const leaves = this.app.workspace.getLeavesOfType(GT_VIEW_TYPE);
    for (const leaf of leaves) {
      if (leaf.view instanceof GoalsSidebarView) {
        leaf.view.render();
      }
    }
  }
};
