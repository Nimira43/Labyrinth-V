import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

const STAR_COUNT    = 2500
const SPHERE_RADIUS = 300  

const vertexShader = `
  uniform float uTime;
  attribute float aPhase;
  attribute float aSize;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Each star twinkles independently via its own random phase offset
    float twinkle = 0.55 + 0.45 * sin(uTime * 1.8 + aPhase);
    gl_PointSize = aSize * twinkle * (300.0 / -mvPosition.z);
  }
`

const fragmentShader = `
  void main() {
    // Discard corners to make circular points
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;

    // Soft-edged glow — bright core, fades toward edge
    float alpha = 1.0 - smoothstep(0.15, 0.5, dist);

    // Slightly warm white — not pure white so they feel natural
    gl_FragColor = vec4(1.0, 0.96, 0.88, alpha);

    #include <colorspace_fragment>
  }
`

function buildStarGeometry() {
  const positions = new Float32Array(STAR_COUNT * 3)
  const phases    = new Float32Array(STAR_COUNT)
  const sizes     = new Float32Array(STAR_COUNT)

  for (let i = 0; i < STAR_COUNT; i++) {
    const theta = Math.random() * Math.PI * 2
    const phi   = Math.acos(2 * Math.random() - 1)

    positions[i * 3]     = SPHERE_RADIUS * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = SPHERE_RADIUS * Math.cos(phi)
    positions[i * 3 + 2] = SPHERE_RADIUS * Math.sin(phi) * Math.sin(theta)

    phases[i] = Math.random() * Math.PI * 2
    sizes[i]  = 1.2 + Math.random() * 2.8
  }

  return { positions, phases, sizes }
}

const STAR_DATA = buildStarGeometry()

export default function Starfield() {
  const pointsRef   = useRef()
  const materialRef = useRef()
  const { positions, phases, sizes } = STAR_DATA

  useFrame(({ clock }) => {
    // Drive the twinkle uniform
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.getElapsedTime()
    }
    // Very slow drift — sky feels alive without being distracting
    if (pointsRef.current) {
      pointsRef.current.rotation.y += 0.000035
      pointsRef.current.rotation.x += 0.000012
    }
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach='attributes-position'
          array={positions}
          count={STAR_COUNT}
          itemSize={3}
        />
        <bufferAttribute
          attach='attributes-aPhase'
          array={phases}
          count={STAR_COUNT}
          itemSize={1}
        />
        <bufferAttribute
          attach='attributes-aSize'
          array={sizes}
          count={STAR_COUNT}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        uniforms={{ uTime: { value: 0 } }}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent={true}
        depthWrite={false}
      />
    </points>
  )
}