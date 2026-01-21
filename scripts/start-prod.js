const { existsSync } = require("node:fs");
const { spawnSync, spawn } = require("node:child_process");
const path = require("node:path");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required to start the server.");
  process.exit(1);
}

const migrateResult = spawnSync(
  "npx",
  ["prisma", "db", "push", "--skip-generate"],
  { stdio: "inherit" }
);

if (migrateResult.status !== 0) {
  process.exit(migrateResult.status ?? 1);
}

const port = process.env.PORT || "3000";
const hostname = "0.0.0.0";
const standaloneServer = path.join(
  process.cwd(),
  ".next",
  "standalone",
  "server.js"
);

const nextArgs = existsSync(standaloneServer)
  ? [standaloneServer]
  : ["node_modules/next/dist/bin/next", "start", "-H", hostname, "-p", port];

const command = "node";
const args = nextArgs;

const child = spawn(command, args, {
  stdio: "inherit",
  env: {
    ...process.env,
    HOSTNAME: hostname,
    PORT: port,
  },
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
