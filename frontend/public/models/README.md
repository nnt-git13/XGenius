# 3D Jersey Models

This directory should contain the `jersey.glb` file - a 3D model of a football jersey.

## Required File

- `jersey.glb` - A GLTF/GLB 3D model of a football jersey with proper UV mapping

## Usage

The ShirtMesh component will:
1. Load the GLB model from this directory
2. Apply PNG textures from `/football_shirts/graphics/kits/` to the model
3. Display the textured jersey in 3D

## Texture Application

Textures are applied using:
```javascript
obj.material = new THREE.MeshStandardMaterial({
  map: texture
});
```

The texture's `flipY` is set to `false` as required for GLTF UVs.

