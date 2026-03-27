# pi Agent Model Selection

Reference guide for selecting and configuring LLM models in pi subagents.

## Format

The model string format is `provider/model-id`, optionally suffixed with a thinking level:

```
provider/model-id
provider/model-id:thinking-level
```

**Thinking levels:** `off`, `minimal`, `low`, `medium`, `high`, `xhigh`

Example: `anthropic/claude-sonnet-4-6:high`

---

## Where to Set the Model

### 1. Agent frontmatter (default for that agent)

```yaml
---
name: my-agent
description: Does a thing
model: anthropic/claude-haiku-4-5
---
```

### 2. Single agent tool call override

```
subagent({
  agent: "my-agent",
  task: "...",
  model: "google/gemini-2.5-flash"
})
```

### 3. Chain step override

```
subagent({
  chain: [
    { agent: "scout",   task: "...", model: "google/gemini-2.5-flash" },
    { agent: "planner", task: "...", model: "anthropic/claude-sonnet-4-6" }
  ]
})
```

### 4. Parallel task override

```
subagent({
  tasks: [
    { agent: "analyzer", task: "...", model: "anthropic/claude-haiku-4-5" },
    { agent: "reviewer", task: "...", model: "openai/o4-mini" }
  ]
})
```

---

## Built-in Providers

### Anthropic — `ANTHROPIC_API_KEY`

| Model ID | Reasoning | Vision | Context |
|---|---|---|---|
| `claude-sonnet-4-6` | ✅ | ✅ | 1M |
| `claude-sonnet-4-5` | ✅ | ✅ | 200k |
| `claude-sonnet-4-20250514` | ✅ | ✅ | 200k |
| `claude-opus-4-6` | ✅ | ✅ | 1M |
| `claude-opus-4-5` | ✅ | ✅ | 200k |
| `claude-opus-4-1` | ✅ | ✅ | 200k |
| `claude-haiku-4-5` | ✅ | ✅ | 200k |
| `claude-3-7-sonnet-latest` | ✅ | ✅ | 200k |
| `claude-3-5-sonnet-20241022` | ❌ | ✅ | 200k |
| `claude-3-5-haiku-latest` | ❌ | ✅ | 200k |

Use prefix: `anthropic/claude-sonnet-4-6`

---

### Google — `GEMINI_API_KEY`

| Model ID | Reasoning | Vision | Context |
|---|---|---|---|
| `gemini-3.1-pro-preview` | ✅ | ✅ | 1M |
| `gemini-3-pro-preview` | ✅ | ✅ | 1M |
| `gemini-3-flash-preview` | ✅ | ✅ | 1M |
| `gemini-2.5-pro` | ✅ | ✅ | 1M |
| `gemini-2.5-flash` | ✅ | ✅ | 1M |
| `gemini-2.5-flash-lite` | ✅ | ✅ | 1M |
| `gemini-2.0-flash` | ❌ | ✅ | 1M |
| `gemini-2.0-flash-lite` | ❌ | ✅ | 1M |
| `gemini-1.5-pro` | ❌ | ✅ | 1M |
| `gemini-1.5-flash` | ❌ | ✅ | 1M |

Use prefix: `google/gemini-2.5-flash`

---

### OpenAI — `OPENAI_API_KEY`

| Model ID | Reasoning | Vision | Context |
|---|---|---|---|
| `gpt-5` | ✅ | ✅ | 400k |
| `gpt-5-mini` | ✅ | ✅ | 400k |
| `gpt-4.1` | ❌ | ✅ | 1M |
| `gpt-4.1-mini` | ❌ | ✅ | 1M |
| `gpt-4.1-nano` | ❌ | ✅ | 1M |
| `gpt-4o` | ❌ | ✅ | 128k |
| `gpt-4o-mini` | ❌ | ✅ | 128k |
| `o4-mini` | ✅ | ✅ | 200k |
| `o3` | ✅ | ✅ | 200k |
| `o3-mini` | ✅ | ❌ | 200k |
| `o1` | ✅ | ✅ | 200k |

Use prefix: `openai/gpt-4.1`

---

### xAI (Grok) — `XAI_API_KEY`

