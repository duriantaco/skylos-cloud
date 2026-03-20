'use client'

import { useState, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import type { CityTopology, CityBuilding } from '@/lib/city-layout'
import District from './District'
import CityControls from './CityControls'

interface CitySceneProps {
  topology: CityTopology
}

function CityContent({ topology, centerX, centerZ, onBuildingClick }: {
  topology: CityTopology
  centerX: number
  centerZ: number
  onBuildingClick: (b: CityBuilding) => void
}) {
  return (
    <>
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <planeGeometry args={[topology.summary.canvas_size * 1.2, topology.summary.canvas_size * 1.2]} />
        <meshStandardMaterial color="#0d1117" />
      </mesh>

      {/* Districts + buildings */}
      {topology.districts.map((district) => (
        <District
          key={district.name}
          district={district}
          centerX={centerX}
          centerZ={centerZ}
          onBuildingClick={onBuildingClick}
        />
      ))}
    </>
  )
}

export default function CityScene({ topology }: CitySceneProps) {
  const [selected, setSelected] = useState<CityBuilding | null>(null)

  const cs = topology.summary.canvas_size
  const centerX = cs / 2
  const centerZ = cs / 2
  const camDist = cs * 0.8

  return (
    <div className="relative w-full h-full min-h-[600px] bg-gray-950 rounded-lg overflow-hidden">
      <CityControls
        topology={topology}
        selectedBuilding={selected}
        onClose={() => setSelected(null)}
      />
      <Canvas
        camera={{ position: [camDist * 0.6, camDist * 0.5, camDist * 0.6], fov: 50 }}
        shadows
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[50, 80, 30]} intensity={0.8} castShadow />
        <pointLight position={[-30, 40, -30]} intensity={0.3} color="#4488ff" />

        <Suspense fallback={null}>
          <CityContent
            topology={topology}
            centerX={centerX}
            centerZ={centerZ}
            onBuildingClick={setSelected}
          />
          <Environment preset="night" />
        </Suspense>

        <OrbitControls
          makeDefault
          enablePan
          enableZoom
          enableRotate
          maxPolarAngle={Math.PI / 2.1}
          minDistance={5}
          maxDistance={cs * 2}
        />
      </Canvas>
    </div>
  )
}
