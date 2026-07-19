import { Suspense, useMemo, useState, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import Maze from './components/Maze'
import Player from './components/Player'
import BackgroundMusic from './components/BackgroundMusic'
import HUD from './components/HUD'
import { generateMaze, generateTowerPositions } from './maze/mazeGenerator'
import Starfield from './components/Starfield'

const MAX_HEALTH = 100

export default function App() {
  const cellSize = 3
  const wallThickness = 0.3
  const width = 30
  const height = 30

  const { cells, exitCell } = useMemo(
    () => generateMaze(width, height, 0.2),
    [width, height]
  )

  const offsetX = -(width  * cellSize) / 2
  const offsetZ = -(height * cellSize) / 2

  const towers = useMemo(() => {
    const towerCells = generateTowerPositions(width, height, 3)
    return towerCells.map(({ x, y }) => ({
      x: x * cellSize + offsetX,
      z: y * cellSize + offsetZ,
    }))
  }, [width, height, cellSize, offsetX, offsetZ])

  const [health, setHealth] = useState(MAX_HEALTH)
  const [gameOver, setGameOver] = useState(false)

  const handleHit = useCallback((damage) => {
    setHealth(prev => {
      const next = Math.max(0, prev - damage)
      if (next === 0) setGameOver(true)
      return next
    })
  }, [])

  const handleRestart = () => window.location.reload()

  return (
    <>
      <BackgroundMusic url='/sounds/bg.ogg' volume={0.4} />

      <HUD health={health} maxHealth={MAX_HEALTH} />

      {gameOver && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 20,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0, 0, 0, 0.82)',
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            fontFamily: 'monospace',
            fontSize:  48,
            fontWeight: 'bold',
            letterSpacing: 8,
            color: '#ff4500',
            textTransform: 'uppercase',
            textShadow: '0 0 40px #ff4500, 0 0 80px #ff2200',
            marginBottom: 16,
          }}>
            System Failure
          </div>

          <div style={{
            fontFamily: 'monospace',
            fontSize: 13,
            letterSpacing: 4,
            color: 'rgba(255, 69, 0, 0.6)',
            textTransform: 'uppercase',
            marginBottom: 48,
          }}>
            Integrity compromised
          </div>

          <button
            onClick={handleRestart}
            style={{
              fontFamily: 'monospace',
              fontSize: 13,
              letterSpacing: 4,
              textTransform: 'uppercase',
              color: '#ff4500',
              background: 'transparent',
              border: '1px solid rgba(255, 69, 0, 0.5)',
              padding: '12px 32px',
              cursor: 'pointer',
              borderRadius: 2,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => {
              e.target.style.background = 'rgba(255, 69, 0, 0.15)'
              e.target.style.borderColor = '#ff4500'
              e.target.style.boxShadow = '0 0 20px rgba(255,69,0,0.3)'
            }}
            onMouseLeave={e => {
              e.target.style.background = 'transparent'
              e.target.style.borderColor = 'rgba(255,69,0,0.5)'
              e.target.style.boxShadow = 'none'
            }}
          >
            Re-enter Labyrinth
          </button>
        </div>
      )}

      <Canvas camera={{ position: [0, 1.6, 0], fov: 80 }}>
        <Environment preset='city' intensity={0.7} />
        <color attach='background' args={['#0a1118']} />
        <fog attach='fog' args={['#0a1118', 10, 50]} />
        <ambientLight intensity={0.15} />
        <directionalLight position={[10, 20, 10]} intensity={0.6} color='#ffffff' />

        <Suspense fallback={null}>
          <Starfield />
          <Maze
            width={width}
            height={height}
            cells={cells}
            exitCell={exitCell}
            cellSize={cellSize}
            wallThickness={wallThickness}
            offsetX={offsetX}
            offsetZ={offsetZ}
            towers={towers}
            onHit={handleHit}
            isActive={!gameOver}
          />
          <Player
            mazeGrid={cells}
            exitCell={exitCell}
            cellSize={cellSize}
            wallThickness={wallThickness}
            offsetX={offsetX}
            offsetZ={offsetZ}
            towers={towers}
            isActive={!gameOver}
          />
        </Suspense>
      </Canvas>
    </>
  )
}