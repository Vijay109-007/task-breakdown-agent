import { generateTasks } from "../lib/prompt.js";

const userInput = process.argv.slice(2).join(" ");
const input = userInput || "Build a login system";

const result = await generateTasks(input);

console.log("\nPROJECT GOAL:");
console.log(input);

// Group tasks by sprint
const grouped = {};

result.tasks.forEach((task) => {
  if (!grouped[task.sprint]) {
    grouped[task.sprint] = [];
  }

  grouped[task.sprint].push(task);
});

// Track completed tasks
const completedTasks = new Set();

console.log("\nSPRINT PLAN:");

for (const sprint in grouped) {
  console.log(`\n=== ${sprint} ===`);

  const readyTasks = [];
  const blockedTasks = [];

  grouped[sprint].forEach((task) => {
    if (task.dependency === "None" || completedTasks.has(task.dependency)) {
      readyTasks.push(task);
      completedTasks.add(task.task);
    } else {
      blockedTasks.push(task);
    }
  });

  console.log(`Ready: ${readyTasks.length} | Blocked: ${blockedTasks.length}`);

  readyTasks.forEach((task) => {
    console.log(`\n- ${task.task} ✅ READY`);
    console.log(`  Priority: ${task.priority}`);
    console.log(`  Effort: ${task.effort}`);
    console.log(`  Dependency: ${task.dependency}`);
    console.log(`  Description: ${task.description}`);
  });

  blockedTasks.forEach((task) => {
    console.log(`\n- ${task.task} ⛔ BLOCKED`);
    console.log(`  Priority: ${task.priority}`);
    console.log(`  Effort: ${task.effort}`);
    console.log(`  Dependency: ${task.dependency}`);
    console.log(`  Description: ${task.description}`);
  });
}