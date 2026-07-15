import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PointerLockControls } from '@react-three/drei'
import * as THREE from 'three'
import { getNearbyWalls } from '../maze/mazeGenerator'

const PLAYER_RADIUS = 0.35
const TOWER_RADIUS = 0.7

function resolveWallCollisions(pos, walls) {
  for (const w of walls) {
    const closestX = Math.max(w.minX, Math.min(pos.x, w.maxX))
    const closestZ = Math.max(w.minZ, Math.min(pos.z, w.maxZ))
    const dx = pos.x - closestX
    const dz = pos.z - closestZ
    const dist = Math.sqrt(dx * dx + dz * dz)
    if (dist < PLAYER_RADIUS && dist > 0) {
      const overlap = PLAYER_RADIUS - dist
      pos.x += (dx / dist) * overlap
      pos.z += (dz / dist) * overlap
    }
  }
}

function resolveTowerCollisions(pos, towers) {
  for (const t of towers) {
    const dx = pos.x - t.x
    const dz = pos.z - t.z
    const dist = Math.sqrt(dx * dx + dz * dz)
    const minDist = PLAYER_RADIUS + TOWER_RADIUS
    if (dist < minDist && dist > 0) {
      const overlap = minDist - dist
      pos.x += (dx / dist) * overlap
      pos.z += (dz / dist) * overlap
    }
  }
}

export default function Player({
  mazeGrid, exitCell, cellSize, wallThickness,
  offsetX, offsetZ, towers = [], isActive = true
}) {
  const controls = useRef()
  const direction = useRef(new THREE.Vector3())
  const keys = useRef({})
  const hasWon = useRef(false)
  const speed = 5

  const { camera, gl } = useThree()

  useEffect(() => {
    const down = (e) => (keys.current[e.key.toLowerCase()] = true)
    const up = (e) => (keys.current[e.key.toLowerCase()] = false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  useEffect(() => {
    if (controls.current) {
      controls.current.getObject().position.set(0, 1.6, 0)
    }
  }, [])

  useEffect(() => {
    if (!isActive && controls.current) {
      controls.current.unlock()
    }
  }, [isActive])

  useFrame((_, delta) => {
    if (!controls.current || !isActive) return

    const dir = direction.current
    dir.set(0, 0, 0)

    if (keys.current['w']) dir.z -= 1
    if (keys.current['s']) dir.z += 1
    if (keys.current['a']) dir.x -= 1
    if (keys.current['d']) dir.x += 1
    dir.normalize()

    const move = new THREE.Vector3(dir.x, 0, dir.z)
    move.applyQuaternion(camera.quaternion)
    move.y = 0
    move.multiplyScalar(speed * delta)

    const pos = controls.current.getObject().position
    pos.x += move.x
    pos.z += move.z

    const walls = getNearbyWalls(mazeGrid, pos.x, pos.z, cellSize, offsetX, offsetZ, wallThickness)
    resolveWallCollisions(pos, walls)
    resolveWallCollisions(pos, walls)

    resolveTowerCollisions(pos, towers)
    resolveTowerCollisions(pos, towers)

    const exitX = exitCell.x * cellSize + offsetX
    const exitZ = exitCell.y * cellSize + offsetZ

    if (!hasWon.current && pos.distanceTo(new THREE.Vector3(exitX, pos.y, exitZ)) < 1) {
      hasWon.current = true
      controls.current.unlock()
      alert('You escaped Labyrinth V!')
    }
  })

  return (
    <PointerLockControls
      ref={controls}
      args={[camera, gl.domElement]}
    />
  )
}
