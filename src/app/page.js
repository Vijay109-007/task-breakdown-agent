import fs from "fs";
import path from "path";
import readlineSync from "readline-sync";
import { generateTasks } from "../lib/prompt.js";

const AUTO_MODE = false;

const userInput = process.argv.slice(2).join(" ");
const input = userInput || "Build a login system";

const result = await generateTasks(input);
const tasks = result.tasks;

const progressFile = path.resolve("progress.json");

let completedTaskIds = new Set();

if (fs.existsSync(progressFile)) {
  try {
    const data = JSON.parse(fs.readFileSync(progressFile, "utf-8"));
    completedTaskIds = new Set(data.completedTaskIds || []);
  } catch (err) {
    console.log("⚠️ Failed to read progress file. Starting fresh.");
  }
}

function saveProgress() {
  const data = {
    completedTaskIds: Array.from(completedTaskIds),
  };

  fs.writeFileSync(progressFile, JSON.stringify(data, null, 2));
}

function getNextSuggestedTask() {
  const readyTasks = tasks.filter(
    (task) =>
      !completedTaskIds.has(task.id) &&
      (task.dependencyId === null || completedTaskIds.has(task.dependencyId))
  );

  if (readyTasks.length === 0) {
    return null;
  }

  const priorityOrder = {
    high: 1,
    medium: 2,
    low: 3,
  };

  readyTasks.sort((a, b) => {
    const priorityDifference =
      (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99);

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    const getStoryPoints = (effort) =>
      parseInt(String(effort).match(/\d+/)?.[0] || "0", 10);

    return getStoryPoints(a.effort) - getStoryPoints(b.effort);
  });

  return readyTasks[0];
}

function getDependencyTask(task) {
  if (task.dependencyId === null) {
    return null;
  }

  return tasks.find((item) => item.id === task.dependencyId);
}

function printAutoReason(task) {
  const dependencyTask = getDependencyTask(task);

  console.log(`\n🤖 AUTO-COMPLETED: ${task.task}`);
  console.log("Reason:");

  if (dependencyTask) {
    console.log(`- Dependency completed: ${dependencyTask.task}`);
  } else {
    console.log("- No dependency required");
  }

  console.log("- No blockers remaining");
  console.log(`- Priority considered: ${task.priority}`);
  console.log(`- Effort considered: ${task.effort}`);
}

function printSprintPlan() {
  const grouped = {};

  tasks.forEach((task) => {
    if (!grouped[task.sprint]) {
      grouped[task.sprint] = [];
    }

    grouped[task.sprint].push(task);
  });

  console.log("\nPROJECT GOAL:");
  console.log(input);

  console.log("\nSPRINT PLAN:");

  for (const sprint in grouped) {
    const readyTasks = [];
    const blockedTasks = [];

    grouped[sprint].forEach((task) => {
      if (
        completedTaskIds.has(task.id) ||
        task.dependencyId === null ||
        completedTaskIds.has(task.dependencyId)
      ) {
        readyTasks.push(task);
      } else {
        blockedTasks.push(task);
      }
    });

    console.log(`\n=== ${sprint} ===`);
    console.log(`Ready: ${readyTasks.length} | Blocked: ${blockedTasks.length}`);

    readyTasks.forEach((task) => {
      const status = completedTaskIds.has(task.id) ? "✅ DONE" : "✅ READY";

      console.log(`\n${task.id}. ${task.task} ${status}`);
      console.log(`  Priority: ${task.priority}`);
      console.log(`  Effort: ${task.effort}`);
      console.log(`  Dependency ID: ${task.dependencyId ?? "None"}`);
      console.log(`  Description: ${task.description}`);
    });

    blockedTasks.forEach((task) => {
      console.log(`\n${task.id}. ${task.task} ⛔ BLOCKED`);
      console.log(`  Priority: ${task.priority}`);
      console.log(`  Effort: ${task.effort}`);
      console.log(`  Dependency ID: ${task.dependencyId}`);
      console.log(`  Description: ${task.description}`);
    });
  }
}

while (true) {
  printSprintPlan();

  if (completedTaskIds.size === tasks.length) {
    console.log("\n🎉 All tasks completed! Project finished.");
    break;
  }

  const suggestion = getNextSuggestedTask();

  if (!suggestion) {
    console.log("\n💡 No available tasks right now.");
    break;
  }

  console.log(
    `\n💡 Suggested next task:\n${suggestion.id}. ${suggestion.task} (Priority: ${suggestion.priority}, Effort: ${suggestion.effort})`
  );

  if (AUTO_MODE) {
    completedTaskIds.add(suggestion.id);
    saveProgress();
    printAutoReason(suggestion);
    continue;
  }

  const userChoice = readlineSync.question(
    "\nEnter task ID to mark as DONE (or type 'exit'): "
  );

  if (userChoice.toLowerCase() === "exit") {
    console.log("\nProgress saved. Exiting...");
    break;
  }

  const selectedTaskId = Number(userChoice);
  const selectedTask = tasks.find((task) => task.id === selectedTaskId);

  if (!selectedTask) {
    console.log("\nInvalid task ID.");
    continue;
  }

  if (completedTaskIds.has(selectedTask.id)) {
    console.log("\nThis task is already DONE.");
    continue;
  }

  if (
    selectedTask.dependencyId !== null &&
    !completedTaskIds.has(selectedTask.dependencyId)
  ) {
    console.log("\n❌ Task is BLOCKED. Complete dependency first.");
    continue;
  }

  completedTaskIds.add(selectedTask.id);
  saveProgress();

  console.log(`\n✅ Marked as DONE: ${selectedTask.task}`);

  if (completedTaskIds.size === tasks.length) {
    console.log("\n🎉 All tasks completed! Project finished.");
    break;
  }
}