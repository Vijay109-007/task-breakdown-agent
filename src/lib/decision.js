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
  projectGoal
) {
  const completedIds = Array.from(completedTaskIds);

  const availableTasks = tasks.filter(
    (task) =>
      !completedTaskIds.has(task.id) &&
      (task.dependencyId === null || completedTaskIds.has(task.dependencyId))
  );

  const response = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `
You are a senior Agile Project Manager.

Your job is to assign READY tasks to the most suitable team member.

Rules:
1. Only assign from availableTasks.
2. Match task type with team member skills.
3. Consider role suitability (frontend, backend, QA, PM).
4. Prefer balanced workload (capacity).
5. Assign one task at a time.
6. Provide a clear reason.

Return ONLY JSON in this format:

{
  "taskId": 1,
  "assigneeId": 2,
  "reason": "Explain why this person is best suited for this task"
}
`
      },
      {
        role: "user",
        content: JSON.stringify({
          projectGoal,
          completedTaskIds: completedIds,
          availableTasks,
          teamMembers,
        }),
      },
    ],
  });

  return JSON.parse(response.choices[0].message.content);
}