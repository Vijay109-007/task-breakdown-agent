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
    console.log("⚠️ Failed to read progress file.");
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

function getTeamWorkload() {
  const workload = {};

  teamMembers.forEach((member) => {
    workload[member.id] = {
      name: member.name,
      role: member.role,
      activeTasks: 0,
    };
  });

  Object.values(taskAssignments).forEach((assignment) => {
    if (assignment.status === "IN_PROGRESS") {
      const member = teamMembers.find(
        (m) => m.name === assignment.assignee
      );
      if (member) {
        workload[member.id].activeTasks += 1;
      }
    }
  });

  return workload;
}

function detectBottlenecks(workload) {
  console.log("\n📊 Team Workload Analysis:");

  let hasIssue = false;

  Object.values(workload).forEach((member) => {
    if (member.activeTasks >= 3) {
      console.log(
        `⚠️ ${member.name} has ${member.activeTasks} tasks → overload`
      );
      hasIssue = true;
    }

    if (member.activeTasks === 0) {
      console.log(`💡 ${member.name} has no tasks → available`);
    }
  });

  if (!hasIssue) {
    console.log("✅ No bottlenecks");
  }
}

function autoRebalance(workload) {
  const overloaded = Object.values(workload).filter(
    (m) => m.activeTasks >= 3
  );
  const underloaded = Object.values(workload).filter(
    (m) => m.activeTasks === 0
  );

  if (!overloaded.length || !underloaded.length) return;

  console.log("\n🔁 Auto Rebalancing:");

  overloaded.forEach((over) => {
    const taskToMove = Object.entries(taskAssignments).find(
      ([_, t]) =>
        t.assignee === over.name && t.status === "IN_PROGRESS"
    );

    if (!taskToMove) return;

    const [taskId] = taskToMove;
    const newMember = teamMembers.find(
      (m) => m.name === underloaded[0].name
    );

    taskAssignments[taskId].assignee = newMember.name;
    taskAssignments[taskId].role = newMember.role;

    const task = tasks.find((t) => t.id === Number(taskId));

    console.log(
      `🔄 Moved "${task.task}" from ${over.name} → ${newMember.name}`
    );
    console.log("Reason: workload balancing");
  });

  saveProgress();
}

function printSprintPlan() {
  console.log("\nPROJECT GOAL:");
  console.log(input);

  console.log("\nSPRINT PLAN:");

  tasks.forEach((task) => {
    const assignment = taskAssignments[task.id];

    let status = "READY";

    if (
      task.dependencyId !== null &&
      !completedTaskIds.has(task.dependencyId)
    ) {
      status = "BLOCKED";
    } else if (assignment?.status === "IN_PROGRESS") {
      status = "IN_PROGRESS";
    } else if (assignment?.status === "DONE") {
      status = "DONE";
    }

    console.log(
      `\n${task.id}. ${task.task} ${
        status === "DONE"
          ? "✅ DONE"
          : status === "IN_PROGRESS"
          ? "🚧 IN_PROGRESS"
          : status === "BLOCKED"
          ? "⛔ BLOCKED"
          : "✅ READY"
      }`
    );

    console.log(`  Priority: ${task.priority}`);
    console.log(`  Effort: ${task.effort}`);
    console.log(`  Dependency ID: ${task.dependencyId ?? "None"}`);

    if (assignment) {
      console.log(`  Assigned to: ${assignment.assignee}`);
      console.log(`  Work Status: ${assignment.status}`);
    }
  });
}

while (true) {
  printSprintPlan();

  if (completedTaskIds.size === tasks.length) {
    console.log("\n🎉 All tasks completed!");
    break;
  }

  const workload = getTeamWorkload();
  detectBottlenecks(workload);
  autoRebalance(workload);

  const ai = await getAITaskAssignment(
    tasks,
    completedTaskIds,
    teamMembers,
    input,
    workload
  );

  const task = tasks.find((t) => t.id === ai.taskId);
  const member = teamMembers.find((m) => m.id === ai.assigneeId);

  if (!task || !member) {
    console.log("❌ AI assignment failed");
    break;
  }

  if (!taskAssignments[task.id]) {
    taskAssignments[task.id] = {
      assignee: member.name,
      role: member.role,
      status: "READY",
    };
    saveProgress();
  }

  console.log("\n🧠 AI Assignment:");
  console.log(`Task: ${task.task}`);
  console.log(`Assigned to: ${member.name}`);
  console.log(`Reason: ${ai.reason}`);

  const inputVal = readlineSync
    .question("\nEnter task (1s=start, 1d=done, exit): ")
    .toLowerCase();

  if (inputVal === "exit") break;

  const id = parseInt(inputVal);
  const action = inputVal.slice(-1);

  if (!taskAssignments[id]) continue;

  const selectedTask = tasks.find((t) => t.id === id);

  if (
    selectedTask.dependencyId !== null &&
    !completedTaskIds.has(selectedTask.dependencyId)
  ) {
    console.log("⛔ Complete dependency first");
    continue;
  }

  if (action === "s") {
    taskAssignments[id].status = "IN_PROGRESS";
    console.log("🚧 Started");
  } else if (action === "d") {
    taskAssignments[id].status = "DONE";
    completedTaskIds.add(id);
    console.log("✅ Completed");
  }

  saveProgress();
}