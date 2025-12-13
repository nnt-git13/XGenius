"use client"

import React, { useRef, useMemo, Suspense } from "react"
import { useFrame } from "@react-three/fiber"
import { useGLTF, useTexture } from "@react-three/drei"
import * as THREE from "three"
import { getTeamShirtPath } from "@/utils/teamMapping"

interface ShirtMeshProps {
  teamName: string
  teamFplCode?: number | null
  teamColors: {
    primary: string
    secondary: string
    accent: string
    pattern: "solid" | "stripes" | "hoops" | "sash"
  }
  playerNumber: number
  isSelected: boolean
  isCaptain: boolean
  isViceCaptain: boolean
}

// Preload the jersey GLB model (if it exists)
try {
  useGLTF.preload("/models/jersey.glb")
} catch (e) {
  // Model not found, will use fallback
}

function ShirtMeshContent({
  teamName,
  teamFplCode,
  teamColors,
  playerNumber,
  isSelected,
  isCaptain,
  isViceCaptain,
}: ShirtMeshProps) {
  const groupRef = useRef<THREE.Group>(null)
  
  // Try to load the GLB jersey model, fallback to plane if not found
  let clonedScene: THREE.Group
  try {
    const { scene } = useGLTF("/models/jersey.glb")
    clonedScene = useMemo(() => scene.clone(), [scene])
  } catch (error) {
    // Fallback: create a simple plane geometry
    clonedScene = useMemo(() => {
      const group = new THREE.Group()
      const geometry = new THREE.PlaneGeometry(0.75, 1.1)
      const material = new THREE.MeshStandardMaterial({ 
        color: teamColors.primary,
        side: THREE.DoubleSide,
      })
      const mesh = new THREE.Mesh(geometry, material)
      group.add(mesh)
      return group
    }, [teamColors.primary])
  }
  
  // Load the PNG texture
  const shirtImagePath = getTeamShirtPath(teamName, teamFplCode, 'home')
  
  // Load texture - use fallback if image not found
  let shirtTexture: THREE.Texture
  if (shirtImagePath) {
    try {
      shirtTexture = useTexture(shirtImagePath) as THREE.Texture
      shirtTexture.flipY = false // Required for GLTF UVs
      shirtTexture.wrapS = THREE.ClampToEdgeWrapping
      shirtTexture.wrapT = THREE.ClampToEdgeWrapping
    } catch (error) {
      // Fallback to generated texture
      const canvas = document.createElement('canvas')
      canvas.width = 512
      canvas.height = 512
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = teamColors.primary
      ctx.fillRect(0, 0, 512, 512)
      shirtTexture = new THREE.CanvasTexture(canvas)
      shirtTexture.flipY = false
    }
  } else {
    // Generate fallback texture
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = teamColors.primary
    ctx.fillRect(0, 0, 512, 512)
    shirtTexture = new THREE.CanvasTexture(canvas)
    shirtTexture.flipY = false
  }
  
  // Apply texture to all meshes in the cloned scene
  useMemo(() => {
    clonedScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = new THREE.MeshStandardMaterial({
          map: shirtTexture,
          roughness: 0.4,
          metalness: 0.1,
        })
        child.castShadow = true
        child.receiveShadow = true
      }
    })
  }, [clonedScene, shirtTexture])
  
  // Animate shirt on hover/selection
  useFrame((state) => {
    if (groupRef.current) {
      if (isSelected || isCaptain) {
        groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.15
        groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.03
      } else {
        groupRef.current.rotation.y = 0
        groupRef.current.position.y = 0
      }
    }
  })
  
  return (
    <group ref={groupRef}>
      <primitive object={clonedScene} scale={[1, 1, 1]} />
      
      {/* Glow effect for captain/selected */}
      {(isSelected || isCaptain || isViceCaptain) && (
        <mesh position={[0, 0, -0.1]}>
          <sphereGeometry args={[0.7, 16, 16]} />
          <meshStandardMaterial 
            color={isCaptain ? '#ffff00' : isViceCaptain ? '#0066ff' : '#ffffff'}
            emissive={isCaptain ? '#ffff00' : isViceCaptain ? '#0066ff' : '#ffffff'}
            emissiveIntensity={0.4}
            transparent
            opacity={0.25}
          />
        </mesh>
      )}
    </group>
  )
}

export function ShirtMesh(props: ShirtMeshProps) {
  return (
    <Suspense fallback={
      <mesh>
        <boxGeometry args={[0.5, 0.7, 0.1]} />
        <meshStandardMaterial color="#666666" wireframe />
      </mesh>
    }>
      <ShirtMeshContent {...props} />
    </Suspense>
  )
}
