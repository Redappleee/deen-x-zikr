import { execSync, spawn } from "node:child_process";

const port = Number(process.env.PORT ?? 3000);

if (!Number.isInteger(port) || port <= 0) {
  console.error(`Invalid PORT value: ${process.env.PORT}`);
  process.exit(1);
}

function findPidsOnPort(targetPort) {
  try {
    const output = execSync(`lsof -ti tcp:${targetPort}`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();

    if (!output) return [];
    return Array.from(new Set(output.split(/\s+/).filter(Boolean)));
  } catch {
    return [];
  }
}

const occupiedPids = findPidsOnPort(port);

if (occupiedPids.length > 0) {
  console.log(`Port ${port} is busy. Stopping process(es): ${occupiedPids.join(", ")}`);
  try {
    execSync(`kill -9 ${occupiedPids.join(" ")}`, { stdio: "ignore" });
    console.log(`Port ${port} is now free.`);
  } catch {
    console.error(`Failed to free port ${port}.`);
    process.exit(1);
  }
}

const nextCmd = process.platform === "win32" ? "next.cmd" : "next";
const child = spawn(nextCmd, ["dev", "-p", String(port)], {
  stdio: "inherit",
  shell: process.platform === "win32"
});

child.on("error", (error) => {
  console.error(`Failed to start Next.js on port ${port}: ${error.message}`);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
