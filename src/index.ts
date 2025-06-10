import OpenAI from "openai";
import readline from "node:readline";
import { stdin, stdout } from "node:process";
import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";
import { generateICS, timeOverlap } from "./icsHelper";

dotenv.config();
const apiKey = process.env.OPENAI_API_KEY;

const client = new OpenAI({ apiKey });

const rl = readline.createInterface({
  input: stdin,
  output: stdout,
});

const messages = [] as any;
let events = [] as any;

async function parseLLMResponse(response: any) {
  const parsedResponse = JSON.parse(response);

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

function checkEventAvailability(
  startTime: string,
  endTime: string,
  defaultDurationMinutes = 60
) {
  console.log("Calling checkEventAvailability", startTime, endTime);
  const newStart = new Date(startTime);
  const newEnd = endTime
    ? new Date(endTime)
    : new Date(newStart.getTime() + defaultDurationMinutes * 60_000);

  return events.every(
    ({ startTime, endTime }: { startTime: string; endTime: string }) => {
      const existingStart = new Date(startTime);
      const existingEnd = endTime
        ? new Date(endTime)
        : new Date(existingStart.getTime() + defaultDurationMinutes * 60_000);

      return !timeOverlap(newStart, newEnd, existingStart, existingEnd);
    }
  );
}

function seeScheduledEvents() {
  console.log("Showing events:", events);
  return true;
}

function scheduleEvent(
  startTime: string,
  endTime: string,
  name: string,
  email: string,
  description?: string,
  location?: string
) {
  console.log(
    "Calling scheduleEvent",
    startTime,
    endTime,
    name,
    email,
    description,
    location
  );
  events.push({
    startTime,
    endTime,
    name,
    email,
    description,
    location,
  });
  return true;
}

function generateEventSchedule() {
  console.log("Generating ICS file...");
  const icsContent = generateICS(events);
  fs.writeFile("invite.ics", icsContent, "utf-8");
  return true;
}

function removeEvent(
  startTime: string,
  endTime: string,
  name: string,
  email: string,
  description?: string,
  location?: string
) {
  console.log(
    "Calling removeEvent",
    startTime,
    endTime,
    name,
    email,
    description,
    location
  );
  events = events.filter((event: { name: string }) => event.name !== name);
  return true;
}

const availableFunctions = {
  checkEventAvailability: checkEventAvailability,
  scheduleEvent: scheduleEvent,
  removeEvent: removeEvent,
  seeScheduledEvents: seeScheduledEvents,
  generateEventSchedule: generateEventSchedule,
} as any;

async function main() {
  const systemPromptPath = path.join(__dirname, "SYSTEM_PROMPT.md");
  const SYSTEM_PROMPT = await fs.readFile(systemPromptPath, "utf-8");
  messages.push({
    role: "system",
    content: `${SYSTEM_PROMPT} The current year is ${new Date().getFullYear()}.`,
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
