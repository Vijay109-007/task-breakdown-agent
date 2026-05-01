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

2. ID rules:
   - Start ids from 1
   - Use sequential ids: 1, 2, 3, 4...
   - Do not skip numbers

3. Dependency rules:
   - The first task must have dependencyId: null
   - All other tasks should depend logically on a previous task
   - Avoid multiple independent starting tasks unless truly required
   - dependencyId must refer to an existing earlier task id
   - A task must not depend on itself
   - Do not create vague dependencies

4. Workflow rules:
   - Create a clear execution flow, not a flat task list
   - Follow logical Agile order:
     Requirements → User Stories → Design → Architecture → Development → Testing → Deployment → Monitoring
   - Tasks in later sprints should usually depend on earlier sprint tasks

5. Sprint rules:
   - Distribute tasks across multiple sprints realistically
   - Each sprint should contain related work
   - Do not put testing or deployment before development tasks

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
  } catch {
    console.log("Invalid JSON:", raw);
    return raw;
  }
}