| Model ID | Reasoning | Vision | Context |
|---|---|---|---|
| `grok-4` | ✅ | ❌ | 256k |
| `grok-4-fast` | ✅ | ✅ | 2M |
| `grok-4-1-fast` | ✅ | ✅ | 2M |
| `grok-code-fast-1` | ✅ | ❌ | 256k |
| `grok-3` | ❌ | ❌ | 131k |
| `grok-3-mini` | ✅ | ❌ | 131k |
| `grok-3-mini-fast` | ✅ | ❌ | 131k |

Use prefix: `xai/grok-4`

---

### Mistral — `MISTRAL_API_KEY`

| Model ID | Reasoning | Vision | Context |
|---|---|---|---|
| `mistral-large-latest` | ❌ | ✅ | 262k |
| `mistral-medium-latest` | ❌ | ✅ | 128k |
| `mistral-small-latest` | ❌ | ✅ | 128k |
| `devstral-medium-latest` | ❌ | ❌ | 262k |
| `devstral-small-2507` | ❌ | ❌ | 128k |
| `codestral-latest` | ❌ | ❌ | 256k |
| `magistral-medium-latest` | ✅ | ❌ | 128k |
| `pixtral-large-latest` | ❌ | ✅ | 128k |

Use prefix: `mistral/devstral-medium-latest`

---

### Groq — `GROQ_API_KEY`

| Model ID | Reasoning | Vision | Context |
|---|---|---|---|
| `llama-3.3-70b-versatile` | ❌ | ❌ | 131k |
| `llama-3.1-8b-instant` | ❌ | ❌ | 131k |
| `moonshotai/kimi-k2-instruct` | ❌ | ❌ | 131k |
| `qwen-qwq-32b` | ✅ | ❌ | 131k |
| `deepseek-r1-distill-llama-70b` | ✅ | ❌ | 131k |

Use prefix: `groq/llama-3.3-70b-versatile`

---

### Cerebras — `CEREBRAS_API_KEY`

