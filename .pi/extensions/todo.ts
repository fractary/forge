/**
 * Todo Extension - Demonstrates state management via session entries
 *
 * Derived from: @mariozechner/pi-coding-agent@0.63.1 examples/extensions/todo.ts
 * Changes: Added TodoWrite and TodoRead Claude Code shim tools (shared state).
 * On pi update: diff against updated example and re-apply shim additions.
 *
 * This extension:
 * - Registers a `todo` tool for the LLM to manage todos (pi-native)
 * - Registers `TodoWrite` and `TodoRead` tools (Claude Code shim)
 * - Registers a `/todos` command for users to view the list
 *
 * All three tools share the same in-memory state and session persistence,
 * so pi-native agents and Claude Code-style agents see the same todo list.
 *
 * State is stored in tool result details (not external files), which allows
 * proper branching - when you branch, the todo state is automatically
 * correct for that point in history.
 */

import { StringEnum } from "@mariozechner/pi-ai";
import type { ExtensionAPI, ExtensionContext, Theme } from "@mariozechner/pi-coding-agent";
import { matchesKey, Text, truncateToWidth } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";

interface Todo {
	id: number;
	text: string;
	done: boolean;
	// Claude Code compatibility fields (preserved through TodoWrite/TodoRead round-trips)
	ccId?: string;
	priority?: "high" | "medium" | "low";
	ccStatus?: "pending" | "in_progress" | "completed";
}

interface TodoDetails {
	action: "list" | "add" | "toggle" | "clear";
	todos: Todo[];
	nextId: number;
	error?: string;
}

// Snapshot stored in TodoWrite/TodoRead tool results for session reconstruction
interface CcDetails {
	tool: "TodoWrite" | "TodoRead";
	todos: Todo[];
	nextId: number;
}

const TodoParams = Type.Object({
	action: StringEnum(["list", "add", "toggle", "clear"] as const),
	text: Type.Optional(Type.String({ description: "Todo text (for add)" })),
	id: Type.Optional(Type.Number({ description: "Todo ID (for toggle)" })),
});

// Claude Code TodoWrite schema
const CcTodoItem = Type.Object({
	id: Type.String({ description: "Unique identifier for the todo item" }),
	content: Type.String({ description: "The todo item text content" }),
	status: StringEnum(["pending", "in_progress", "completed"] as const),
	priority: StringEnum(["high", "medium", "low"] as const),
});

const TodoWriteParams = Type.Object({
	todos: Type.Array(CcTodoItem, { description: "The complete updated todo list to replace the current list" }),
});

// Claude Code TodoRead takes no parameters
const TodoReadParams = Type.Object({});

/**
 * UI component for the /todos command
 */
class TodoListComponent {
	private todos: Todo[];
	private theme: Theme;
	private onClose: () => void;
	private cachedWidth?: number;
	private cachedLines?: string[];

	constructor(todos: Todo[], theme: Theme, onClose: () => void) {
		this.todos = todos;
		this.theme = theme;
		this.onClose = onClose;
	}

	handleInput(data: string): void {
		if (matchesKey(data, "escape") || matchesKey(data, "ctrl+c")) {
			this.onClose();
		}
	}

	render(width: number): string[] {
		if (this.cachedLines && this.cachedWidth === width) {
			return this.cachedLines;
		}

		const lines: string[] = [];
		const th = this.theme;

		lines.push("");
		const title = th.fg("accent", " Todos ");
		const headerLine =
			th.fg("borderMuted", "─".repeat(3)) + title + th.fg("borderMuted", "─".repeat(Math.max(0, width - 10)));
		lines.push(truncateToWidth(headerLine, width));
		lines.push("");

		if (this.todos.length === 0) {
			lines.push(truncateToWidth(`  ${th.fg("dim", "No todos yet. Ask the agent to add some!")}`, width));
		} else {
			const done = this.todos.filter((t) => t.done).length;
			const total = this.todos.length;
			lines.push(truncateToWidth(`  ${th.fg("muted", `${done}/${total} completed`)}`, width));
			lines.push("");

			for (const todo of this.todos) {
				const check = todo.done ? th.fg("success", "✓") : th.fg("dim", "○");
				const id = th.fg("accent", `#${todo.id}`);
				// Show priority badge for CC-originated todos
				const priorityBadge = todo.priority
					? th.fg(todo.priority === "high" ? "error" : todo.priority === "medium" ? "warning" : "dim", `[${todo.priority}] `)
					: "";
				const text = todo.done ? th.fg("dim", todo.text) : th.fg("text", todo.text);
				lines.push(truncateToWidth(`  ${check} ${id} ${priorityBadge}${text}`, width));
			}
		}

		lines.push("");
		lines.push(truncateToWidth(`  ${th.fg("dim", "Press Escape to close")}`, width));
		lines.push("");

		this.cachedWidth = width;
		this.cachedLines = lines;
		return lines;
	}

	invalidate(): void {
		this.cachedWidth = undefined;
		this.cachedLines = undefined;
	}
}

