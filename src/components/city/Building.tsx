'use client'

import { useRef, useState } from 'react'
import * as THREE from 'three'
import { ThreeEvent } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import type { CityBuilding } from '@/lib/city-layout'

const DEAD_COLOR = '#616161'
const DEAD_OPACITY = 0.6

interface BuildingProps {
  building: CityBuilding
  centerX: number
  centerZ: number
  onClick?: (building: CityBuilding) => void
}

export default function Building({ building, centerX, centerZ, onClick }: BuildingProps) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const [hovered, setHovered] = useState(false)

  const isDead = building.dead
  const color = isDead ? DEAD_COLOR : building.color
  const heightScale = Math.max(building.height * 0.1, 0.2)
  const width = Math.max(building.w * 0.9, 0.1)
  const depth = Math.max(building.h * 0.9, 0.1)

  // Position: treemap coords → 3D centered
  const posX = building.x + building.w / 2 - centerX
  const posZ = building.y + building.h / 2 - centerZ
  const posY = heightScale / 2

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    onClick?.(building)
  }

  return (
    <mesh
      ref={meshRef}
      position={[posX, posY, posZ]}
      onClick={handleClick}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
      onPointerOut={() => setHovered(false)}
    >
      <boxGeometry args={[width, heightScale, depth]} />
      <meshStandardMaterial
        color={hovered ? '#ffffff' : color}
        opacity={isDead ? DEAD_OPACITY : 1}
        transparent={isDead}
      />
      {hovered && (
        <Html distanceFactor={30} position={[0, heightScale / 2 + 0.5, 0]}>
          <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap pointer-events-none">
            <div className="font-semibold">{building.name}</div>
            <div>LOC: {building.loc} | Complexity: {building.complexity}</div>
            <div>{building.file}:{building.line}</div>
            {isDead && <div className="text-red-400 font-semibold">DEAD CODE</div>}
          </div>
        </Html>
      )}
    </mesh>
  )
}
