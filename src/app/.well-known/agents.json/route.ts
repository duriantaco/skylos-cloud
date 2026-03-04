export function GET() {
  const manifest = {
    schema_version: '1.0',
    name: 'Skylos',
    description:
      'Static analysis tool for Python, TypeScript, and Go. Finds dead code, security vulnerabilities, and code quality issues.',
    url: 'https://skylos.dev',
    logo: 'https://skylos.dev/favicon.ico',
    contact_email: 'aaronoh2015@gmail.com',
    legal_info_url: 'https://skylos.dev',
    capabilities: {
      mcp_server: {
        description:
          'MCP server for AI agent integration. Provides dead code detection, security scanning, quality checks, secrets detection, and auto-remediation.',
        install: 'pip install skylos && python -m skylos_mcp',
        source: 'https://github.com/duriantaco/skylos/tree/main/skylos_mcp',
        auth: {
          type: 'api_key',
          env_var: 'SKYLOS_API_KEY',
          instructions: 'Generate API keys at https://skylos.dev/dashboard or via `skylos key add`',
        },
      },
      cli: {
        description: 'Command-line static analysis tool',
        install: 'pip install skylos',
        source: 'https://github.com/duriantaco/skylos',
        usage: 'skylos [path] [options]',
      },
      github_action: {
        description: 'CI/CD integration via GitHub Actions',
        source: 'https://github.com/duriantaco/skylos/blob/main/action.yml',
        usage: 'uses: duriantaco/skylos@main',
      },
      vscode_extension: {
        description: 'VS Code extension for inline analysis',
        install:
          'https://marketplace.visualstudio.com/items?itemName=oha.skylos-vscode-extension',
      },
      api: {
        endpoints: [
          {
            path: '/api/verify',
            method: 'POST',
            description: 'Verify findings against static callgraph',
          },
        ],
      },
    },
    links: {
      documentation: 'https://docs.skylos.dev',
      github: 'https://github.com/duriantaco/skylos',
      pypi: 'https://pypi.org/project/skylos/',
      changelog: 'https://github.com/duriantaco/skylos/blob/main/CHANGELOG.md',
      discord: 'https://discord.gg/Ftn9t9tErf',
      llms_txt: 'https://skylos.dev/llms.txt',
      llms_full_txt: 'https://skylos.dev/llms-full.txt',
    },
  }

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
