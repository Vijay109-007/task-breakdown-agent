import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function getAITaskAssignment(
  tasks,
  completedTaskIds,
  teamMembers,
  projectGoal,
  workload
) {
  const availableTasks = tasks.filter((task) => {
    const isCompleted = completedTaskIds.has(task.id);
    const dependencySatisfied =
      task.dependencyId === null || completedTaskIds.has(task.dependencyId);

    return !isCompleted && dependencySatisfied;
  });

  const blockedTasks = tasks.filter((task) => {
    const isCompleted = completedTaskIds.has(task.id);
    const dependencyNotSatisfied =
      task.dependencyId !== null && !completedTaskIds.has(task.dependencyId);

    return !isCompleted && dependencyNotSatisfied;
  });

  const response = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `
You are a senior Agile Project Manager and AI task assignment advisor.

Assign exactly ONE READY task to the best team member.

Rules:
1. Choose ONLY from availableTasks.
2. Never choose blockedTasks.
3. Prefer high-priority tasks.
4. Prefer tasks that unlock future work.
5. Match skills and role.
6. Avoid overloaded team members.
7. Consider workload and capacity.
8. Return ONLY valid JSON.

Format:
{
  "taskId": 1,
  "assigneeId": 2,
  "reason": "Short PM-style explanation"
}
`
      },
      {
        role: "user",
        content: JSON.stringify({
          projectGoal,
          availableTasks,
          blockedTasks,
          teamMembers,
          workload,
        }),
      },
    ],
  });

  return JSON.parse(response.choices[0].message.content);
}

export async function getAIRebalanceDecision(
  tasks,
  taskAssignments,
  teamMembers,
  workload
) {
  const inProgressTasks = Object.entries(taskAssignments)
    .filter(([_, assignment]) => assignment.status === "IN_PROGRESS")
    .map(([taskId, assignment]) => {
      const task = tasks.find((t) => t.id === Number(taskId));

      return {
        taskId: Number(taskId),
        taskName: task?.task,
        currentAssignee: assignment.assignee,
        currentRole: assignment.role,
        status: assignment.status,
      };
    });

  const response = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `
You are a senior Agile Project Manager.

Your job is to decide whether task reassignment is needed to reduce workload bottlenecks.

Rules:
1. Rebalance only if a team member is overloaded.
2. Move only IN_PROGRESS tasks.
3. Do not rebalance if workload is acceptable.
4. Choose a new assignee with lower workload and suitable skills.
5. Return ONLY valid JSON.

Format:
{
  "shouldRebalance": true,
  "taskId": 1,
  "fromAssignee": "Rahul",
  "toAssigneeId": 3,
  "reason": "Short explanation"
}

If no rebalancing is needed:

{
  "shouldRebalance": false,
  "taskId": null,
  "fromAssignee": null,
  "toAssigneeId": null,
  "reason": "No rebalancing needed"
}
`
      },
      {
        role: "user",
        content: JSON.stringify({
          inProgressTasks,
          teamMembers,
          workload,
        }),
      },
    ],
  });

  return JSON.parse(response.choices[0].message.content);
}