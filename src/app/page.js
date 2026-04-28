import { generateTasks } from "../lib/prompt.js";

const input = "Build a login system";

const result = await generateTasks(input);

console.log(JSON.stringify(result, null, 2));