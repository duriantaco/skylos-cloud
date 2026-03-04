export function GET() {
  const mcpCard = {
    schema_version: '1.0',
    name: 'skylos',
    display_name: 'Skylos',
    description:
      'Static analysis MCP server for Python, TypeScript, and Go. Dead code detection, security scanning, quality checks, secrets detection, and auto-remediation.',
    repository: 'https://github.com/duriantaco/skylos',
    homepage: 'https://skylos.dev',
    license: 'Apache-2.0',
    runtime: 'python',
    install: {
      package: 'skylos',
      command: 'pip install skylos',
      run: 'python -m skylos_mcp',
    },
    auth: {
      type: 'api_key',
      env_var: 'SKYLOS_API_KEY',
      required: false,
      description:
        'Optional. Without API key: analyze tool limited to 5 calls/day. With API key: full access to all tools. Generate at https://skylos.dev/dashboard',
    },
    tools: [
      {
        name: 'analyze',
        description: 'Detect unused code and analyze projects for dead code',
        parameters: {
          path: { type: 'string', required: true, description: 'File or directory to analyze' },
          confidence: {
            type: 'integer',
            required: false,
            default: 60,
            description: 'Confidence threshold (0-100)',
          },
          exclude_folders: {
            type: 'array',
            required: false,
            description: 'Folders to exclude from analysis',
          },
        },
        auth_required: false,
      },
      {
        name: 'security_scan',
        description: 'Scan for security vulnerabilities (SQLi, SSRF, path traversal)',
        parameters: {
          path: { type: 'string', required: true, description: 'File or directory to scan' },
          confidence: { type: 'integer', required: false, default: 60 },
          exclude_folders: { type: 'array', required: false },
        },
        auth_required: true,
      },
      {
        name: 'quality_check',
        description:
          'Run code quality checks including circular dependency detection and complexity analysis',
        parameters: {
          path: { type: 'string', required: true, description: 'File or directory to check' },
          confidence: { type: 'integer', required: false, default: 60 },
          exclude_folders: { type: 'array', required: false },
        },
        auth_required: true,
      },
      {
        name: 'secrets_scan',
        description: 'Scan for exposed API keys, tokens, and secrets in code',
        parameters: {
          path: { type: 'string', required: true, description: 'File or directory to scan' },
          confidence: { type: 'integer', required: false, default: 60 },
          exclude_folders: { type: 'array', required: false },
        },
        auth_required: true,
      },
      {
        name: 'remediate',
        description:
          'Scan for issues, generate LLM-powered fixes, and validate with tests',
        parameters: {
          path: { type: 'string', required: true, description: 'File or directory to remediate' },
          max_fixes: { type: 'integer', required: false, default: 5 },
          dry_run: { type: 'boolean', required: false, default: true },
          model: { type: 'string', required: false, default: 'gpt-4.1' },
          test_cmd: { type: 'string', required: false },
          severity: { type: 'string', required: false },
        },
        auth_required: true,
      },
    ],
    client_config: {
      claude_desktop: {
        mcpServers: {
          skylos: {
            command: 'python',
            args: ['-m', 'skylos_mcp'],
            env: { SKYLOS_API_KEY: 'your-api-key' },
          },
        },
      },
    },
  }

  return new Response(JSON.stringify(mcpCard, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
