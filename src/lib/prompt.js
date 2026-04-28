import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateTasks(input) {
  const response = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    response_format: { type: "json_object" }, // ✅ force JSON output
    messages: [
      {
        role: "system",
        content: `
You are an expert Agile Project Manager.

Break the user's goal into structured project tasks.

Return ONLY valid JSON in this exact format:

{
  "tasks": [
    {
      "task": "Task title",
      "description": "Short explanation",
      "priority": "high"
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