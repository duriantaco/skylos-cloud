// import { NextResponse } from 'next/server'
// import { writeFile, mkdir, rm } from 'fs/promises'
// import { exec } from 'child_process'
// import { promisify } from 'util'
// import { randomUUID } from 'crypto'
// import { join } from 'path'
// import { tmpdir } from 'os'

// const execAsync = promisify(exec)

// const LANGUAGE_EXTENSIONS: Record<string, string> = {
//   python: '.py',
//   javascript: '.js',
//   typescript: '.ts',
//   java: '.java',
//   go: '.go',
//   rust: '.rs',
//   ruby: '.rb',
//   php: '.php',
// }

// export async function POST(req: Request) {
//   let tempDir: string | null = null
  
//   try {
//     const body = await req.json()
//     const { code, language = 'python' } = body

//     if (!code || typeof code !== 'string') {
//       return NextResponse.json({ error: 'Missing code' }, { status: 400 })
//     }

//     if (code.length > 100000) {
//       return NextResponse.json({ error: 'Code too long (max 100KB)' }, { status: 400 })
//     }

//     const id = randomUUID()
//     tempDir = join(tmpdir(), `skylos-sandbox-${id}`)
//     await mkdir(tempDir, { recursive: true })

//     const ext = LANGUAGE_EXTENSIONS[language] || '.py'
//     const filename = `sandbox${ext}`
//     const filepath = join(tempDir, filename)
//     await writeFile(filepath, code, 'utf-8')

//     let stdout = ''
//     let stderr = ''
    
//     try {
//       const result = await execAsync(
//         `skylos "${tempDir}" --json --danger --secrets --unused --quality`,
//         { 
//           timeout: 30000,
//           maxBuffer: 10 * 1024 * 1024,
//         }
//       )
//       stdout = result.stdout
//       stderr = result.stderr
//     } catch (execError: any) {
//       if (execError.message?.includes('not found') || execError.message?.includes('ENOENT')) {
//         return NextResponse.json({ 
//           error: 'Skylos CLI not installed on server. Run: pip install skylos' 
//         }, { status: 500 })
//       }
//       stdout = execError.stdout || ''
//       stderr = execError.stderr || ''
      
//       if (!stdout.trim() && stderr) {
//         console.error('Skylos stderr:', stderr)
//         return NextResponse.json({ 
//           error: `Skylos error: ${stderr.slice(0, 200)}` 
//         }, { status: 500 })
//       }
//     }

//     let findings: any[] = []
//     let stats = {
//       total: 0,
//       critical: 0,
//       high: 0,
//       medium: 0,
//       low: 0,
//     }

//     if (stdout.trim()) {
//       try {
//         const output = JSON.parse(stdout)
//         findings = (output.findings || []).map((f: any) => ({
//           rule_id: f.rule_id || f.ruleId || 'UNKNOWN',
//           category: f.category || 'SECURITY',
//           severity: f.severity || 'MEDIUM',
//           message: f.message || f.description || '',
//           line: f.line || f.location?.line || 1,
//           snippet: f.snippet || f.code || '',
//           file: filename,
//         }))

//         stats.total = findings.length
//         stats.critical = findings.filter((f: any) => f.severity === 'CRITICAL').length
//         stats.high = findings.filter((f: any) => f.severity === 'HIGH').length
//         stats.medium = findings.filter((f: any) => f.severity === 'MEDIUM').length
//         stats.low = findings.filter((f: any) => f.severity === 'LOW').length
//       } catch (parseError) {
//         console.error('Failed to parse Skylos output:', parseError)
//         console.error('Raw output:', stdout)
//       }
//     }

//     return NextResponse.json({
//       success: true,
//       findings,
//       stats,
//       scanned_lines: code.split('\n').length,
//     })
    
//   } catch (e: any) {
//     console.error('Sandbox error:', e)
//     return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
//   } finally {
//     if (tempDir) {
//       try {
//         await rm(tempDir, { recursive: true, force: true })
//       } catch {}
//     }
//   }
// }