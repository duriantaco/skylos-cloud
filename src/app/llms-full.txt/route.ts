export function GET() {
  const content = `# Skylos

> Static analysis tool for Python, TypeScript, and Go. Finds dead code, security vulnerabilities (SQLi, SSRF, secrets), and code quality issues. Available as CLI, MCP server, GitHub Action, and VS Code extension.

Skylos uses a hybrid engine (AST + optional LLM) to eliminate false positives from framework magic (pytest fixtures, FastAPI routes, Django models). 98.1% recall on real-world benchmarks.

## Docs
- [Documentation](https://docs.skylos.dev): Full documentation
- [GitHub](https://github.com/duriantaco/skylos): Source code and README
- [PyPI](https://pypi.org/project/skylos/): Python package
- [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=oha.skylos-vscode-extension): Editor integration
- [Changelog](https://github.com/duriantaco/skylos/blob/main/CHANGELOG.md): Version history

## API
- [MCP Server](https://github.com/duriantaco/skylos/tree/main/skylos_mcp): Model Context Protocol server for AI agent integration
- [GitHub Action](https://github.com/duriantaco/skylos/blob/main/action.yml): CI/CD integration
- [Verify API](https://skylos.dev/api/verify): Finding verification via static callgraph (POST)

## Optional
- [Benchmarks](https://github.com/duriantaco/skylos-demo): Real-world benchmark suite
- [Discord](https://discord.gg/Ftn9t9tErf): Community support

---

## Installation

\`\`\`bash
pip install skylos
\`\`\`

## CLI Usage

### Basic Analysis

\`\`\`bash
# Analyze current directory
skylos .

# Analyze with specific output format
skylos . --table          # Table output
skylos . --tree           # Tree view
skylos . --json           # JSON output
skylos . --sarif           # SARIF format

# Set confidence threshold (0-100)
skylos . --confidence 60
\`\`\`

### Security Scanning

\`\`\`bash
# Security vulnerability scan (SQLi, SSRF, path traversal)
skylos . --danger

# Secrets detection (API keys, tokens, passwords)
skylos . --secrets

# Software composition analysis (CVE scanning)
skylos . --sca

# All security checks
skylos . --danger --secrets --sca
\`\`\`

### Code Quality

\`\`\`bash
# Quality checks (circular deps, complexity, nesting)
skylos . --quality

# Quality gate for CI/CD (exits non-zero on failure)
skylos . --gate
\`\`\`

### AI-Powered Analysis

\`\`\`bash
# Hybrid analysis with LLM verification
skylos agent analyze .

# Security audit with LLM
skylos agent security-audit .

# Auto-fix issues with LLM
skylos agent fix . --line 42 --message "SQL injection"

# Scan, fix, test, and create PR
skylos agent remediate . --max-fixes 5 --dry-run
\`\`\`

### CI/CD Integration

\`\`\`bash
# Generate GitHub Actions workflow (30-second setup)
skylos cicd init

# Quality gate (use in CI pipelines)
skylos cicd gate .

# GitHub PR annotations
skylos cicd annotate --input results.json

# Inline PR review comments
skylos cicd review --input results.json --pr 123
\`\`\`

### Other Commands

\`\`\`bash
skylos credits           # Check credit balance
skylos login             # Authenticate with skylos.dev
skylos sync              # Sync results to cloud
skylos baseline .        # Create baseline for tracking new findings
skylos whitelist pattern  # Whitelist a finding
skylos init              # Initialize configuration
skylos clean             # Clean local caches
skylos badge             # Get README badge markdown
\`\`\`

---

## MCP Server

Skylos provides a Model Context Protocol (MCP) server for AI agent integration. Install and run:

\`\`\`bash
pip install skylos
python -m skylos_mcp
\`\`\`

### MCP Tools

#### analyze
Detect unused code and analyze Python projects for dead code.
- \`path\` (string, required): File or directory to analyze
- \`confidence\` (integer, default: 60): Confidence threshold (0-100)
- \`exclude_folders\` (string[], optional): Folders to exclude
- Returns: JSON with analysis summary and unused items (functions, imports, classes, variables, parameters, files)
- Available without authentication (5 calls/day limit)

#### security_scan
Scan for security vulnerabilities and dangerous code patterns.
- \`path\` (string, required): File or directory to scan
- \`confidence\` (integer, default: 60): Confidence threshold
- \`exclude_folders\` (string[], optional): Folders to exclude
- Returns: JSON with security findings
- Requires API key authentication

#### quality_check
Run code quality checks including circular dependency detection and custom rules.
- \`path\` (string, required): File or directory to check
- \`confidence\` (integer, default: 60): Confidence threshold
- \`exclude_folders\` (string[], optional): Folders to exclude
- Returns: JSON with quality metrics and circular dependencies
- Requires API key authentication

#### secrets_scan
Scan for exposed API keys and secrets in code.
- \`path\` (string, required): File or directory to scan
- \`confidence\` (integer, default: 60): Confidence threshold
- \`exclude_folders\` (string[], optional): Folders to exclude
- Returns: JSON with detected secrets
- Requires API key authentication

#### remediate
Scan for security/quality issues, generate fixes using LLM, and validate with tests.
- \`path\` (string, required): File or directory to remediate
- \`max_fixes\` (integer, default: 5): Maximum fixes to attempt
- \`dry_run\` (boolean, default: true): Preview fixes without applying
- \`model\` (string, default: "gpt-4.1"): LLM model to use
- \`test_cmd\` (string, optional): Custom test command
- \`severity\` (string, optional): Filter by severity level
- Requires API key authentication

### MCP Authentication

Set the \`SKYLOS_API_KEY\` environment variable. Generate keys at https://skylos.dev/dashboard or via \`skylos key add\`.

Rate limits:
- Free: 50 calls/hour, 5 unauthenticated calls/day per tool
- Pro: 500 calls/hour
- Enterprise: 5000 calls/hour, unlimited credits

### MCP Configuration (Claude Desktop)

\`\`\`json
{
  "mcpServers": {
    "skylos": {
      "command": "python",
      "args": ["-m", "skylos_mcp"],
      "env": {
        "SKYLOS_API_KEY": "your-api-key"
      }
    }
  }
}
\`\`\`

---

## GitHub Action

\`\`\`yaml
- uses: duriantaco/skylos@main
  with:
    path: "."
    confidence: 60
    gate: true
\`\`\`

---

## Configuration

Configure via \`pyproject.toml\`:

\`\`\`toml
[tool.skylos]
complexity = 10          # Max cyclomatic complexity
nesting = 3              # Max nesting depth
max_args = 5             # Max function arguments
max_lines = 50           # Max function lines
model = "gpt-4.1"       # LLM model for hybrid analysis
exclude = []             # Patterns to exclude
ignore = []              # Findings to ignore

[tool.skylos.gate]
fail_on_critical = true  # Fail CI on critical findings
max_security = 0         # Max allowed security findings
max_quality = 10         # Max allowed quality findings
strict = false           # Strict mode

[tool.skylos.whitelist]
names = []               # Whitelisted symbol names

[tool.skylos.masking]
names = []               # Masked names (treated as used)
decorators = []          # Masked decorators
bases = []               # Masked base classes
\`\`\`

---

## Benchmarks

Tested on 9 popular Python repos (350k+ combined stars) + TypeScript:

| Metric | Skylos | Vulture |
|:---|---:|---:|
| Recall | 98.1% (51/52) | 84.6% (44/52) |
| False Positives | 220 | 644 |

Full benchmark suite: https://github.com/duriantaco/skylos-demo

---

## Links

- Website: https://skylos.dev
- Documentation: https://docs.skylos.dev
- GitHub: https://github.com/duriantaco/skylos
- PyPI: https://pypi.org/project/skylos/
- VS Code: https://marketplace.visualstudio.com/items?itemName=oha.skylos-vscode-extension
- Discord: https://discord.gg/Ftn9t9tErf
- License: Apache 2.0
`

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
