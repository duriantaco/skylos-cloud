'use client'

import type { CityTopology, CityBuilding } from '@/lib/city-layout'

interface CityControlsProps {
  topology: CityTopology
  selectedBuilding: CityBuilding | null
  onClose?: () => void
}

const gradeColors: Record<string, string> = {
  A: 'text-green-400',
  B: 'text-green-300',
  C: 'text-yellow-400',
  D: 'text-orange-400',
  F: 'text-red-400',
}

export default function CityControls({ topology, selectedBuilding, onClose }: CityControlsProps) {
  const { summary, grade } = topology

  return (
    <div className="absolute top-4 left-4 z-10 space-y-3">
      {/* Grade + summary */}
      <div className="bg-gray-900/90 backdrop-blur text-white text-sm rounded-lg px-4 py-3 shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <span className={`text-2xl font-bold ${gradeColors[grade] ?? 'text-white'}`}>
            {grade}
          </span>
          <span className="text-gray-400 text-xs">Code City Grade</span>
        </div>
        <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-xs text-gray-300">
          <div>Districts: {summary.total_districts}</div>
          <div>Files: {summary.total_blocks}</div>
          <div>Symbols: {summary.total_buildings}</div>
          <div>Dead: <span className="text-red-400">{summary.dead_buildings}</span></div>
          <div>Avg Cx: {summary.avg_complexity}</div>
          <div>Edges: {summary.total_edges}</div>
        </div>
      </div>

      {/* Selected building detail */}
      {selectedBuilding && (
        <div className="bg-gray-900/90 backdrop-blur text-white text-sm rounded-lg px-4 py-3 shadow-lg max-w-xs">
          <div className="flex justify-between items-start mb-1">
            <span className="font-semibold text-blue-300">{selectedBuilding.name}</span>
            {onClose && (
              <button onClick={onClose} className="text-gray-500 hover:text-white text-xs ml-2">
                x
              </button>
            )}
          </div>
          <div className="text-xs text-gray-400 mb-2">{selectedBuilding.qualified_name}</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-300">
            <div>Type: {selectedBuilding.type}</div>
            <div>LOC: {selectedBuilding.loc}</div>
            <div>Complexity: {selectedBuilding.complexity}</div>
            <div>
              {selectedBuilding.dead
                ? <span className="text-red-400 font-semibold">DEAD</span>
                : <span className="text-green-400">Alive</span>
              }
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            {selectedBuilding.file}:{selectedBuilding.line}
          </div>
          {selectedBuilding.calls.length > 0 && (
            <div className="text-xs text-gray-400 mt-1">
              Calls: {selectedBuilding.calls.length} function{selectedBuilding.calls.length !== 1 ? 's' : ''}
            </div>
          )}
          {selectedBuilding.called_by.length > 0 && (
            <div className="text-xs text-gray-400">
              Called by: {selectedBuilding.called_by.length} function{selectedBuilding.called_by.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="bg-gray-900/90 backdrop-blur text-white text-xs rounded-lg px-3 py-2 shadow-lg">
        <div className="text-gray-500 mb-1">Complexity</div>
        <div className="flex gap-2">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#4caf50]" /> Low</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#ffeb3b]" /> Med</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#ff9800]" /> High</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#f44336]" /> Crit</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#616161]" /> Dead</span>
        </div>
      </div>
    </div>
  )
}
