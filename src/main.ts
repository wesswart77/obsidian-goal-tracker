import {
	App,
	ItemView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	WorkspaceLeaf,
	normalizePath,
} from "obsidian";

// ─── Types ───────────────────────────────────────────────────────────────────

type GoalCategory = "personal" | "career" | "health" | "financial" | "learning";

interface GoalSettings {
	goalsFolder: string;
}

const DEFAULT_SETTINGS: GoalSettings = {
	goalsFolder: "Goals",
};

const GT_VIEW_TYPE = "gt-sidebar-view";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function today(): string {
	return new Date().toISOString().split("T")[0];
}

async function ensureFolder(app: App, folderPath: string): Promise<void> {
	const normalized = normalizePath(folderPath);
	if (!app.vault.getAbstractFileByPath(normalized)) {
		await app.vault.createFolder(normalized);
	}
}

function parseFrontmatter(content: string): Record<string, string> {
	const fm: Record<string, string> = {};
	const match = content.match(/^---\n([\s\S]*?)\n---/);
	if (!match) return fm;
	for (const line of match[1].split("\n")) {
		const idx = line.indexOf(":");
		if (idx === -1) continue;
		const key = line.slice(0, idx).trim();
		const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
		fm[key] = val;
	}
	return fm;
}

// ─── New Goal Modal ───────────────────────────────────────────────────────────

class NewGoalModal extends Modal {
	private plugin: GoalTrackerPlugin;

