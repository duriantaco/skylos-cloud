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
`

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
