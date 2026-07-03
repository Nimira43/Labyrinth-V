import { useMemo, useRef, useEffect, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useTexture } from '@react-three/drei'

const noiseGLSL = `
vec4 permute(vec4 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
vec3 fade(vec3 t) { return t*t*t*(t*(t*6.0-15.0)+10.0); }

float cnoise(vec3 P) {
  vec3 Pi0 = floor(P);
  vec3 Pi1 = Pi0 + vec3(1.0);
  Pi0 = mod(Pi0, 289.0);
  Pi1 = mod(Pi1, 289.0);
  vec3 Pf0 = fract(P);
  vec3 Pf1 = Pf0 - vec3(1.0);
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = Pi0.zzzz;
  vec4 iz1 = Pi1.zzzz;

  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0);
  vec4 ixy1 = permute(ixy + iz1);

  vec4 gx0 = ixy0 / 7.0;
  vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);

  vec4 gx1 = ixy1 / 7.0;
  vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(0.0, gx1) - 0.5);
  gy1 -= sz1 * (step(0.0, gy1) - 0.5);

  vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
  vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
  vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
  vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
  vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
  vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
  vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
  vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

  vec4 norm0 = taylorInvSqrt(vec4(dot(g000,g000),dot(g010,g010),dot(g100,g100),dot(g110,g110)));
  g000 *= norm0.x; g010 *= norm0.y; g100 *= norm0.z; g110 *= norm0.w;
  vec4 norm1 = taylorInvSqrt(vec4(dot(g001,g001),dot(g011,g011),dot(g101,g101),dot(g111,g111)));
  g001 *= norm1.x; g011 *= norm1.y; g101 *= norm1.z; g111 *= norm1.w;

  float n000 = dot(g000, Pf0);
  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
  float n111 = dot(g111, Pf1);

  vec3 fade_xyz = fade(Pf0);
  vec4 n_z = mix(vec4(n000,n100,n010,n110), vec4(n001,n101,n011,n111), fade_xyz.z);
  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
  float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
  return 2.2 * n_xyz;
}
`

export default function Maze({
  width, height, cells, exitCell, cellSize, wallThickness, offsetX, offsetZ, towers = []
}) {
  const { gl } = useThree()
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

  useEffect(() => {
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
  const hShaderRef = useRef()
  const vShaderRef = useRef()

  const onCompileH = useCallback((shader) => {
    shader.uniforms.uTime = { value: 0 }
    hShaderRef.current = shader

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vWorldPos;`)
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vec3 instanced = transformed;
        #ifdef USE_INSTANCING
          instanced = (instanceMatrix * vec4(transformed, 1.0)).xyz;
        #endif
        vWorldPos = (modelMatrix * vec4(instanced, 1.0)).xyz;`
      )

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uTime;
        varying vec3 vWorldPos;
        ${noiseGLSL}`
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float shimmer = cnoise(vec3(vWorldPos.xz * 0.6, uTime * 0.25));
        shimmer = smoothstep(0.25, 0.85, shimmer);
        totalEmissiveRadiance += vec3(1.0, 0.27, 0.0) * shimmer * 0.5;`
      )
  }, [])

  const onCompileV = useCallback((shader) => {
    shader.uniforms.uTime = { value: 0 }
    vShaderRef.current = shader

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vWorldPos;`)
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vec3 instanced = transformed;
        #ifdef USE_INSTANCING
          instanced = (instanceMatrix * vec4(transformed, 1.0)).xyz;
        #endif
        vWorldPos = (modelMatrix * vec4(instanced, 1.0)).xyz;`
      )

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uTime;
        varying vec3 vWorldPos;
        ${noiseGLSL}`
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float shimmer = cnoise(vec3(vWorldPos.xz * 0.6, uTime * 0.25));
        shimmer = smoothstep(0.25, 0.85, shimmer);
        totalEmissiveRadiance += vec3(1.0, 0.27, 0.0) * shimmer * 0.5;`
      )
  }, [])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (hShaderRef.current) hShaderRef.current.uniforms.uTime.value = t
    if (vShaderRef.current) vShaderRef.current.uniforms.uTime.value = t
  })

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
          (width * cellSize) / 2 + offsetX - cellSize / 2,
          0,
          (height * cellSize) / 2 + offsetZ - cellSize / 2,
        ]}
      >
        <planeGeometry args={[width * cellSize, height * cellSize]} />
        <meshStandardMaterial
          {...floorTextures}
          color='#ccbbaa'
          metalness={0.0}
          roughness={0.55}
          normalScale={new THREE.Vector2(0.8, 0.8)}
        />
      </mesh>

      <instancedMesh ref={hRef} args={[null, null, hWalls.length]} frustumCulled={false}>
        <boxGeometry args={[cellSize, baseWallHeight, T]} />
        <meshStandardMaterial
          {...wallTextures}
          color='#333a42'
          displacementScale={0.01}
          onBeforeCompile={onCompileH}
        />
      </instancedMesh>

      <instancedMesh ref={vRef} args={[null, null, vWalls.length]} frustumCulled={false}>
        <boxGeometry args={[T, baseWallHeight, cellSize]} />
        <meshStandardMaterial
          {...wallTextures}
          color='#333a42'
          displacementScale={0.01}
          onBeforeCompile={onCompileV}
        />
      </instancedMesh>

      <instancedMesh ref={roofRef} args={[null, null, roofs.length]} frustumCulled={false}>
        <boxGeometry args={[cellSize, 0.4, cellSize]} />
        <meshStandardMaterial
          color='#111111'
          roughness={0.4}
          metalness={0.8}
        />
      </instancedMesh>

      {towers.map((t, i) => (
        <group
          key={i}
          position={[t.x, 0, t.z]}
        >
          <mesh position={[0, towerHeight / 2, 0]}>
            <cylinderGeometry args={[0.55, 0.7, towerHeight, 16]} />
            <meshStandardMaterial
              color='#1a1d21'
              roughness={0.4}
              metalness={0.8}
            />
          </mesh>
          <mesh position={[0, towerHeight + 0.15, 0]}>
            <torusGeometry args={[0.5, 0.08, 12, 24]} />
            <meshStandardMaterial
              color='#ff4500'
              emissive='#ff4500'
              emissiveIntensity={1.5}
            />
          </mesh>
        </group>
      ))}

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
