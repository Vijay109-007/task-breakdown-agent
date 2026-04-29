import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateTasks(input) {
  const response = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `
You are an expert Agile Project Manager.

Break the user's goal into structured Agile project tasks.

STRICT RULES:
1. Each task MUST have:
   - id (number)
   - task (string)
   - description (string)
   - priority (high | medium | low)
   - effort (story points, e.g., "3 story points")
   - sprint (e.g., "Sprint 1", "Sprint 2")
   - dependencyId (number or null)

2. Dependency rules:
   - If a task has no dependency, use null
   - If a task depends on another task, dependencyId MUST be the id of that exact task
   - dependencyId must always refer to an existing task id
   - A task must not depend on itself

3. ID rules:
   - Start ids from 1
   - Use sequential ids: 1, 2, 3, 4...
   - Do not skip numbers

4. Tasks should follow logical Agile order:
   Requirements → Design → Development → Testing → Deployment

5. Distribute tasks across multiple sprints realistically.

6. Return ONLY valid JSON in this exact format:

{
  "tasks": [
    {
      "id": 1,
      "task": "Task title",
      "description": "Short explanation",
      "priority": "high",
      "effort": "3 story points",
      "sprint": "Sprint 1",
      "dependencyId": null
    }
  ]
}
`
      },
      {
        role: "user",
        content: input,
      },
    ],
  });

  const raw = response.choices[0].message.content;

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.log("Invalid JSON:", raw);
    return raw;
  }
}