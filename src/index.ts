import OpenAI from "openai";
import readline from "node:readline";
import { stdin, stdout } from "node:process";
import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";

dotenv.config();
const apiKey = process.env.OPENAI_API_KEY;

const client = new OpenAI({ apiKey });

const rl = readline.createInterface({
  input: stdin,
  output: stdout,
});

const messages = [] as any;

interface ILLMResponse {
  to: string;
  message: string;
  functionCall: {
    function: string;
    arguments: string[];
  };
}

async function parseLLMResponse(response: any) {
  const parsedResponse: ILLMResponse = JSON.parse(response);

  if (parsedResponse.to === "user") {
    console.log("Bot:", parsedResponse.message);
  } else if (parsedResponse.to === "system") {
    const fn = parsedResponse.functionCall.function;
    const args = parsedResponse.functionCall.arguments;

    const functionResponse = availableFunctions[fn](...args);
    await parseLLMResponse(
      await sendToLLM(functionResponse ? "true" : "false")
    );
  }
}

async function sendToLLM(content: string) {
  messages.push({
    role: "user",
    content,
  });

  const response = await client.chat.completions.create({
    messages,
    model: "gpt-4o",
  });

  messages.push(response.choices[0].message);
  return response.choices[0].message.content;
}

function checkEventAvailability(datetime: string) {
  console.log("Calling checkEventAvailability", datetime);
  return true;
}

function scheduleEvent(datetime: string, name: string, email: string) {
  console.log("Calling scheduleEvent", datetime, name, email);
  return true;
}

function removeEvent(datetime: string, name: string, email: string) {
  console.log("Calling removeEvent", datetime, name, email);
  return true;
}

const availableFunctions = {
  checkEventAvailability: checkEventAvailability,
  scheduleEvent: scheduleEvent,
  removeEvent: removeEvent,
} as any;

async function main() {
  const systemPromptPath = path.join(__dirname, "SYSTEM_PROMPT.md");
  const SYSTEM_PROMPT = await fs.readFile(systemPromptPath, "utf-8");
  messages.push({
    role: "system",
    content: SYSTEM_PROMPT,
  });

  while (true) {
    const input: string = await new Promise((resolve) => {
      rl.question("You: ", resolve);
    });
    const inputString = input.trim();
    const exitCondition =
      inputString.toLowerCase() === "exit" ||
      inputString.toLowerCase() === "bye";

    if (exitCondition) {
      console.log("Bot: Bye!");
      process.exit(0);
    }

    const response = await sendToLLM(inputString);
    await parseLLMResponse(response);
  }
}

main();
