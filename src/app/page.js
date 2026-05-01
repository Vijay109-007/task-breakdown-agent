import fs from "fs";
import path from "path";
import readlineSync from "readline-sync";
import { generateTasks } from "../lib/prompt.js";
import { getAITaskAssignment } from "../lib/decision.js";
import { teamMembers } from "../lib/team.js";

const userInput = process.argv.slice(2).join(" ");
const input = userInput || "Build a login system";

const result = await generateTasks(input);
const tasks = result.tasks;

const progressFile = path.resolve("progress.json");

let completedTaskIds = new Set();
let taskAssignments = {};

if (fs.existsSync(progressFile)) {
  try {
    const data = JSON.parse(fs.readFileSync(progressFile, "utf-8"));
    completedTaskIds = new Set(data.completedTaskIds || []);
    taskAssignments = data.taskAssignments || {};
  } catch {
    console.log("⚠️ Failed to read progress file. Starting fresh.");
  }
}

function saveProgress() {
  fs.writeFileSync(
    progressFile,
    JSON.stringify(
      {
        completedTaskIds: Array.from(completedTaskIds),
        taskAssignments,
      },
      null,
      2
    )
  );
}

function printSprintPlan() {
  const grouped = {};

  tasks.forEach((task) => {
    if (!grouped[task.sprint]) grouped[task.sprint] = [];
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
      const assignment = taskAssignments[task.id];

      console.log(`\n${task.id}. ${task.task} ${status}`);
      console.log(`  Priority: ${task.priority}`);
      console.log(`  Effort: ${task.effort}`);
      console.log(`  Dependency ID: ${task.dependencyId ?? "None"}`);
      console.log(`  Description: ${task.description}`);

      if (assignment) {
        console.log(`  Assigned to: ${assignment.assignee} (${assignment.role})`);
        console.log(`  Work Status: ${assignment.status}`);
      }
    });

    blockedTasks.forEach((task) => {
      const assignment = taskAssignments[task.id];

      console.log(`\n${task.id}. ${task.task} ⛔ BLOCKED`);
      console.log(`  Priority: ${task.priority}`);
      console.log(`  Effort: ${task.effort}`);
      console.log(`  Dependency ID: ${task.dependencyId}`);
      console.log(`  Description: ${task.description}`);

      if (assignment) {
        console.log(`  Assigned to: ${assignment.assignee} (${assignment.role})`);
        console.log(`  Work Status: ${assignment.status}`);
      }
    });
  }
}

while (true) {
  printSprintPlan();

  if (completedTaskIds.size === tasks.length) {
    console.log("\n🎉 All tasks completed! Project finished.");
    break;
  }

  const assignment = await getAITaskAssignment(
    tasks,
    completedTaskIds,
    teamMembers,
    input
  );

  const assignedTask = tasks.find((task) => task.id === assignment.taskId);
  const assignee = teamMembers.find(
    (member) => member.id === assignment.assigneeId
  );

  if (!assignedTask || !assignee) {
    console.log("\n❌ AI could not create a valid assignment.");
    break;
  }

  taskAssignments[assignedTask.id] = {
    assignee: assignee.name,
    role: assignee.role,
    status: "READY",
  };

  saveProgress();

  console.log("\n🧠 AI Task Assignment:");
  console.log(`Task: ${assignedTask.id}. ${assignedTask.task}`);
  console.log(`Assigned to: ${assignee.name} (${assignee.role})`);
  console.log(`Status: ${taskAssignments[assignedTask.id].status}`);
  console.log(`Reason: ${assignment.reason}`);

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
    console.log("\n❌ Invalid task ID.");
    continue;
  }

  if (completedTaskIds.has(selectedTask.id)) {
    console.log("\n⚠️ Task already completed.");
    continue;
  }

  if (
    selectedTask.dependencyId !== null &&
    !completedTaskIds.has(selectedTask.dependencyId)
  ) {
    console.log("\n⛔ Task is BLOCKED. Complete dependency first.");
    continue;
  }

  completedTaskIds.add(selectedTask.id);

  if (taskAssignments[selectedTask.id]) {
    taskAssignments[selectedTask.id].status = "DONE";
  }

  saveProgress();

  console.log(`\n✅ Marked as DONE: ${selectedTask.task}`);
}