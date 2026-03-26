/**
 * Fractary Forge — Agent Setup Extension
 *
 * Automatically symlinks Forge agent definitions into ~/.pi/agent/agents/
 * so that pi-subagents can discover them as user-scoped agents.
 *
 * Runs on every session start but is fully idempotent:
 *   - Creates the target directory if it doesn't exist
 *   - Skips agents that are already correctly symlinked
 *   - Replaces stale symlinks (e.g. after a git pull moved files)
 *   - Never touches files it didn't create (i.e. non-symlinks with the same name)
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const AGENTS_SOURCE_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "agents"
);

const AGENTS_TARGET_DIR = path.join(os.homedir(), ".pi", "agent", "agents");

export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    try {
      // Ensure target directory exists
      fs.mkdirSync(AGENTS_TARGET_DIR, { recursive: true });

      if (!fs.existsSync(AGENTS_SOURCE_DIR)) return;

      const entries = fs.readdirSync(AGENTS_SOURCE_DIR, { withFileTypes: true });
      const agentFiles = entries.filter(
        (e) => e.name.endsWith(".md") && (e.isFile() || e.isSymbolicLink())
      );

      let linked = 0;
      let skipped = 0;

      for (const entry of agentFiles) {
        const sourcePath = path.join(AGENTS_SOURCE_DIR, entry.name);
        const targetPath = path.join(AGENTS_TARGET_DIR, entry.name);

        // Already correctly symlinked?
        if (fs.existsSync(targetPath)) {
          try {
            const stat = fs.lstatSync(targetPath);
            if (stat.isSymbolicLink()) {
              const resolved = fs.readlinkSync(targetPath);
              if (resolved === sourcePath) {
                skipped++;
                continue;
              }
              // Stale symlink — remove and re-link
              fs.unlinkSync(targetPath);
            } else {
              // Real file with same name — don't touch it
              skipped++;
              continue;
            }
          } catch {
            // Can't stat — try to remove and re-link
            try { fs.unlinkSync(targetPath); } catch {}
          }
        }

        fs.symlinkSync(sourcePath, targetPath);
        linked++;
      }

      if (linked > 0) {
        ctx.ui.notify(
          `Forge: linked ${linked} agent(s) to ~/.pi/agent/agents/`,
          "info"
        );
      }
    } catch (err) {
      // Non-fatal — don't crash pi startup
      ctx.ui.notify(
        `Forge: failed to link agents — ${(err as Error).message}`,
        "warning"
      );
    }
  });
}