export default function (pi: ExtensionAPI) {
	// In-memory state (reconstructed from session on load)
	let todos: Todo[] = [];
	let nextId = 1;

	/**
	 * Reconstruct state from session entries.
	 * Scans tool results for `todo`, `TodoWrite`, and `TodoRead` and applies them in order.
	 * The last mutating tool result wins.
	 */
	const reconstructState = (ctx: ExtensionContext) => {
		todos = [];
		nextId = 1;

		for (const entry of ctx.sessionManager.getBranch()) {
			if (entry.type !== "message") continue;
			const msg = entry.message;
			if (msg.role !== "toolResult") continue;

			if (msg.toolName === "todo") {
				const details = msg.details as TodoDetails | undefined;
				if (details) {
					todos = details.todos;
					nextId = details.nextId;
				}
			} else if (msg.toolName === "TodoWrite" || msg.toolName === "TodoRead") {
				const details = msg.details as CcDetails | undefined;
				if (details) {
					todos = details.todos;
					nextId = details.nextId;
				}
			}
		}
	};

	// Reconstruct state on session events
	pi.on("session_start", async (_event, ctx) => reconstructState(ctx));
	pi.on("session_switch", async (_event, ctx) => reconstructState(ctx));
	pi.on("session_fork", async (_event, ctx) => reconstructState(ctx));
	pi.on("session_tree", async (_event, ctx) => reconstructState(ctx));

	// ─── pi-native todo tool ──────────────────────────────────────────────────

	pi.registerTool({
		name: "todo",
		label: "Todo",
		description: "Manage a todo list. Actions: list, add (text), toggle (id), clear",
		parameters: TodoParams,

		async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
			switch (params.action) {
				case "list":
					return {
						content: [
							{
								type: "text",
								text: todos.length
									? todos.map((t) => `[${t.done ? "x" : " "}] #${t.id}: ${t.text}`).join("\n")
									: "No todos",
							},
						],
						details: { action: "list", todos: [...todos], nextId } as TodoDetails,
					};

				case "add": {
					if (!params.text) {
						return {
							content: [{ type: "text", text: "Error: text required for add" }],
							details: { action: "add", todos: [...todos], nextId, error: "text required" } as TodoDetails,
						};
					}
					const newTodo: Todo = { id: nextId++, text: params.text, done: false };
					todos.push(newTodo);
					return {
						content: [{ type: "text", text: `Added todo #${newTodo.id}: ${newTodo.text}` }],
						details: { action: "add", todos: [...todos], nextId } as TodoDetails,
					};
				}

				case "toggle": {
					if (params.id === undefined) {
						return {
							content: [{ type: "text", text: "Error: id required for toggle" }],
							details: { action: "toggle", todos: [...todos], nextId, error: "id required" } as TodoDetails,
						};
					}
					const todo = todos.find((t) => t.id === params.id);
					if (!todo) {
						return {
							content: [{ type: "text", text: `Todo #${params.id} not found` }],
							details: {
								action: "toggle",
								todos: [...todos],
								nextId,
								error: `#${params.id} not found`,
							} as TodoDetails,
						};
					}
					todo.done = !todo.done;
					// Keep ccStatus in sync
					if (todo.ccStatus !== undefined) {
						todo.ccStatus = todo.done ? "completed" : "pending";
					}
					return {
						content: [{ type: "text", text: `Todo #${todo.id} ${todo.done ? "completed" : "uncompleted"}` }],
						details: { action: "toggle", todos: [...todos], nextId } as TodoDetails,
					};
				}

				case "clear": {
					const count = todos.length;
					todos = [];
					nextId = 1;
					return {
						content: [{ type: "text", text: `Cleared ${count} todos` }],
						details: { action: "clear", todos: [], nextId: 1 } as TodoDetails,
					};
				}

				default:
					return {
						content: [{ type: "text", text: `Unknown action: ${params.action}` }],
						details: {
							action: "list",
							todos: [...todos],
							nextId,
							error: `unknown action: ${params.action}`,
						} as TodoDetails,
					};
			}
		},

		renderCall(args, theme, _context) {
			let text = theme.fg("toolTitle", theme.bold("todo ")) + theme.fg("muted", args.action);
			if (args.text) text += ` ${theme.fg("dim", `"${args.text}"`)}`;
			if (args.id !== undefined) text += ` ${theme.fg("accent", `#${args.id}`)}`;
			return new Text(text, 0, 0);
		},

		renderResult(result, { expanded }, theme, _context) {
			const details = result.details as TodoDetails | undefined;
			if (!details) {
				const text = result.content[0];
				return new Text(text?.type === "text" ? text.text : "", 0, 0);
			}

			if (details.error) {
				return new Text(theme.fg("error", `Error: ${details.error}`), 0, 0);
			}

			const todoList = details.todos;

			switch (details.action) {
				case "list": {
					if (todoList.length === 0) {
						return new Text(theme.fg("dim", "No todos"), 0, 0);
					}
					let listText = theme.fg("muted", `${todoList.length} todo(s):`);
					const display = expanded ? todoList : todoList.slice(0, 5);
					for (const t of display) {
						const check = t.done ? theme.fg("success", "✓") : theme.fg("dim", "○");
						const itemText = t.done ? theme.fg("dim", t.text) : theme.fg("muted", t.text);
						listText += `\n${check} ${theme.fg("accent", `#${t.id}`)} ${itemText}`;
					}
					if (!expanded && todoList.length > 5) {
						listText += `\n${theme.fg("dim", `... ${todoList.length - 5} more`)}`;
					}
					return new Text(listText, 0, 0);
				}

				case "add": {
					const added = todoList[todoList.length - 1];
					return new Text(
						theme.fg("success", "✓ Added ") +
							theme.fg("accent", `#${added.id}`) +
							" " +
							theme.fg("muted", added.text),
						0,
						0,
					);
				}

				case "toggle": {
					const text = result.content[0];
					const msg = text?.type === "text" ? text.text : "";
					return new Text(theme.fg("success", "✓ ") + theme.fg("muted", msg), 0, 0);
				}

				case "clear":
					return new Text(theme.fg("success", "✓ ") + theme.fg("muted", "Cleared all todos"), 0, 0);
			}
		},
	});

	// ─── Claude Code shim: TodoWrite ─────────────────────────────────────────

	pi.registerTool({
		name: "TodoWrite",
		label: "TodoWrite",
		description: "Replace the entire todo list. Mirrors Claude Code's TodoWrite tool.",
		parameters: TodoWriteParams,

		async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
			// Replace entire list, mapping Claude Code format → internal format
			todos = params.todos.map((item, index) => ({
				id: index + 1,
				text: item.content,
				done: item.status === "completed",
				ccId: item.id,
				priority: item.priority,
				ccStatus: item.status,
			}));
			nextId = todos.length + 1;

			const summary = `${todos.length} todo(s): ${todos.filter((t) => !t.done).length} pending, ${todos.filter((t) => t.done).length} completed`;
			return {
				content: [{ type: "text", text: summary }],
				details: { tool: "TodoWrite", todos: [...todos], nextId } as CcDetails,
			};
		},

		renderCall(args, theme, _context) {
			const count = args.todos?.length ?? 0;
			return new Text(
				theme.fg("toolTitle", theme.bold("TodoWrite ")) + theme.fg("muted", `${count} item(s)`),
				0,
				0,
			);
		},

		renderResult(result, _state, theme, _context) {
			const details = result.details as CcDetails | undefined;
			if (!details) {
				const text = result.content[0];
				return new Text(text?.type === "text" ? text.text : "", 0, 0);
			}
			const pending = details.todos.filter((t) => !t.done).length;
			const done = details.todos.filter((t) => t.done).length;
			return new Text(
				theme.fg("success", "✓ ") +
					theme.fg("muted", `${details.todos.length} todos — `) +
					theme.fg("text", `${pending} pending`) +
					theme.fg("muted", ", ") +
					theme.fg("dim", `${done} done`),
				0,
				0,
			);
		},
	});

	// ─── Claude Code shim: TodoRead ──────────────────────────────────────────

	pi.registerTool({
		name: "TodoRead",
		label: "TodoRead",
		description: "Read the current todo list. Mirrors Claude Code's TodoRead tool.",
		parameters: TodoReadParams,

		async execute(_toolCallId, _params, _signal, _onUpdate, _ctx) {
			// Map internal format → Claude Code format
			const ccTodos = todos.map((t) => ({
				id: t.ccId ?? String(t.id),
				content: t.text,
				status: t.ccStatus ?? (t.done ? "completed" : "pending"),
				priority: t.priority ?? "medium",
			}));

			return {
				content: [
					{
						type: "text",
						text: ccTodos.length
							? JSON.stringify(ccTodos, null, 2)
							: "[]",
					},
				],
				// Store snapshot so reconstruction knows the state at this point
				details: { tool: "TodoRead", todos: [...todos], nextId } as CcDetails,
			};
		},

		renderCall(_args, theme, _context) {
			return new Text(theme.fg("toolTitle", theme.bold("TodoRead")), 0, 0);
		},

		renderResult(result, _state, theme, _context) {
			const details = result.details as CcDetails | undefined;
			if (!details) {
				const text = result.content[0];
				return new Text(text?.type === "text" ? text.text : "", 0, 0);
			}
			if (details.todos.length === 0) {
				return new Text(theme.fg("dim", "No todos"), 0, 0);
			}
			const pending = details.todos.filter((t) => !t.done).length;
			const done = details.todos.filter((t) => t.done).length;
			return new Text(
				theme.fg("muted", `${details.todos.length} todos — `) +
					theme.fg("text", `${pending} pending`) +
					theme.fg("muted", ", ") +
					theme.fg("dim", `${done} done`),
				0,
				0,
			);
		},
	});

	// ─── /todos command ───────────────────────────────────────────────────────

	pi.registerCommand("todos", {
		description: "Show all todos on the current branch",
		handler: async (_args, ctx) => {
			if (!ctx.hasUI) {
				ctx.ui.notify("/todos requires interactive mode", "error");
				return;
			}

			await ctx.ui.custom<void>((_tui, theme, _kb, done) => {
				return new TodoListComponent(todos, theme, () => done());
			});
		},
	});
}
