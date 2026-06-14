import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment } from '@react-three/drei'

import Maze from './components/Maze'
import Player from './components/Player'
import { generateMaze } from './maze/mazeGenerator'

export default function App() {
  const cellSize = 3
  const wallThickness = 0.3
  const width = 30
  const height = 30

  const { cells, exitCell } = generateMaze(width, height, 0.2)

  const offsetX = -(width * cellSize) / 2
  const offsetZ = -(height * cellSize) / 2

  return (
    <Canvas camera={{ position: [0, 1.6, 0], fov: 80 }}>
      
      <Environment preset="city" intensity={0.7} />
      
      <color attach='background' args={['#0a1118']} /> 
      <fog attach='fog' args={['#0a1118', 10, 50]} /> 

      <ambientLight intensity={0.15} /> 
      <directionalLight position={[10, 20, 10]} intensity={0.6} color='#ffffff' />

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
        />

        <Player
          mazeGrid={cells}
          exitCell={exitCell}
          cellSize={cellSize}
          offsetX={offsetX}
          offsetZ={offsetZ}
        />
      </Suspense>
    </Canvas>
  )
}




