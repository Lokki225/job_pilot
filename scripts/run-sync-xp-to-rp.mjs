import { register } from "ts-node";

register({
  transpileOnly: true,
  project: "./tsconfig.json",
  compilerOptions: {
    module: "esnext",
    moduleResolution: "node",
  },
});

await import("./sync-xp-to-rp.ts");

// Ensure process exits after completion (ts-node keeps event loop open)
process.on("beforeExit", () => {
  process.exit(0);
});
