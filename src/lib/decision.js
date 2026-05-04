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
  const completedIds = Array.from(completedTaskIds);

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
You are a senior Agile Project Manager.

Your job is to assign exactly ONE READY task to the most suitable team member.

Rules:
1. Choose ONLY from availableTasks.
2. Never choose blockedTasks.
3. A task is READY only when dependencyId is null OR dependencyId is already completed.
4. Match task type with team member skills.
5. Consider role suitability.
6. Avoid assigning tasks to overloaded team members.
7. Prefer team members with fewer active IN_PROGRESS tasks.
8. Consider capacity.
9. Prefer high-priority tasks that unlock future work.
10. Provide a clear PM-style reason.

Return ONLY JSON in this format:

{
  "taskId": 1,
  "assigneeId": 2,
  "reason": "Explain why this READY task is assigned to this person considering dependencies, skills, role, capacity, and workload"
}
`
      },
      {
        role: "user",
        content: JSON.stringify({
          projectGoal,
          completedTaskIds: completedIds,
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