import fs from "fs";
import path from "path";
import readlineSync from "readline-sync";
import { generateTasks } from "../lib/prompt.js";
import {
  getAITaskAssignment,
  getAIRebalanceDecision,
} from "../lib/decision.js";
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
      capacity: member.capacity,
      activeTasks: 0,
    };
  });

  Object.values(taskAssignments).forEach((assignment) => {
    if (assignment.status === "IN_PROGRESS") {
      const member = teamMembers.find((m) => m.name === assignment.assignee);

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
        `⚠️ ${member.name} has ${member.activeTasks} active tasks → overload risk`
      );
      hasIssue = true;
    }

    if (member.activeTasks === 0) {
      console.log(`💡 ${member.name} has no active tasks → available`);
    }
  });

  if (!hasIssue) {
    console.log("✅ No major bottlenecks detected");
  }
}

async function runAIRebalancing(workload) {
  const hasOverload = Object.values(workload).some(
    (member) => member.activeTasks >= 3
  );

  if (!hasOverload) return;

  const decision = await getAIRebalanceDecision(
    tasks,
    taskAssignments,
    teamMembers,
    workload
  );

  if (!decision.shouldRebalance) {
    console.log(`\n🔁 AI Rebalancing: ${decision.reason}`);
    return;
  }

  const task = tasks.find((t) => t.id === decision.taskId);
  const newAssignee = teamMembers.find(
    (member) => member.id === decision.toAssigneeId
  );

  if (!task || !newAssignee || !taskAssignments[decision.taskId]) {
    console.log("\n❌ AI rebalancing decision was invalid.");
    return;
  }

  taskAssignments[decision.taskId].assignee = newAssignee.name;
  taskAssignments[decision.taskId].role = newAssignee.role;

  saveProgress();

  console.log("\n🔁 AI Rebalancing Decision:");
  console.log(`Task: ${task.id}. ${task.task}`);
  console.log(`Moved from: ${decision.fromAssignee}`);
  console.log(`Moved to: ${newAssignee.name} (${newAssignee.role})`);
  console.log(`Reason: ${decision.reason}`);
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
  await runAIRebalancing(workload);

  const assignment = await getAITaskAssignment(
    tasks,
    completedTaskIds,
    teamMembers,
    input,
    workload
  );

  const task = tasks.find((t) => t.id === assignment.taskId);
  const member = teamMembers.find((m) => m.id === assignment.assigneeId);

  if (!task || !member) {
    console.log("\n❌ AI assignment failed");
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
  console.log(`Task: ${task.id}. ${task.task}`);
  console.log(`Assigned to: ${member.name} (${member.role})`);
  console.log(`Reason: ${assignment.reason}`);

  const inputVal = readlineSync
    .question("\nEnter task (1s=start, 1d=done, exit): ")
    .toLowerCase();

  if (inputVal === "exit") {
    console.log("\nProgress saved. Exiting...");
    break;
  }

  const id = parseInt(inputVal);
  const action = inputVal.slice(-1);

  const selectedTask = tasks.find((t) => t.id === id);

  if (!selectedTask) {
    console.log("\n❌ Invalid task ID");
    continue;
  }

  if (
    selectedTask.dependencyId !== null &&
    !completedTaskIds.has(selectedTask.dependencyId)
  ) {
    console.log("\n⛔ Complete dependency first");
    continue;
  }

  if (!taskAssignments[id]) {
    console.log("\n⚠️ Task is not assigned yet");
    continue;
  }

  if (action === "s") {
    taskAssignments[id].status = "IN_PROGRESS";
    console.log(`\n🚧 Started: ${selectedTask.task}`);
  } else if (action === "d") {
    taskAssignments[id].status = "DONE";
    completedTaskIds.add(id);
    console.log(`\n✅ Completed: ${selectedTask.task}`);
  } else {
    console.log("\n⚠️ Invalid action. Use 1s or 1d.");
    continue;
  }

  saveProgress();
}