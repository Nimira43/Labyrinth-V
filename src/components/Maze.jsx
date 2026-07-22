import { useMemo, useRef, useEffect, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useTexture } from '@react-three/drei'
import { makeWallShader } from '../shaders/wallShader'
import Towers from './Towers'

const EXIT_GLOW_RANGE = 15

export default function Maze({
  width, height, cells, exitCell, cellSize, wallThickness,
  offsetX, offsetZ, towers = [], onHit, isActive = true
}) {
  const { gl, camera } = useThree()
  const baseWallHeight = 2.5
  const towerHeight = 10
  const T = wallThickness

  const wallTextures = useTexture({
    map: '/textures/Metal048A/Metal048A_4K-JPG_Color.jpg',
    roughnessMap: '/textures/Metal048A/Metal048A_4K-JPG_Roughness.jpg',
    metalnessMap: '/textures/Metal048A/Metal048A_4K-JPG_Metalness.jpg',
    normalMap: '/textures/Metal048A/Metal048A_4K-JPG_NormalGL.jpg',
    displacementMap: '/textures/Metal048A/Metal048A_4K-JPG_Displacement.jpg',
  })

  const floorTextures = useTexture({
    map: '/textures/WoodFloor048/WoodFloor048_2K-JPG_Color.jpg',
    roughnessMap: '/textures/WoodFloor048/WoodFloor048_2K-JPG_Roughness.jpg',
    normalMap: '/textures/WoodFloor048/WoodFloor048_2K-JPG_NormalGL.jpg',
  })

  const texturesConfigured = useRef(false)

  useEffect(() => {
    if (texturesConfigured.current) return
    texturesConfigured.current = true

    const maxAniso = gl.capabilities.getMaxAnisotropy()

    Object.values(wallTextures).forEach((texture) => {
      texture.wrapS = THREE.RepeatWrapping
      texture.wrapT = THREE.RepeatWrapping
      texture.repeat.set(1, 1)
      texture.anisotropy = maxAniso
      texture.needsUpdate = true
    })

    Object.values(floorTextures).forEach((texture) => {
      texture.wrapS = THREE.RepeatWrapping
      texture.wrapT = THREE.RepeatWrapping
      texture.repeat.set(width / 2, height / 2)
      texture.anisotropy = maxAniso
      texture.needsUpdate = true
    })
  }, [wallTextures, floorTextures, width, height, gl])

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
        if (enclosed && Math.random() < 0.45) {
          roofs.push([cx, h + 0.2 + Math.random() * 0.6, cz])
        }
      })
    )

    return { hWalls, vWalls, roofs }
  }, [cells, cellSize, offsetX, offsetZ, baseWallHeight, T])

  const hRef = useRef()
  const vRef = useRef()
  const roofRef = useRef()
  const hShaderRef = useRef()
  const vShaderRef = useRef()
  const exitHaloRef = useRef()

  const onCompileH = useCallback((shader) => { makeWallShader(hShaderRef)(shader) }, [])
  const onCompileV = useCallback((shader) => { makeWallShader(vShaderRef)(shader) }, [])

  const exitWorldX = exitCell.x * cellSize + offsetX
  const exitWorldZ = exitCell.y * cellSize + offsetZ

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (hShaderRef.current) hShaderRef.current.uniforms.uTime.value = t
    if (vShaderRef.current) vShaderRef.current.uniforms.uTime.value = t

    if (exitHaloRef.current?.material) {
      const dx = camera.position.x - exitWorldX
      const dz = camera.position.z - exitWorldZ
      const dist = Math.sqrt(dx * dx + dz * dz)
      const proximity = Math.max(0, 1 - dist / EXIT_GLOW_RANGE)
      const pulseSpeed = 1 + proximity * 8
      exitHaloRef.current.material.emissiveIntensity =
        1.5 + Math.sin(t * pulseSpeed * Math.PI * 2) * proximity * 1.5
    }
  })

  useEffect(() => {
    const dummy = new THREE.Object3D()

    hWalls.forEach(([x, y, z, h], i) => {
      const isOuter =
        x <= offsetX + cellSize / 2 ||
        x >= offsetX + width  * cellSize - cellSize / 2 ||
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
        x >= offsetX + width  * cellSize - cellSize / 2 ||
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
          (width  * cellSize) / 2 + offsetX - cellSize / 2,
          0,
          (height * cellSize) / 2 + offsetZ - cellSize / 2,
        ]}
      >
        <planeGeometry args={[width * cellSize, height * cellSize]} />
        <meshStandardMaterial
          {...floorTextures}
          color='#8a7a6a'
          metalness={0.0}
          roughness={0.3}
          normalScale={new THREE.Vector2(0.8, 0.8)}
        />
      </mesh>

      <instancedMesh
        ref={hRef}
        args={[null, null, hWalls.length]}
        frustumCulled={false}
      >
        <boxGeometry args={[cellSize, baseWallHeight, T]} />
        <meshStandardMaterial
          {...wallTextures}
          color='#333a42'
          displacementScale={0.01}
          onBeforeCompile={onCompileH}
        />
      </instancedMesh>

      <instancedMesh
        ref={vRef}
        args={[null, null, vWalls.length]}
        frustumCulled={false}
      >
        <boxGeometry args={[T, baseWallHeight, cellSize]} />
        <meshStandardMaterial
          {...wallTextures}
          color='#333a42'
          displacementScale={0.01}
          onBeforeCompile={onCompileV}
        />
      </instancedMesh>

      <instancedMesh
        ref={roofRef}
        args={[null, null, roofs.length]}
        frustumCulled={false}
      >
        <boxGeometry args={[cellSize, 0.4, cellSize]} />
        <meshStandardMaterial
          color='#111111'
          roughness={0.4}
          metalness={0.8}
        />
      </instancedMesh>

      <Towers
        towers={towers}
        towerHeight={towerHeight}
        cells={cells}
        cellSize={cellSize}
        offsetX={offsetX}
        offsetZ={offsetZ}
        onHit={onHit}
        isActive={isActive}
      />

      <mesh
        ref={exitHaloRef}
        position={[exitWorldX, 1.2, exitWorldZ]}
      >
        <torusGeometry args={[0.8, 0.15, 12, 24]} />
        <meshStandardMaterial
          color='#ff4500'
          emissive='#ff4500'
          emissiveIntensity={1.5}
        />
      </mesh>

    </group>
  )
}