	constructor(app: App, plugin: GoalTrackerPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h2", { text: "New Goal" });

		let title = "";
		let category: GoalCategory = "personal";
		let targetDate = today();
		let why = "";
		let successCriteria = "";

		new Setting(contentEl).setName("Title").addText((t) => {
			t.setPlaceholder("e.g. Run a 5K").onChange((v) => (title = v));
		});

		new Setting(contentEl).setName("Category").addDropdown((d) => {
			d.addOption("personal", "Personal");
			d.addOption("career", "Career");
			d.addOption("health", "Health");
			d.addOption("financial", "Financial");
			d.addOption("learning", "Learning");
			d.setValue("personal");
			d.onChange((v) => (category = v as GoalCategory));
		});

		new Setting(contentEl).setName("Target Date").addText((t) => {
			t.setValue(today()).onChange((v) => (targetDate = v));
		});

		new Setting(contentEl).setName("Why (motivation)").addTextArea((t) => {
			t.setPlaceholder("Why is this goal important to you?").onChange(
				(v) => (why = v)
			);
		});

		new Setting(contentEl)
			.setName("Success Criteria")
			.addTextArea((t) => {
				t.setPlaceholder(
					"How will you know you've succeeded?"
				).onChange((v) => (successCriteria = v));
			});

		new Setting(contentEl).addButton((btn) => {
			btn
				.setButtonText("Create Goal")
				.setCta()
				.onClick(async () => {
					if (!title.trim()) {
						new Notice("Please enter a goal title.");
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

	async createGoal(
		title: string,
		category: GoalCategory,
		targetDate: string,
		why: string,
		successCriteria: string
	) {
		const folder = this.plugin.settings.goalsFolder;
		await ensureFolder(this.app, folder);
		const safeTitle = title.replace(/[\\/:*?"<>|]/g, "-");
		const filePath = normalizePath(`${folder}/${safeTitle}.md`);
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
			new Notice(`Goal "${title}" already exists.`);
			return;
		}
		await this.app.vault.create(filePath, content);
		new Notice(`Goal "${title}" created.`);
		await this.app.workspace.openLinkText(filePath, "", false);
		this.plugin.refreshView();
	}

	onClose() {
		this.contentEl.empty();
	}
}

// ─── Add Milestone Modal ──────────────────────────────────────────────────────

class AddMilestoneModal extends Modal {
	private plugin: GoalTrackerPlugin;

	constructor(app: App, plugin: GoalTrackerPlugin) {
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

		new Setting(contentEl).setName("Goal Title").addText((t) => {
			t.setPlaceholder("Exact goal title").onChange(
				(v) => (goalTitle = v)
			);
		});

		new Setting(contentEl).setName("Milestone Name").addText((t) => {
			t.setPlaceholder("e.g. Complete first week").onChange(
				(v) => (milestoneName = v)
			);
		});

		new Setting(contentEl).setName("Due Date").addText((t) => {
			t.setValue(today()).onChange((v) => (dueDate = v));
		});

		new Setting(contentEl).addButton((btn) => {
			btn
				.setButtonText("Add Milestone")
				.setCta()
				.onClick(async () => {
					if (!goalTitle.trim() || !milestoneName.trim()) {
						new Notice("Goal title and milestone name are required.");
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

	async addMilestone(goalTitle: string, name: string, dueDate: string) {
		const folder = this.plugin.settings.goalsFolder;
		const safeTitle = goalTitle.replace(/[\\/:*?"<>|]/g, "-");
		const filePath = normalizePath(`${folder}/${safeTitle}.md`);
		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (!(file instanceof TFile)) {
			new Notice(`Goal "${goalTitle}" not found.`);
			return;
		}
		const content = await this.app.vault.read(file);
		const milestoneEntry = `- [ ] **${name}** — due ${dueDate}\n`;
		const updated = content.replace(
			/## Milestones\n/,
			`## Milestones\n${milestoneEntry}`
		);
		await this.app.vault.modify(file, updated);
		new Notice(`Milestone added to "${goalTitle}".`);
	}

	onClose() {
		this.contentEl.empty();
	}
}

// ─── Log Progress Modal ───────────────────────────────────────────────────────

class LogProgressModal extends Modal {
	private plugin: GoalTrackerPlugin;

	constructor(app: App, plugin: GoalTrackerPlugin) {
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

		new Setting(contentEl).setName("Goal Title").addText((t) => {
			t.setPlaceholder("Exact goal title").onChange(
				(v) => (goalTitle = v)
			);
		});

		new Setting(contentEl)
			.setName("Note")
			.addTextArea((t) => {
				t.setPlaceholder("What did you accomplish?").onChange(
					(v) => (note = v)
				);
			});

		const percentDisplay = contentEl.createEl("span", {
			text: "0%",
			cls: "gt-percent-display",
		});

		new Setting(contentEl).setName("% Complete").addSlider((s) => {
			s.setLimits(0, 100, 1)
				.setValue(0)
				.setDynamicTooltip()
				.onChange((v) => {
					percent = v;
					percentDisplay.setText(`${v}%`);
				});
		});

		new Setting(contentEl).addButton((btn) => {
			btn
				.setButtonText("Log Progress")
				.setCta()
				.onClick(async () => {
					if (!goalTitle.trim()) {
						new Notice("Goal title is required.");
						return;
					}
					await this.logProgress(goalTitle.trim(), note, percent);
					this.close();
				});
		});
	}

	async logProgress(goalTitle: string, note: string, percent: number) {
		const folder = this.plugin.settings.goalsFolder;
		const safeTitle = goalTitle.replace(/[\\/:*?"<>|]/g, "-");
		const filePath = normalizePath(`${folder}/${safeTitle}.md`);
		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (!(file instanceof TFile)) {
			new Notice(`Goal "${goalTitle}" not found.`);
			return;
		}
		let content = await this.app.vault.read(file);
		// Update progress frontmatter field
		content = content.replace(
			/^progress: \d+/m,
			`progress: ${percent}`
		);
		const entry = `- **${today()}** (${percent}%): ${note || "_No note._"}\n`;
		content = content.replace(/## Progress Log\n/, `## Progress Log\n${entry}`);
		await this.app.vault.modify(file, content);
		new Notice(`Progress logged for "${goalTitle}": ${percent}%`);
		this.plugin.refreshView();
	}

	onClose() {
		this.contentEl.empty();
	}
}

// ─── Quarterly Review Modal ───────────────────────────────────────────────────

class QuarterlyReviewModal extends Modal {
	private plugin: GoalTrackerPlugin;

	constructor(app: App, plugin: GoalTrackerPlugin) {
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

		new Setting(contentEl).setName("Quarter").addText((t) => {
			t.setValue("Q2 2026").onChange((v) => (quarter = v));
		});

		new Setting(contentEl).setName("What Worked").addTextArea((t) => {
			t.setPlaceholder("What went well this quarter?").onChange(
				(v) => (whatWorked = v)
			);
		});

		new Setting(contentEl)
			.setName("What Didn't Work")
			.addTextArea((t) => {
				t.setPlaceholder("What fell short or didn't work?").onChange(
					(v) => (whatDidnt = v)
				);
			});

		new Setting(contentEl)
			.setName("Goals to Carry Forward")
			.addTextArea((t) => {
				t.setPlaceholder("Which goals continue next quarter?").onChange(
					(v) => (carryForward = v)
				);
			});

		new Setting(contentEl).addButton((btn) => {
			btn
				.setButtonText("Create Review")
				.setCta()
				.onClick(async () => {
					if (!quarter.trim()) {
						new Notice("Quarter is required.");
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

	async createReview(
		quarter: string,
		whatWorked: string,
		whatDidnt: string,
		carryForward: string
	) {
		const folder = this.plugin.settings.goalsFolder;
		await ensureFolder(this.app, folder);
		const safeQ = quarter.replace(/[\\/:*?"<>|]/g, "-");
		const filePath = normalizePath(
			`${folder}/Review - ${safeQ}.md`
		);
		const content = `---
type: quarterly-review
quarter: "${quarter}"
date: ${today()}
---

# Quarterly Review — ${quarter}

## What Worked

${whatWorked || "_Not specified._"}

## What Didn't Work

${whatDidnt || "_Not specified._"}

## Goals to Carry Forward

${carryForward || "_Not specified._"}
`;
		if (this.app.vault.getAbstractFileByPath(filePath)) {
			new Notice(`Review for ${quarter} already exists.`);
			return;
		}
		await this.app.vault.create(filePath, content);
		new Notice(`Quarterly review for ${quarter} created.`);
		await this.app.workspace.openLinkText(filePath, "", false);
	}

	onClose() {
		this.contentEl.empty();
	}
}

// ─── Goals Sidebar View ───────────────────────────────────────────────────────

interface GoalEntry {
	title: string;
	category: string;
	progress: number;
	targetDate: string;
	status: string;
}

class GoalsSidebarView extends ItemView {
	private plugin: GoalTrackerPlugin;

	constructor(leaf: WorkspaceLeaf, plugin: GoalTrackerPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return GT_VIEW_TYPE;
	}

	getDisplayText(): string {
		return "Goal Tracker";
	}

	getIcon(): string {
		return "target";
	}

	async onOpen() {
		await this.render();
	}

	async onClose() {}

	async render() {
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();
		container.addClass("goal-tracker-view");

		const header = container.createEl("div", { cls: "goal-tracker-header" });
		header.createEl("h4", { text: "Goal Tracker" });
		const addBtn = header.createEl("button", {
			text: "+",
			cls: "gt-add-btn",
		});
		addBtn.onclick = () =>
			new NewGoalModal(this.plugin.app, this.plugin).open();

		const goals = await this.loadGoals();
		if (goals.length === 0) {
			container.createEl("p", {
				text: "No goals yet. Click + to create one.",
				cls: "gt-empty",
			});
			return;
		}

		for (const goal of goals) {
			const card = container.createEl("div", { cls: "gt-goal-card" });
			const topRow = card.createEl("div", { cls: "gt-goal-top-row" });
			topRow.createEl("span", { text: goal.title, cls: "gt-goal-title" });
			topRow.createEl("span", {
				text: goal.category,
				cls: `gt-badge gt-badge-${goal.category}`,
			});

			const progressBar = card.createEl("div", { cls: "gt-progress-bar" });
			const fill = progressBar.createEl("div", { cls: "gt-progress-fill" });
			fill.style.width = `${goal.progress}%`;

			const meta = card.createEl("div", { cls: "gt-goal-meta" });
			meta.createEl("span", { text: `${goal.progress}%`, cls: "gt-progress-text" });
			if (goal.targetDate) {
				meta.createEl("span", {
					text: `Due: ${goal.targetDate}`,
					cls: "gt-target-date",
				});
			}
		}
	}

	async loadGoals(): Promise<GoalEntry[]> {
		const folder = this.plugin.settings.goalsFolder;
		const folderObj = this.app.vault.getAbstractFileByPath(
			normalizePath(folder)
		);
		if (!folderObj) return [];
		const files = this.app.vault
			.getMarkdownFiles()
			.filter((f) => f.path.startsWith(normalizePath(folder) + "/") && !f.name.startsWith("Review -"));
		const goals: GoalEntry[] = [];
		for (const file of files) {
			const content = await this.app.vault.read(file);
			const fm = parseFrontmatter(content);
			goals.push({
				title: fm.title || file.basename,
				category: fm.category || "personal",
				progress: parseInt(fm.progress || "0", 10),
				targetDate: fm.targetDate || "",
				status: fm.status || "active",
			});
		}
		goals.sort((a, b) => {
			if (a.status === "active" && b.status !== "active") return -1;
			if (b.status === "active" && a.status !== "active") return 1;
			return a.title.localeCompare(b.title);
		});
		return goals;
	}
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

class GoalTrackerSettingTab extends PluginSettingTab {
	private plugin: GoalTrackerPlugin;

	constructor(app: App, plugin: GoalTrackerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display() {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl("h2", { text: "Goal Tracker Settings" });

		new Setting(containerEl)
			.setName("Goals Folder")
			.setDesc("Folder where goal notes are stored.")
			.addText((t) => {
				t.setValue(this.plugin.settings.goalsFolder).onChange(
					async (v) => {
						this.plugin.settings.goalsFolder = v;
						await this.plugin.saveSettings();
					}
				);
			});
	}
}

// ─── Plugin ───────────────────────────────────────────────────────────────────

export default class GoalTrackerPlugin extends Plugin {
	settings: GoalSettings = DEFAULT_SETTINGS;

	async onload() {
		await this.loadSettings();

		this.registerView(
			GT_VIEW_TYPE,
			(leaf) => new GoalsSidebarView(leaf, this)
		);

		this.addCommand({
			id: "open-goal-tracker",
			name: "Open Goal Tracker Sidebar",
			callback: () => this.activateView(),
		});

		this.addCommand({
			id: "new-goal",
			name: "New Goal",
			callback: () => new NewGoalModal(this.app, this).open(),
		});

		this.addCommand({
			id: "add-milestone",
			name: "Add Milestone",
			callback: () => new AddMilestoneModal(this.app, this).open(),
		});

		this.addCommand({
			id: "log-progress",
			name: "Log Progress",
			callback: () => new LogProgressModal(this.app, this).open(),
		});

		this.addCommand({
			id: "quarterly-review",
			name: "Quarterly Review",
			callback: () => new QuarterlyReviewModal(this.app, this).open(),
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
}
