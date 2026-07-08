import { Suspense, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import Maze from './components/Maze'
import Player from './components/Player'
import BackgroundMusic from './components/BackgroundMusic'
import { generateMaze, generateTowerPositions } from './maze/mazeGenerator'

export default function App() {
  const cellSize = 3
  const wallThickness = 0.3
  const width = 30
  const height = 30

  const { cells, exitCell } = useMemo(
    () => generateMaze(width, height, 0.2),
    [width, height]
  )

  const offsetX = -(width * cellSize) / 2
  const offsetZ = -(height * cellSize) / 2

  // Tower grid cells -> world positions, same conversion used for maze cells.
  const towers = useMemo(() => {
    const towerCells = generateTowerPositions(width, height, 3)
    return towerCells.map(({ x, y }) => ({
      x: x * cellSize + offsetX,
      z: y * cellSize + offsetZ,
    }))
  }, [width, height, cellSize, offsetX, offsetZ])

  return (
    <>
      <BackgroundMusic url='/sounds/bg.ogg' volume={0.4} />
      <Canvas
        camera={{
          position: [0, 1.6, 0], fov: 80
        }}
      >
        <Environment
          // city preset being normally used,
          preset='city'
          intensity={0.7}

          // night: 
          // preset='night'
          // intensity={0.5}
        />
        <color
          attach='background'
          args={['#0a1118']}
        /> 
        <fog
          attach='fog'
          args={['#0a1118', 10, 50]}
        /> 
        <ambientLight intensity={0.15} /> 
        <directionalLight
          position={[10, 20, 10]}
          intensity={0.6}
          color='#ffffff'
        />
        <Suspense fallback={null}>
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
          />
          <Player
            mazeGrid={cells}
            exitCell={exitCell}
            cellSize={cellSize}
            wallThickness={wallThickness}
            offsetX={offsetX}
            offsetZ={offsetZ}
            towers={towers}
          />
        </Suspense>
      </Canvas>
    </>
  )
}




