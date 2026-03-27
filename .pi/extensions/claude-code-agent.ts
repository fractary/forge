/**
 * Claude Code Agent() Shim
 *
 * Registers the `Agent` tool that mirrors Claude Code v2.1.63+'s Agent() tool
 * (which replaced Task() while remaining backward compatible).
 *
 * Maps Agent({ description, prompt }) → pi subagent execution via pi-subagents internals.
 *
 * Agent name resolution:
 *   1. `description` is normalised to kebab-case and matched against discovered agents
 *   2. If no match, returns a clear error listing available agents
 *
 * Derived from: pi-subagents@0.11.11 execution/agents/artifacts APIs
 * On pi-subagents update: verify runSync / discoverAgents / getArtifactsDir signatures.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Text } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";
import { randomUUID } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Re-use pi-subagents internals — same process, same node_modules
// NOTE: use .ts extension (not .js) — pi-subagents ships only TypeScript sources;
// jiti resolves .js→.ts for relative imports but NOT for package subpath imports.
import { runSync } from "pi-subagents/execution.ts";
import { discoverAgents } from "pi-subagents/agents.ts";
import { getArtifactsDir, ensureArtifactsDir } from "pi-subagents/artifacts.ts";

// ─── Parameter schema (Claude Code Agent() format) ───────────────────────────

const AgentParams = Type.Object({
	description: Type.String({
		description: "Name or short description of the agent to invoke (matched to a pi agent by name)",
	}),
	prompt: Type.String({
		description: "The full task or instructions to pass to the agent",
	}),
});

interface AgentDetails {
	description: string;
	resolvedAgent: string | null;
	prompt: string;
	error?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Normalise a Claude Code description to a pi agent name (kebab-case, lowercase) */
function normaliseToAgentName(description: string): string {
	return description
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

/** Find best matching agent: exact name → prefix → normalised description */
function resolveAgent(description: string, cwd: string): string | null {
	const { agents } = discoverAgents(cwd, "both");
	if (agents.length === 0) return null;

	const normalised = normaliseToAgentName(description);

	// 1. Exact match on name
	const exact = agents.find((a) => a.name === description || a.name === normalised);
	if (exact) return exact.name;

	// 2. Prefix match (e.g. "forge-skill" matches "fractary-forge-skill-creator")
	const prefix = agents.find((a) => a.name.includes(normalised) || normalised.includes(a.name));
	if (prefix) return prefix.name;

	return null;
}

// ─── Extension ───────────────────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "Agent",
		label: "Agent",
		description:
			"Invoke a named agent with a task. Mirrors Claude Code's Agent() tool (formerly Task()). " +
			"The description field is matched to a pi agent by name. " +
			"Use subagent() for chains, parallel execution, or management operations.",
		parameters: AgentParams,

		async execute(_toolCallId, params, signal, onUpdate, ctx) {
			// Resolve agent name from description
			const resolvedAgent = resolveAgent(params.description, ctx.cwd);

			if (!resolvedAgent) {
				const { agents } = discoverAgents(ctx.cwd, "both");
				const available = agents.map((a) => `  • ${a.name}`).join("\n") || "  (none found)";
				return {
					content: [
						{
							type: "text",
							text:
								`Agent not found: "${params.description}" (normalised: "${normaliseToAgentName(params.description)}")\n\n` +
								`Available agents:\n${available}`,
						},
					],
					details: {
						description: params.description,
						resolvedAgent: null,
						prompt: params.prompt,
						error: `No agent matched "${params.description}"`,
					} as AgentDetails,
				};
			}

			// Set up artifacts dir (mirrors what subagent-executor does)
			const sessionFile = ctx.sessionManager?.getSessionFile?.() ?? null;
			const artifactsDir = sessionFile
				? getArtifactsDir(sessionFile)
				: mkdtempSync(join(tmpdir(), "pi-agent-shim-"));
			ensureArtifactsDir(artifactsDir);

			const runId = randomUUID();
			const { agents } = discoverAgents(ctx.cwd, "both");

			try {
				const result = await runSync(ctx.cwd, agents, resolvedAgent, params.prompt, {
					cwd: ctx.cwd,
					signal,
					onUpdate,
					runId,
					artifactsDir,
					index: 0,
				});

				const output = result.output ?? result.error ?? "(no output)";
				return {
					content: [{ type: "text", text: output }],
					details: {
						description: params.description,
						resolvedAgent,
						prompt: params.prompt,
					} as AgentDetails,
				};
			} catch (error: any) {
				return {
					content: [{ type: "text", text: `Agent execution error: ${error.message}` }],
					details: {
						description: params.description,
						resolvedAgent,
						prompt: params.prompt,
						error: error.message,
					} as AgentDetails,
				};
			}
		},

		renderCall(args, theme) {
			return new Text(
				theme.fg("toolTitle", theme.bold("Agent ")) +
					theme.fg("accent", args.description) +
					theme.fg("dim", ` — "${args.prompt?.slice(0, 60)}${(args.prompt?.length ?? 0) > 60 ? "…" : ""}"`),
				0,
				0,
			);
		},

		renderResult(result, _state, theme) {
			const details = result.details as AgentDetails | undefined;
			if (details?.error) {
				return new Text(theme.fg("error", `✗ ${details.error}`), 0, 0);
			}
			if (details?.resolvedAgent) {
				const text = result.content[0];
				const lines = (text?.type === "text" ? text.text : "").split("\n").filter(Boolean).length;
				return new Text(
					theme.fg("success", "✓ ") +
						theme.fg("accent", details.resolvedAgent) +
						theme.fg("muted", ` — ${lines} line(s)`),
					0,
					0,
				);
			}
			const text = result.content[0];
			return new Text(text?.type === "text" ? theme.fg("muted", text.text) : "", 0, 0);
		},
	});
}
