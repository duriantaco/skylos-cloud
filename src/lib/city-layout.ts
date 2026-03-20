/**
 * Code City layout engine — TypeScript port of squarified treemap.
 * Transforms scan data into positioned city topology for 3D rendering.
 */

export interface CityBuilding {
  name: string;
  qualified_name: string;
  type: string;
  file: string;
  line: number;
  loc: number;
  height: number;
  complexity: number;
  color: string;
  dead: boolean;
  calls: string[];
  called_by: string[];
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CityBlock {
  name: string;
  path: string;
  buildings: CityBuilding[];
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CityDistrict {
  name: string;
  blocks: CityBlock[];
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CitySummary {
  total_districts: number;
  total_blocks: number;
  total_buildings: number;
  dead_buildings: number;
  avg_complexity: number;
  total_edges: number;
  canvas_size: number;
}

export interface CityTopology {
  districts: CityDistrict[];
  edges: { from: string; to: string }[];
  circular_deps: unknown[];
  grade: string;
  summary: CitySummary;
}

interface LayoutItem {
  area: number;
  _norm: number;
  x: number;
  y: number;
  w: number;
  h: number;
  [key: string]: unknown;
}

function worstRatio(row: LayoutItem[], totalArea: number, side: number): number {
  if (!row.length || totalArea === 0 || side === 0) return Infinity;
  const s2 = totalArea * totalArea;
  const w2 = side * side;
  let worst = 0;
  for (const it of row) {
    if (it._norm === 0) continue;
    const r1 = (w2 * it._norm) / s2;
    const r2 = s2 / (w2 * it._norm);
    worst = Math.max(worst, Math.max(r1, r2));
  }
  return worst;
}

function layoutStrip(items: LayoutItem[], x: number, y: number, w: number, h: number): void {
  if (!items.length) return;

  if (items.length === 1) {
    items[0].x = x;
    items[0].y = y;
    items[0].w = w;
    items[0].h = h;
    return;
  }

  const total = items.reduce((s, it) => s + it._norm, 0);
  if (total === 0) {
    for (const it of items) {
      it.x = x; it.y = y; it.w = 0; it.h = 0;
    }
    return;
  }

  const horizontal = w >= h;
  const row: LayoutItem[] = [items[0]];
  let rowArea = items[0]._norm;
  let bestRatio = worstRatio(row, rowArea, horizontal ? w : h);

  let i = 1;
  while (i < items.length) {
    const trialRow = [...row, items[i]];
    const trialArea = rowArea + items[i]._norm;
    const trialRatio = worstRatio(trialRow, trialArea, horizontal ? w : h);
    if (trialRatio <= bestRatio) {
      row.push(items[i]);
      rowArea = trialArea;
      bestRatio = trialRatio;
      i++;
    } else {
      break;
    }
  }

  if (horizontal) {
    const rowW = h > 0 ? rowArea / h : 0;
    let offset = 0;
    for (const it of row) {
      const itH = rowW > 0 ? it._norm / rowW : 0;
      it.x = x; it.y = y + offset; it.w = rowW; it.h = itH;
      offset += itH;
    }
    layoutStrip(items.slice(i), x + rowW, y, w - rowW, h);
  } else {
    const rowH = w > 0 ? rowArea / w : 0;
    let offset = 0;
    for (const it of row) {
      const itW = rowH > 0 ? it._norm / rowH : 0;
      it.x = x + offset; it.y = y; it.w = itW; it.h = rowH;
      offset += itW;
    }
    layoutStrip(items.slice(i), x, y + rowH, w, h - rowH);
  }
}

function squarify<T extends { area: number }>(
  items: T[],
  x: number, y: number, w: number, h: number
): (T & { x: number; y: number; w: number; h: number })[] {
  if (!items.length) return [];

  const total = items.reduce((s, it) => s + it.area, 0);
  const layoutItems: LayoutItem[] = items
    .map((it) => ({
      ...it,
      _norm: total > 0 ? (it.area / total) * w * h : 0,
      x: 0, y: 0, w: 0, h: 0,
    }))
    .sort((a, b) => b._norm - a._norm);

  layoutStrip(layoutItems, x, y, w, h);

  return layoutItems as unknown as (T & { x: number; y: number; w: number; h: number })[];
}

/** Complexity → hex color (green→yellow→orange→red) */
export function complexityColor(c: number): string {
  if (c <= 3) return "#4caf50";
  if (c <= 7) return "#ffeb3b";
  if (c <= 12) return "#ff9800";
  return "#f44336";
}

/**
 * Build CityTopology from raw scan definitions.
 * This mirrors the Python `generate_topology()` for client-side rendering
 * when the backend already has definitions data in the scan.
 */
export function buildTopologyFromScan(
  definitions: Record<string, {
    name: string; file: string; line: number; type: string;
    loc?: number; complexity?: number;
    calls?: string[]; called_by?: string[];
    dead?: boolean;
  }>,
  deadNames: Set<string>,
  canvasSize = 100,
): CityTopology {
  // Group by directory > file
  const dirFiles = new Map<string, Map<string, CityBuilding[]>>();

  for (const [qname, defn] of Object.entries(definitions)) {
    const file = defn.file || "";
    if (!file) continue;
    const lastSlash = file.lastIndexOf("/");
    const dir = lastSlash > 0 ? file.slice(0, lastSlash) : "(root)";
    const fname = lastSlash > 0 ? file.slice(lastSlash + 1) : file;

    if (!dirFiles.has(dir)) dirFiles.set(dir, new Map());
    const filesMap = dirFiles.get(dir)!;
    if (!filesMap.has(fname)) filesMap.set(fname, []);

    const loc = defn.loc ?? 1;
    const complexity = defn.complexity ?? 1;
    const isDead = deadNames.has(qname) || deadNames.has(defn.name) || defn.dead === true;

    filesMap.get(fname)!.push({
      name: defn.name,
      qualified_name: qname,
      type: defn.type,
      file,
      line: defn.line,
      loc,
      height: loc,
      complexity,
      color: isDead ? "#616161" : complexityColor(complexity),
      dead: isDead,
      calls: defn.calls ?? [],
      called_by: defn.called_by ?? [],
      x: 0, y: 0, w: 0, h: 0,
    });
  }

  // Build districts
  const districtItems = [...dirFiles.entries()].map(([dir, filesMap]) => {
    let totalLoc = 0;
    for (const buildings of filesMap.values()) {
      totalLoc += buildings.reduce((s, b) => s + b.loc, 0);
    }
    return { directory: dir, filesMap, area: Math.max(totalLoc, 1) };
  });

  const laidOutDistricts = squarify(districtItems, 0, 0, canvasSize, canvasSize);

  const districts: CityDistrict[] = [];
  const allEdges: { from: string; to: string }[] = [];
  let totalComplexity = 0;
  let totalBuildings = 0;

  for (const d of laidOutDistricts) {
    const pad = 0.5;
    const blockItems = [...d.filesMap.entries()].map(([fname, buildings]) => ({
      filename: fname,
      buildings,
      area: Math.max(buildings.reduce((s, b) => s + b.loc, 0), 1),
    }));

    const laidOutBlocks = squarify(
      blockItems,
      d.x + pad, d.y + pad,
      Math.max(d.w - 2 * pad, 0), Math.max(d.h - 2 * pad, 0),
    );

    const blocks: CityBlock[] = [];
    for (const bl of laidOutBlocks) {
      const bpad = 0.3;
      const buildingItems = bl.buildings.map((b) => ({ ...b, area: Math.max(b.loc, 1) }));

      const laidOut = squarify(
        buildingItems,
        bl.x + bpad, bl.y + bpad,
        Math.max(bl.w - 2 * bpad, 0), Math.max(bl.h - 2 * bpad, 0),
      );

      for (const b of laidOut) {
        totalComplexity += b.complexity;
        totalBuildings++;
        for (const target of b.calls) {
          allEdges.push({ from: b.qualified_name, to: target });
        }
      }

      blocks.push({
        name: bl.filename,
        path: d.directory !== "(root)" ? `${d.directory}/${bl.filename}` : bl.filename,
        buildings: laidOut,
        x: bl.x, y: bl.y, w: bl.w, h: bl.h,
      });
    }

    districts.push({
      name: d.directory,
      blocks,
      x: d.x, y: d.y, w: d.w, h: d.h,
    });
  }

  const avgComplexity = totalBuildings > 0 ? totalComplexity / totalBuildings : 0;
  let grade: string;
  if (avgComplexity <= 3) grade = "A";
  else if (avgComplexity <= 5) grade = "B";
  else if (avgComplexity <= 8) grade = "C";
  else if (avgComplexity <= 12) grade = "D";
  else grade = "F";

  let deadCount = 0;
  for (const d of districts)
    for (const b of d.blocks)
      for (const bld of b.buildings)
        if (bld.dead) deadCount++;

  return {
    districts,
    edges: allEdges,
    circular_deps: [],
    grade,
    summary: {
      total_districts: districts.length,
      total_blocks: districts.reduce((s, d) => s + d.blocks.length, 0),
      total_buildings: totalBuildings,
      dead_buildings: deadCount,
      avg_complexity: Math.round(avgComplexity * 100) / 100,
      total_edges: allEdges.length,
      canvas_size: canvasSize,
    },
  };
}
