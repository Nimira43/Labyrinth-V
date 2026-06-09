import { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'

export default function Maze({ width, height, cells, exitCell, cellSize, wallThickness, offsetX, offsetZ }) {
  const baseWallHeight = 2.5
  const T = wallThickness

  const { hWalls, vWalls, roofs } = useMemo(() => {
    const hWalls = []
    const vWalls = []
    const roofs = []

    cells.forEach(row =>
      row.forEach(({ x, y, walls: w }) => {
        const cx = x * cellSize + offsetX
        const cz = y * cellSize + offsetZ
        const h = baseWallHeight + Math.random() * 4 // 2.5 → 6.5

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

    roofs.forEach(([x, y, z], i) => {
      dummy.position.set(x, y, z)
      dummy.updateMatrix()
      roofRef.current.setMatrixAt(i, dummy.matrix)
    })
    roofRef.current.instanceMatrix.needsUpdate = true
  }, [hWalls, vWalls, roofs, baseWallHeight, width, height, offsetX, offsetZ, cellSize])

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[
          (width * cellSize) / 2 + offsetX,
          0,
          (height * cellSize) / 2 + offsetZ,
        ]}
      >
        <planeGeometry args={[width * cellSize, height * cellSize]} />
        <meshStandardMaterial color='#605959' roughness={0.8} metalness={0.2} />
      </mesh>

      <instancedMesh ref={hRef} args={[null, null, hWalls.length]} frustumCulled={false}>
        <boxGeometry args={[cellSize, baseWallHeight, T]} />
        <meshStandardMaterial
          color='#7a7a7a'
          roughness={0.35}
          metalness={0.6}
          emissive='#2a2a2a'
          emissiveIntensity={0.15}
        />
      </instancedMesh>

      <instancedMesh ref={vRef} args={[null, null, vWalls.length]} frustumCulled={false}>
        <boxGeometry args={[T, baseWallHeight, cellSize]} />
        <meshStandardMaterial
          color='#8a8a8a'
          roughness={0.3}
          metalness={0.7}
          emissive='#2a2a2a'
          emissiveIntensity={0.15}
        />
      </instancedMesh>

      <instancedMesh ref={roofRef} args={[null, null, roofs.length]} frustumCulled={false}>
        <boxGeometry args={[cellSize, 0.4, cellSize]} />
        <meshStandardMaterial
          color='#9b9b9b'
          roughness={0.25}
          metalness={0.8}
          emissive='#3a3a3a'
          emissiveIntensity={0.25}
        />
      </instancedMesh>

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
