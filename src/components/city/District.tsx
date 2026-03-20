'use client'

import { Html } from '@react-three/drei'
import { useState } from 'react'
import type { CityDistrict, CityBuilding } from '@/lib/city-layout'
import Building from './Building'

interface DistrictProps {
  district: CityDistrict
  centerX: number
  centerZ: number
  onBuildingClick?: (building: CityBuilding) => void
}

export default function District({ district, centerX, centerZ, onBuildingClick }: DistrictProps) {
  const [hovered, setHovered] = useState(false)

  const posX = district.x + district.w / 2 - centerX
  const posZ = district.y + district.h / 2 - centerZ

  // Short display name: last directory segment
  const parts = district.name.split('/')
  const label = parts[parts.length - 1] || district.name

  return (
    <group>
      {/* District ground plane */}
      <mesh
        position={[posX, -0.05, posZ]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
        onPointerOut={() => setHovered(false)}
      >
        <planeGeometry args={[district.w, district.h]} />
        <meshStandardMaterial
          color={hovered ? '#2a3a4a' : '#1a2a3a'}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* District label */}
      <Html
        position={[posX - district.w / 2 + 0.5, 0.05, posZ - district.h / 2 + 0.5]}
        distanceFactor={60}
      >
        <div className="text-[10px] text-blue-300 opacity-60 font-mono whitespace-nowrap pointer-events-none">
          {label}
        </div>
      </Html>

      {/* Buildings */}
      {district.blocks.map((block) =>
        block.buildings.map((building) => (
          <Building
            key={building.qualified_name}
            building={building}
            centerX={centerX}
            centerZ={centerZ}
            onClick={onBuildingClick}
          />
        ))
      )}
    </group>
  )
}
