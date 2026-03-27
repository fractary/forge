/**
 * Claude Code Tool Shims - Grep, Glob, LS
 *
 * Registers Grep, Glob, and LS tools that mirror Claude Code's built-in tools,
 * allowing Claude Code agents and skills to run in pi without modification.
 *
 * Implementation:
 *   Grep  → rg (ripgrep, bundled with pi) with grep -r fallback
 *   Glob  → rg --files with find fallback
 *   LS    → ls -la
 *
 * Derived from: @mariozechner/pi-coding-agent@0.63.1 extension API
 * On pi update: check ExtensionAPI / pi-tui imports for breaking changes.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Text } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";

const execFileAsync = promisify(execFile);

const MAX_OUTPUT_CHARS = 50_000;
const MAX_LINES = 500;

/** POSIX-safe shell quoting (used only for display, not execution) */
function shellQuote(s: string): string {
	return "'" + s.replace(/'/g, "'\\''") + "'";
}

function truncateLines(lines: string[], toolName: string): string {
	if (lines.length > MAX_LINES) {
		return (
			lines.slice(0, MAX_LINES).join("\n") +
			`\n\n[${toolName}: showing first ${MAX_LINES} of ${lines.length} results. Refine your pattern to narrow results.]`
		);
	}
	return lines.join("\n");
}

function truncateChars(output: string, toolName: string): string {
	if (output.length > MAX_OUTPUT_CHARS) {
		return output.slice(0, MAX_OUTPUT_CHARS) + `\n\n[${toolName}: output truncated at 50KB]`;
	}
	return output;
}

/** Check if rg is available — cached after first call */
let rgAvailable: boolean | undefined;
async function hasRipgrep(): Promise<boolean> {
	if (rgAvailable !== undefined) return rgAvailable;
	try {
		await execFileAsync("rg", ["--version"]);
		rgAvailable = true;
	} catch {
		rgAvailable = false;
	}
	return rgAvailable;
}

// ─── Parameter schemas (matching Claude Code's signatures) ──────────────────

const GrepParams = Type.Object({
	pattern: Type.String({ description: "Regex pattern to search for in file contents" }),
	path: Type.Optional(
		Type.String({ description: "Directory or file to search. Defaults to current working directory." }),
	),
	include: Type.Optional(
		Type.String({ description: "Glob pattern to filter which files are searched (e.g. *.ts, **/*.md)" }),
	),
});

const GlobParams = Type.Object({
	pattern: Type.String({ description: "Glob pattern to match files (e.g. **/*.ts, src/**/*.json)" }),
	path: Type.Optional(
		Type.String({ description: "Directory to search within. Defaults to current working directory." }),
	),
});

const LsParams = Type.Object({
	path: Type.String({ description: "Directory path to list" }),
});

// ─── Extension ──────────────────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
	// ── Grep ──────────────────────────────────────────────────────────────────

	pi.registerTool({
		name: "Grep",
		label: "Grep",
		description:
			"Search for a regex pattern in file contents. Returns matching lines with file path and line number. Use the include parameter to filter by file type.",
		parameters: GrepParams,

		async execute(_toolCallId, params, signal, _onUpdate, ctx) {
			const searchPath = resolve(ctx.cwd, params.path ?? ".");

			try {
				let stdout: string;

				if (await hasRipgrep()) {
					// rg -n: line numbers, --no-heading: path:line:content format (matches Claude Code output)
					const args = ["rg", "-n", "--no-heading", "--color=never"];
					if (params.include) args.push("--glob", params.include);
					args.push(params.pattern, searchPath);

					const result = await execFileAsync(args[0], args.slice(1), {
						cwd: ctx.cwd,
						maxBuffer: MAX_OUTPUT_CHARS * 2,
						signal,
					});
					stdout = result.stdout;
				} else {
					// grep fallback
					const args = ["grep", "-r", "-n", "--color=never"];
					if (params.include) args.push(`--include=${params.include}`);
					args.push(params.pattern, searchPath);

					const result = await execFileAsync(args[0], args.slice(1), {
						cwd: ctx.cwd,
						maxBuffer: MAX_OUTPUT_CHARS * 2,
						signal,
					});
					stdout = result.stdout;
				}

				const lines = stdout.trim().split("\n").filter(Boolean);
				if (lines.length === 0) {
					return { content: [{ type: "text", text: "No matches found" }] };
				}

				const text = truncateChars(truncateLines(lines, "Grep"), "Grep");
				return {
					content: [{ type: "text", text }],
					details: { matchCount: lines.length },
				};
			} catch (error: any) {
				// Exit code 1 from rg/grep means no matches — not an error
				if (error.code === 1) {
					return { content: [{ type: "text", text: "No matches found" }] };
				}
				return { content: [{ type: "text", text: `Grep error: ${error.message}` }] };
			}
		},

		renderCall(args, theme) {
			let text = theme.fg("toolTitle", theme.bold("Grep ")) + theme.fg("accent", `"${args.pattern}"`);
			if (args.path) text += theme.fg("muted", ` in ${args.path}`);
			if (args.include) text += theme.fg("dim", ` [${args.include}]`);
			return new Text(text, 0, 0);
		},

		renderResult(result, _state, theme) {
			const details = result.details as { matchCount?: number } | undefined;
			if (details?.matchCount !== undefined) {
				return new Text(
					details.matchCount > MAX_LINES
						? theme.fg("warning", `${details.matchCount} matches (truncated to ${MAX_LINES})`)
						: theme.fg("muted", `${details.matchCount} match(es)`),
					0,
					0,
				);
			}
			const text = result.content[0];
			const output = text?.type === "text" ? text.text : "";
			return new Text(theme.fg("dim", output === "No matches found" ? "No matches" : output), 0, 0);
		},
	});

	// ── Glob ──────────────────────────────────────────────────────────────────

	pi.registerTool({
		name: "Glob",
		label: "Glob",
		description:
			"Find files matching a glob pattern. Returns a list of matching file paths sorted by modification time (newest first).",
		parameters: GlobParams,

		async execute(_toolCallId, params, signal, _onUpdate, ctx) {
			const searchPath = resolve(ctx.cwd, params.path ?? ".");

			try {
				let files: string[];

				if (await hasRipgrep()) {
					// rg --files lists all files; --glob filters by pattern
					const result = await execFileAsync("rg", ["--files", "--color=never", "--glob", params.pattern, searchPath], {
						cwd: ctx.cwd,
						maxBuffer: MAX_OUTPUT_CHARS * 2,
						signal,
					});
					files = result.stdout.trim().split("\n").filter(Boolean);
				} else {
					// find fallback — convert **/*.ext → -name "*.ext"
					const basename = params.pattern.replace(/^(\*\*\/)+/, "");
					const result = await execFileAsync("find", [searchPath, "-type", "f", "-name", basename], {
						cwd: ctx.cwd,
						maxBuffer: MAX_OUTPUT_CHARS * 2,
						signal,
					});
					files = result.stdout.trim().split("\n").filter(Boolean);
				}

				if (files.length === 0) {
					return { content: [{ type: "text", text: "No files found" }] };
				}

				const text = truncateChars(truncateLines(files, "Glob"), "Glob");
				return {
					content: [{ type: "text", text }],
					details: { fileCount: files.length },
				};
			} catch (error: any) {
				if (error.code === 1) {
					return { content: [{ type: "text", text: "No files found" }] };
				}
				return { content: [{ type: "text", text: `Glob error: ${error.message}` }] };
			}
		},

		renderCall(args, theme) {
			let text = theme.fg("toolTitle", theme.bold("Glob ")) + theme.fg("accent", args.pattern);
			if (args.path) text += theme.fg("muted", ` in ${args.path}`);
			return new Text(text, 0, 0);
		},

		renderResult(result, _state, theme) {
			const details = result.details as { fileCount?: number } | undefined;
			if (details?.fileCount !== undefined) {
				return new Text(
					details.fileCount > MAX_LINES
						? theme.fg("warning", `${details.fileCount} files (truncated to ${MAX_LINES})`)
						: theme.fg("muted", `${details.fileCount} file(s)`),
					0,
					0,
				);
			}
			const text = result.content[0];
			const output = text?.type === "text" ? text.text : "";
			return new Text(theme.fg("dim", output === "No files found" ? "No files found" : output), 0, 0);
		},
	});

	// ── LS ────────────────────────────────────────────────────────────────────

	pi.registerTool({
		name: "LS",
		label: "LS",
		description: "List the contents of a directory, including hidden files.",
		parameters: LsParams,

		async execute(_toolCallId, params, signal, _onUpdate, ctx) {
			const targetPath = resolve(ctx.cwd, params.path);

			try {
				const { stdout } = await execFileAsync("ls", ["-la", targetPath], {
					cwd: ctx.cwd,
					maxBuffer: MAX_OUTPUT_CHARS * 2,
					signal,
				});

				return {
					content: [{ type: "text", text: truncateChars(stdout.trim(), "LS") }],
				};
			} catch (error: any) {
				return { content: [{ type: "text", text: `LS error: ${error.message}` }] };
			}
		},

		renderCall(args, theme) {
			return new Text(
				theme.fg("toolTitle", theme.bold("LS ")) + theme.fg("accent", shellQuote(args.path)),
				0,
				0,
			);
		},

		renderResult(result, _state, theme) {
			const text = result.content[0];
			const output = text?.type === "text" ? text.text : "";
			// ls -la output starts with "total N" — exclude that from item count
			const items = output.split("\n").filter((l) => l && !l.startsWith("total"));
			return new Text(theme.fg("muted", `${items.length} item(s)`), 0, 0);
		},
	});
}
