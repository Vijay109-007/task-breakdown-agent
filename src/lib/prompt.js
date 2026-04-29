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
   - task (string)
   - description (string)
   - priority (high | medium | low)
   - effort (story points, e.g., "3 story points")
   - sprint (e.g., "Sprint 1", "Sprint 2")
   - dependency (MUST be EXACT task name or "None")

2. Dependencies MUST follow:
   - Use EXACT task names from the generated task list
   - DO NOT use vague terms like "all tasks", "previous tasks", "development tasks"
   - Only ONE dependency per task
   - If no dependency, use "None"

3. Tasks should follow logical Agile order:
   Requirements → Design → Development → Testing → Deployment

4. Distribute tasks across multiple sprints realistically.

5. Return ONLY valid JSON in this exact format:

{
  "tasks": [
    {
      "task": "Task title",
      "description": "Short explanation",
      "priority": "high",
      "effort": "3 story points",
      "sprint": "Sprint 1",
      "dependency": "None"
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