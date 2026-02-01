import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from "next/server"

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

type BadgeStyle = "flat" | "flat-square"

const COLORS = {
  passing: "#4c1",
  failing: "#e05d44",
  unknown: "#9f9f9f",
}

function generateBadge(
  label: string,
  message: string,
  color: string,
  style: BadgeStyle = "flat"
): string {
  const labelWidth = Math.max(label.length * 6.5 + 10, 45)
  const messageWidth = Math.max(message.length * 6.5 + 10, 40)
  const totalWidth = labelWidth + messageWidth
  const radius = style === "flat-square" ? 0 : 3

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${label}: ${message}">
  <title>${label}: ${message}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="20" rx="${radius}" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${messageWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text x="${labelWidth / 2}" y="14" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${labelWidth / 2}" y="13" fill="#fff">${label}</text>
    <text x="${labelWidth + messageWidth / 2}" y="14" fill="#010101" fill-opacity=".3">${message}</text>
    <text x="${labelWidth + messageWidth / 2}" y="13" fill="#fff">${message}</text>
  </g>
</svg>`
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params 
  const { searchParams } = new URL(request.url)
  const style = (searchParams.get("style") as BadgeStyle) || "flat"
  const branch = searchParams.get("branch")

  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidRe.test(projectId)) {
    const svg = generateBadge("skylos", "not found", COLORS.unknown, style);
    return new NextResponse(svg, {
      status: 404,
      headers: { "Content-Type": "image/svg+xml" },
    });
  }

  try {
    let query = supabase
      .from('projects')
      .select(`
        id, 
        badge_enabled,
        scans!inner (
          quality_gate_passed,
          created_at,
          branch
        )
      `)
      .eq('id', projectId)
      .order('scans(created_at)', { ascending: false })
      .limit(1, { foreignTable: 'scans' })

    if (branch) {
      query = query.eq('scans.branch', branch)
    }

    const { data: project } = await query.single()

    if (!project || !project.badge_enabled) {
      const svg = generateBadge("skylos", "not found", COLORS.unknown, style)
      return new NextResponse(svg, {
        status: 404,
        headers: { "Content-Type": "image/svg+xml" },
      })
    }

    const scan = (project.scans as any)?.[0]

    let message: string
    let color: string

    if (!scan) {
      message = "no scans"
      color = COLORS.unknown
    } else if (scan.quality_gate_passed) {
      message = "passing"
      color = COLORS.passing
    } else {
      message = "failing"
      color = COLORS.failing
    }

    const svg = generateBadge("skylos", message, color, style)

    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    })
  } catch (error) {
    console.error("Badge error:", error)
    const svg = generateBadge("skylos", "error", COLORS.unknown, style)
    return new NextResponse(svg, {
      headers: { "Content-Type": "image/svg+xml" },
    })
  }
}