"use client"

import { useTexture } from "@react-three/drei"
import * as THREE from "three"
import { useMemo } from "react"

interface ShirtTextureLoaderProps {
  imagePath: string | null
  fallbackColors: {
    primary: string
    secondary: string
    pattern: "solid" | "stripes" | "hoops" | "sash"
  }
}

export function useShirtTexture({ imagePath, fallbackColors }: ShirtTextureLoaderProps): THREE.Texture {
  // Generate fallback texture
  const fallbackTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')!
    
    // Base color
    ctx.fillStyle = fallbackColors.primary
    ctx.fillRect(0, 0, 512, 512)
    
    // Apply pattern
    if (fallbackColors.pattern === 'stripes') {
      ctx.fillStyle = fallbackColors.secondary
      for (let i = 0; i < 512; i += 32) {
        ctx.fillRect(i, 0, 16, 512)
      }
    } else if (fallbackColors.pattern === 'hoops') {
      ctx.fillStyle = fallbackColors.secondary
      for (let i = 0; i < 512; i += 32) {
        ctx.fillRect(0, i, 512, 16)
      }
    } else if (fallbackColors.pattern === 'sash') {
      ctx.fillStyle = fallbackColors.secondary
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(256, 512)
      ctx.lineTo(512, 512)
      ctx.lineTo(512, 0)
      ctx.closePath()
      ctx.fill()
    }
    
    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    return texture
  }, [fallbackColors])
  
  // Try to load the actual shirt image
  if (imagePath) {
    try {
      const loadedTexture = useTexture(imagePath) as THREE.Texture
      loadedTexture.wrapS = THREE.ClampToEdgeWrapping
      loadedTexture.wrapT = THREE.ClampToEdgeWrapping
      loadedTexture.flipY = false
      return loadedTexture
    } catch (error) {
      console.warn(`Failed to load shirt texture: ${imagePath}`, error)
      return fallbackTexture
    }
  }
  
  return fallbackTexture
}