High-speed inference for open-source models. Requires a custom entry in `~/.pi/agent/models.json` (see [Custom Models](#custom-models) below).

| Model ID | Reasoning | Vision | Context | Max Output |
|---|---|---|---|---|
| `llama3.1-8b` | ❌ | ❌ | 32k | 8k |
| `gpt-oss-120b` | ❌ | ❌ | 131k | 16k |
| `zai-glm-4.7` | ❌ | ❌ | 131k | 16k |
| `qwen-3-235b-a22b-instruct-2507` | ❌ | ❌ | 131k | 16k |

Use prefix: `cerebras/llama3.1-8b`

---

### OpenRouter — `OPENROUTER_API_KEY`

246 models from all major providers via a single API key. Useful when you want access to many providers without managing individual keys.

Notable models:

| Model ID | Reasoning | Vision | Context |
|---|---|---|---|
| `anthropic/claude-sonnet-4.6` | ✅ | ✅ | 1M |
| `anthropic/claude-opus-4.5` | ✅ | ✅ | 200k |
| `google/gemini-2.5-pro` | ✅ | ✅ | 1M |
| `google/gemini-3-pro-preview` | ✅ | ✅ | 1M |
| `openai/gpt-5` | ✅ | ✅ | 400k |
| `openai/o4-mini` | ✅ | ✅ | 200k |
| `deepseek/deepseek-r1` | ✅ | ❌ | 64k |
| `deepseek/deepseek-v3.2` | ✅ | ❌ | 164k |
| `qwen/qwen3-235b-a22b` | ✅ | ❌ | 131k |
| `x-ai/grok-4` | ✅ | ✅ | 256k |
| `meta-llama/llama-4-maverick` | ❌ | ✅ | 1M |
| `mistralai/devstral-medium` | ❌ | ❌ | 131k |

Use prefix: `openrouter/anthropic/claude-sonnet-4.6`

---

### Amazon Bedrock — AWS credentials

83 models. Requires AWS credentials configured in environment.

Notable models:

| Model ID | Notes |
|---|---|
| `anthropic.claude-sonnet-4-6` | Claude Sonnet 4.6 via Bedrock |
| `anthropic.claude-opus-4-6-v1` | Claude Opus 4.6 via Bedrock |
| `amazon.nova-premier-v1:0` | Nova Premier, 1M ctx |
| `deepseek.r1-v1:0` | DeepSeek R1 |
| `meta.llama4-maverick-17b-instruct-v1:0` | Llama 4 Maverick |

Use prefix: `amazon-bedrock/anthropic.claude-sonnet-4-6`

---

## Custom Models

Add custom providers (Ollama, vLLM, Cerebras, proxies, etc.) via `~/.pi/agent/models.json`. The file reloads every time you open `/model` — no restart needed.

### Minimal example (Ollama)

```json
{
  "providers": {
    "ollama": {
      "baseUrl": "http://localhost:11434/v1",
      "api": "openai-completions",
      "apiKey": "ollama",
      "compat": {
        "supportsDeveloperRole": false,
        "supportsReasoningEffort": false
      },
      "models": [
        { "id": "llama3.1:8b" },
        { "id": "qwen2.5-coder:7b" }
      ]
    }
  }
}
```

Then reference as: `ollama/llama3.1:8b`

### Full example (Cerebras)

Cerebras exposes an OpenAI-compatible API and requires a custom entry:

```json
{
  "providers": {
    "cerebras": {
      "baseUrl": "https://api.cerebras.ai/v1",
      "apiKey": "CEREBRAS_API_KEY",
      "api": "openai-completions",
      "compat": {
        "supportsDeveloperRole": false,
        "supportsReasoningEffort": false
      },
      "models": [
        {
          "id": "llama3.1-8b",
          "name": "Llama 3.1 8B (Cerebras)",
          "reasoning": false,
          "input": ["text"],
          "contextWindow": 32768,
          "maxTokens": 8192,
          "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 }
        },
        {
          "id": "gpt-oss-120b",
          "name": "GPT OSS 120B (Cerebras)",
          "reasoning": false,
          "input": ["text"],
          "contextWindow": 131072,
          "maxTokens": 16384,
          "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 }
        },
        {
          "id": "zai-glm-4.7",
          "name": "Z.ai GLM 4.7 (Cerebras)",
          "reasoning": false,
          "input": ["text"],
          "contextWindow": 131072,
          "maxTokens": 16384,
          "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 }
        },
        {
          "id": "qwen-3-235b-a22b-instruct-2507",
          "name": "Qwen 3 235B (Cerebras)",
          "reasoning": false,
          "input": ["text"],
          "contextWindow": 131072,
          "maxTokens": 16384,
          "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 }
        }
      ]
    }
  }
}
```

### API key configuration

The `apiKey` field in `models.json` supports three formats:

| Format | Example | Notes |
|---|---|---|
| Environment variable name | `"CEREBRAS_API_KEY"` | Pi reads the named env var at request time |
| Shell command | `"!cat ~/.secrets/cerebras"` | Executed at request time |
| Literal value | `"csk-abc123..."` | Hardcoded — avoid for secrets |

> **Important:** Pi reads `apiKey` as a **shell environment variable**, not from `.env` files. A project `.env` file is not automatically loaded into the shell environment.
>
> To verify your key is available: `echo $CEREBRAS_API_KEY`

**Recommended: add to your shell profile** (`~/.bashrc`, `~/.zshrc`, etc.):

```bash
export CEREBRAS_API_KEY=csk-your-key-here
```

Alternatively, source your `.env` before starting pi:

```bash
set -a && source .env && set +a && pi
```

Or reference the file directly in `models.json` to avoid touching your shell profile:

```json
"apiKey": "!grep CEREBRAS_API_KEY /path/to/project/.env | cut -d= -f2"
```

---

## Picking a Model for Subagents

| Use Case | Recommended Model |
|---|---|
| Fast / cheap worker agents | `anthropic/claude-haiku-4-5`, `google/gemini-2.5-flash`, `openai/o4-mini` |
| Code generation / analysis | `anthropic/claude-sonnet-4-6`, `mistral/devstral-medium-latest` |
| Complex reasoning / planning | `anthropic/claude-opus-4-6`, `google/gemini-3.1-pro-preview`, `openai/o3` |
| Vision / image tasks | `anthropic/claude-sonnet-4-6`, `google/gemini-2.5-pro` |
| Long context (>200k) | `google/gemini-2.5-pro` (1M), `anthropic/claude-sonnet-4-6` (1M) |
| Fast open-source inference | `cerebras/qwen-3-235b-a22b-instruct-2507`, `cerebras/gpt-oss-120b` |
| Local / offline | Custom via `models.json` with Ollama |
| Budget-conscious multi-agent | `groq/llama-3.3-70b-versatile`, `google/gemini-2.5-flash` |
