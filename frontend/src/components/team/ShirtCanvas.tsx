"use client"

import React, { Suspense } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { ShirtMesh } from "./ShirtMesh"
import * as THREE from "three"

interface ShirtCanvasProps {
  teamName: string
  teamFplCode?: number | null
  teamColors: any
  playerNumber: number
  isSelected: boolean
  isCaptain: boolean
  isViceCaptain: boolean
}

function ShirtLoader() {
  return (
    <mesh>
      <boxGeometry args={[0.5, 0.7, 0.1]} />
      <meshStandardMaterial color="#666666" wireframe />
    </mesh>
  )
}

export function ShirtCanvas({
  teamName,
  teamFplCode,
  teamColors,
  playerNumber,
  isSelected,
  isCaptain,
  isViceCaptain,
}: ShirtCanvasProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 2.5], fov: 50 }}
      gl={{ 
        alpha: true, 
        antialias: true, 
        powerPreference: "high-performance",
        preserveDrawingBuffer: true
      }}
      dpr={[1, 2]}
      style={{ background: 'transparent', width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1.0} castShadow />
      <directionalLight position={[-5, 3, 5]} intensity={0.5} />
      <pointLight position={[0, -5, 5]} intensity={0.4} />
      <spotLight position={[0, 5, 5]} angle={0.3} penumbra={0.5} intensity={0.5} castShadow />
      
      <Suspense fallback={<ShirtLoader />}>
        <ShirtMesh
          teamName={teamName}
          teamFplCode={teamFplCode}
          teamColors={teamColors}
          playerNumber={playerNumber}
          isSelected={isSelected}
          isCaptain={isCaptain}
          isViceCaptain={isViceCaptain}
        />
      </Suspense>
      
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate={!isSelected}
        autoRotateSpeed={isSelected ? 0 : 0.8}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 1.5}
        enableDamping
        dampingFactor={0.05}
        target={[0, 0, 0]}
      />
    </Canvas>
  )
}

