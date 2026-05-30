import { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'

export default function Maze({ width, height, cells, exitCell, cellSize, wallThickness, offsetX, offsetZ }) {
  const baseWallHeight = 2.5
  const T = wallThickness

  // Generate wall positions + random heights + roofs
  const { hWalls, vWalls, roofs } = useMemo(() => {
    const hWalls = []
    const vWalls = []
    const roofs = []

    cells.forEach(row =>
      row.forEach(({ x, y, walls: w }) => {
        const cx = x * cellSize + offsetX
        const cz = y * cellSize + offsetZ

        // Random height per wall segment
        const h = baseWallHeight + Math.random() * 4  // 2.5 → 6.5

        // Horizontal walls
        if (w.top) hWalls.push([cx, h / 2, cz - cellSize / 2 - T / 2, h])
        if (w.bottom) hWalls.push([cx, h / 2, cz + cellSize / 2 + T / 2, h])

        // Vertical walls
        if (w.left) vWalls.push([cx - cellSize / 2 - T / 2, h / 2, cz, h])
        if (w.right) vWalls.push([cx + cellSize / 2 + T / 2, h / 2, cz, h])

        // Roof generation — looser condition, more frequent
        const enclosed = (w.left && w.right) || (w.top && w.bottom)
        const roofChance = 0.45 // 45% of eligible cells get a roof
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

    // Horizontal walls
    hWalls.forEach(([x, y, z, h], i) => {
      dummy.position.set(x, y, z)
      dummy.scale.set(1, h / baseWallHeight, 1)
      dummy.updateMatrix()
      hRef.current.setMatrixAt(i, dummy.matrix)
    })
    hRef.current.instanceMatrix.needsUpdate = true

    // Vertical walls
    vWalls.forEach(([x, y, z, h], i) => {
      dummy.position.set(x, y, z)
      dummy.scale.set(1, h / baseWallHeight, 1)
      dummy.updateMatrix()
      vRef.current.setMatrixAt(i, dummy.matrix)
    })
    vRef.current.instanceMatrix.needsUpdate = true

    // Roofs
    roofs.forEach(([x, y, z], i) => {
      dummy.position.set(x, y, z)
      dummy.updateMatrix()
      roofRef.current.setMatrixAt(i, dummy.matrix)
    })
    roofRef.current.instanceMatrix.needsUpdate = true
  }, [hWalls, vWalls, roofs, baseWallHeight])

  return (
    <group>
      {/* Floor */}
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
          color='#2a2a2a'
          // Might bring this back
          // roughness={0.8}
          // metalness={0.2}
          roughness={0.18}
          metalness={0.85}
        />
      </mesh>

      {/* Horizontal walls */}
      <instancedMesh ref={hRef} args={[null, null, hWalls.length]} frustumCulled={false}>
        <boxGeometry args={[cellSize, baseWallHeight, T]} />
        <meshStandardMaterial
          color='#7a7a7a'
          // Might bring this back
          // roughness={0.35}
          // metalness={0.6}  
          roughness={0.18}
          metalness={0.85}
          emissive='#2a2a2a'       
          emissiveIntensity={0.15}
        />
      </instancedMesh>

      {/* Vertical walls */}
      <instancedMesh ref={vRef} args={[null, null, vWalls.length]} frustumCulled={false}>
        <boxGeometry args={[T, baseWallHeight, cellSize]} />
        <meshStandardMaterial
          color='#8a8a8a'          // lighter granite tone
          roughness={0.3}
          metalness={0.7}
          emissive='#2a2a2a'
          emissiveIntensity={0.15}
        />
      </instancedMesh>

      {/* Roofs / Ceilings */}
      <instancedMesh ref={roofRef} args={[null, null, roofs.length]} frustumCulled={false}>
        <boxGeometry args={[cellSize, 0.4, cellSize]} />
        <meshStandardMaterial
          color='#9b9b9b'          // complementary pale granite
          roughness={0.25}         // shinier finish
          metalness={0.8}          // reflective sheen
          emissive='#3a3a3a'
          emissiveIntensity={0.25}
        />
      </instancedMesh>

      {/* Exit marker */}
      <mesh position={[exitCell.x * cellSize + offsetX, 1.2, exitCell.y * cellSize + offsetZ]}>
        <torusGeometry args={[0.8, 0.2, 16, 32]} />
        <meshStandardMaterial
          color='#00ffcc'
          emissive='#00ffcc'
          emissiveIntensity={1.4}
        />
      </mesh>
    </group>
  )
}
