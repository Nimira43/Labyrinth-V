import { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useTexture } from '@react-three/drei'

export default function Maze({ width, height, cells, exitCell, cellSize, wallThickness, offsetX, offsetZ }) {
  const baseWallHeight = 2.5
  const T = wallThickness

  const wallTextures = useTexture({
    map: '/textures/Metal048A/Metal048A_4K-JPG_Color.jpg',
    roughnessMap: '/textures/Metal048A/Metal048A_4K-JPG_Roughness.jpg',
    metalnessMap: '/textures/Metal048A/Metal048A_4K-JPG_Metalness.jpg',
    normalMap: '/textures/Metal048A/Metal048A_4K-JPG_NormalGL.jpg',
    displacementMap: '/textures/Metal048A/Metal048A_4K-JPG_Displacement.jpg',
  })

  const floorTextures = useTexture({
    map: '/textures/Marble017/Marble017_4K-JPG_Color.jpg',
    roughnessMap: '/textures/Marble017/Marble017_4K-JPG_Roughness.jpg',
    normalMap: '/textures/Marble017/Marble017_4K-JPG_NormalGL.jpg',
  })

  useEffect(() => {
    // Wall repetition configuration
    Object.values(wallTextures).forEach((texture) => {
      texture.wrapS = THREE.RepeatWrapping
      texture.wrapT = THREE.RepeatWrapping
      texture.repeat.set(1, 1) 
    })

    // Floor repetition configuration
    Object.values(floorTextures).forEach((texture) => {
      texture.wrapS = THREE.RepeatWrapping
      texture.wrapT = THREE.RepeatWrapping
      texture.repeat.set(width, height) 
    })
  }, [wallTextures, floorTextures, width, height])

  const { hWalls, vWalls, roofs } = useMemo(() => {
    const hWalls = []
    const vWalls = []
    const roofs = []

    cells.forEach(row =>
      row.forEach(({ x, y, walls: w }) => {
        const cx = x * cellSize + offsetX
        const cz = y * cellSize + offsetZ
        const h = baseWallHeight + Math.random() * 4 

        if (w.top) hWalls.push([cx, h / 2, cz - cellSize / 2 - T / 2, h])
        if (w.bottom) hWalls.push([cx, h / 2, cz + cellSize / 2 + T / 2, h])
        if (w.left) vWalls.push([cx - cellSize / 2 - T / 2, h / 2, cz, h])
        if (w.right) vWalls.push([cx + cellSize / 2 + T / 2, h / 2, cz, h])

        const enclosed = (w.left && w.right) || (w.top && w.bottom)
        const roofChance = 0.45
        if (enclosed && Math.random() < roofChance) {
          const roofHeight = h + 0.2 + Math.random() * 0.6
          roofs.push([cx, roofHeight, cz])
        }
      })
    )

    return { hWalls, vWalls, roofs }
  }, [cells, cellSize, offsetX, offsetZ, baseWallHeight, T])

  const hRef = useRef()
  const vRef = useRef()
  const roofRef = useRef()

  useEffect(() => {
    const dummy = new THREE.Object3D()

    // --- Horizontal Walls Logic ---
    hWalls.forEach(([x, y, z, h], i) => {
      const isOuter =
        x <= offsetX + cellSize / 2 ||
        x >= offsetX + width * cellSize - cellSize / 2 ||
        z <= offsetZ + cellSize / 2 ||
        z >= offsetZ + height * cellSize - cellSize / 2

      const jitter = isOuter ? 0 : 0.25
      const rotJitter = isOuter ? 0 : 0.08

      dummy.position.set(
        x + (Math.random() - 0.5) * jitter,
        y,
        z + (Math.random() - 0.5) * jitter
      )
      dummy.rotation.y = (Math.random() - 0.5) * rotJitter
      dummy.rotation.x = (Math.random() - 0.5) * (isOuter ? 0 : 0.02)
      dummy.rotation.z = (Math.random() - 0.5) * (isOuter ? 0 : 0.02)
      dummy.scale.set(
        1 + (Math.random() - 0.5) * (isOuter ? 0 : 0.1),
        h / baseWallHeight,
        1 + (Math.random() - 0.5) * (isOuter ? 0 : 0.1)
      )

      dummy.updateMatrix()
      hRef.current.setMatrixAt(i, dummy.matrix)
    })
    hRef.current.instanceMatrix.needsUpdate = true

    // --- Vertical Walls Logic ---
    vWalls.forEach(([x, y, z, h], i) => {
      const isOuter =
        x <= offsetX + cellSize / 2 ||
        x >= offsetX + width * cellSize - cellSize / 2 ||
        z <= offsetZ + cellSize / 2 ||
        z >= offsetZ + height * cellSize - cellSize / 2

      const jitter = isOuter ? 0 : 0.25
      const rotJitter = isOuter ? 0 : 0.08

      dummy.position.set(
        x + (Math.random() - 0.5) * jitter,
        y,
        z + (Math.random() - 0.5) * jitter
      )
      dummy.rotation.y = (Math.random() - 0.5) * rotJitter
      dummy.rotation.x = (Math.random() - 0.5) * (isOuter ? 0 : 0.02)
      dummy.rotation.z = (Math.random() - 0.5) * (isOuter ? 0 : 0.02)
      dummy.scale.set(
        1 + (Math.random() - 0.5) * (isOuter ? 0 : 0.1),
        h / baseWallHeight,
        1 + (Math.random() - 0.5) * (isOuter ? 0 : 0.1)
      )

      dummy.updateMatrix()
      vRef.current.setMatrixAt(i, dummy.matrix)
    })
    vRef.current.instanceMatrix.needsUpdate = true

    // --- Roofs Logic ---
    roofs.forEach(([x, y, z], i) => {
      dummy.position.set(x, y, z)
      dummy.updateMatrix()
      roofRef.current.setMatrixAt(i, dummy.matrix)
    })
    roofRef.current.instanceMatrix.needsUpdate = true
  }, [hWalls, vWalls, roofs, baseWallHeight, width, height, offsetX, offsetZ, cellSize])

  return (
    <group>
      {/* Floor with Polished Marble PBR Tuning */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[
          (width * cellSize) / 2 + offsetX,
          0,
          (height * cellSize) / 2 + offsetZ,
        ]}
      >
        <planeGeometry args={[width * cellSize, height * cellSize]} />
        <meshStandardMaterial 
          {...floorTextures}
          color='#ffffff' 
          metalness={0.0}
          roughness={0.15}
          normalScale={new THREE.Vector2(1.5, 1.5)}
        />
      </mesh>

      {/* Horizontal Walls */}
      <instancedMesh ref={hRef} args={[null, null, hWalls.length]} frustumCulled={false}>
        <boxGeometry args={[cellSize, baseWallHeight, T]} />
        <meshStandardMaterial 
          {...wallTextures} 
          color='#333a42' 
          displacementScale={0.01} 
        />
      </instancedMesh>

      {/* Vertical Walls */}
      <instancedMesh ref={vRef} args={[null, null, vWalls.length]} frustumCulled={false}>
        <boxGeometry args={[T, baseWallHeight, cellSize]} />
        <meshStandardMaterial 
          {...wallTextures} 
          color='#333a42' 
          displacementScale={0.01}
        />
      </instancedMesh>

      {/* Roofs */}
      <instancedMesh ref={roofRef} args={[null, null, roofs.length]} frustumCulled={false}>
        <boxGeometry args={[cellSize, 0.4, cellSize]} />
        <meshStandardMaterial
          color='#111111'
          roughness={0.4}
          metalness={0.8}
        />
      </instancedMesh>

      {/* Exit Goal */}
      <mesh position={[exitCell.x * cellSize + offsetX, 1.2, exitCell.y * cellSize + offsetZ]}>
        <torusGeometry args={[0.8, 0.2, 16, 32]} />
        <meshStandardMaterial
          color='#00ffcc'
          emissive='#00ffcc'
          emissiveIntensity={2.0}
        />
      </mesh>
    </group>
  )
}
