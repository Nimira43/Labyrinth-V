// Archived version

import { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'

export default function Maze({ width, height, cells, exitCell, cellSize, wallThickness, offsetX, offsetZ }) {
  const wallHeight   = 2.5
  const T            = wallThickness

  // Split walls into two groups by orientation for instancing
  const { hWalls, vWalls } = useMemo(() => {
    const hWalls = [] // horizontal (top/bottom) — box is wide on X
    const vWalls = [] // vertical   (left/right) — box is wide on Z

    cells.forEach(row => row.forEach(({ x, y, walls: w }) => {
      const cx = x * cellSize + offsetX
      const cz = y * cellSize + offsetZ

      if (w.top)
        hWalls.push([cx, wallHeight / 2, cz - cellSize / 2 - T / 2])
      if (w.bottom)
        hWalls.push([cx, wallHeight / 2, cz + cellSize / 2 + T / 2])
      if (w.left)
        vWalls.push([cx - cellSize / 2 - T / 2, wallHeight / 2, cz])
      if (w.right)
        vWalls.push([cx + cellSize / 2 + T / 2, wallHeight / 2, cz])
    }))

    return { hWalls, vWalls }
  }, [cells, cellSize, offsetX, offsetZ, wallHeight, T])

  const hRef = useRef()
  const vRef = useRef()

  useEffect(() => {
    const dummy = new THREE.Object3D()

    hWalls.forEach(([x, y, z], i) => {
      dummy.position.set(x, y, z)
      dummy.updateMatrix()
      hRef.current.setMatrixAt(i, dummy.matrix)
    })
    hRef.current.instanceMatrix.needsUpdate = true

    vWalls.forEach(([x, y, z], i) => {
      dummy.position.set(x, y, z)
      dummy.updateMatrix()
      vRef.current.setMatrixAt(i, dummy.matrix)
    })
    vRef.current.instanceMatrix.needsUpdate = true
  }, [hWalls, vWalls])

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
        <meshStandardMaterial color='#202020' />
      </mesh>

      {/* Horizontal walls (top/bottom of cells) */}
      <instancedMesh ref={hRef} args={[null, null, hWalls.length]} frustumCulled={false}>
        <boxGeometry args={[cellSize, wallHeight, T]} />
        <meshStandardMaterial color='#cccccc' />
      </instancedMesh>

      {/* Vertical walls (left/right of cells) */}
      <instancedMesh ref={vRef} args={[null, null, vWalls.length]} frustumCulled={false}>
        <boxGeometry args={[T, wallHeight, cellSize]} />
        <meshStandardMaterial color='#cccccc' />
      </instancedMesh>

      {/* Exit marker */}
      <mesh position={[exitCell.x * cellSize + offsetX, 1.2, exitCell.y * cellSize + offsetZ]}>
        <torusGeometry args={[0.8, 0.2, 16, 32]} />
        <meshStandardMaterial color='#00ffcc' emissive='#00ffcc' emissiveIntensity={1.4} />
      </mesh>
    </group>
  )
}

