"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Sky,
  Text,
  Cloud,
  Clouds,
  useGLTF,
} from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

interface SceneProps {
  awosData: any;
  resetCameraTrigger: number;
  hour: number;
  droneMode?: boolean;
}

function CameraController({ resetTrigger }: { resetTrigger: number }) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    camera.position.set(0, 80, 150);
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  }, [resetTrigger, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableZoom={true}
      maxPolarAngle={Math.PI / 2 - 0.02}
      minDistance={10}
      maxDistance={800}
    />
  );
}

function CompassHUD() {
  const { camera } = useThree();

  useFrame(() => {
    const hudElement = document.getElementById("compass-hud");

    if (hudElement) {
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);

      let angle = Math.atan2(dir.x, -dir.z) * (180 / Math.PI);
      if (angle < 0) angle += 360;

      const roundedAngle = Math.round(angle);
      const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
      const dirIndex = Math.round(angle / 45) % 8;
      const compassString = directions[dirIndex];
      const displayAngle = roundedAngle === 0 ? 360 : roundedAngle;

      hudElement.innerText = `Arah: ${displayAngle}° (${compassString})`;
    }
  });

  return null;
}

function useKeyboard() {
  const [keys, setKeys] = useState<{ [key: string]: boolean }>({});
  useEffect(() => {
    const down = (e: KeyboardEvent) =>
      setKeys((k) => ({ ...k, [e.code]: true }));
    const up = (e: KeyboardEvent) =>
      setKeys((k) => ({ ...k, [e.code]: false }));
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);
  return keys;
}

function DroneInspector({ awosData }: { awosData: any }) {
  const droneRef = useRef<THREE.Group>(null);
  const keys = useKeyboard();
  const { camera } = useThree();
  const { scene } = useGLTF("/drone.glb");

  const controlsRef = useRef<any>(null);
  const prevPos = useRef(new THREE.Vector3(0, 10, 80));

  const isMoving =
    keys["KeyW"] ||
    keys["KeyS"] ||
    keys["KeyA"] ||
    keys["KeyD"] ||
    keys["Space"] ||
    keys["ShiftLeft"];

  useEffect(() => {
    camera.position.set(0, 15, 100);
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 10, 80);
      controlsRef.current.update();
    }
  }, [camera]);

  useFrame((_, delta) => {
    if (!droneRef.current) return;
    const speed = 40 * delta;
    const rotSpeed = 2 * delta;

    if (keys["KeyW"]) droneRef.current.translateZ(-speed);
    if (keys["KeyS"]) droneRef.current.translateZ(speed);
    if (keys["KeyA"]) droneRef.current.rotation.y += rotSpeed;
    if (keys["KeyD"]) droneRef.current.rotation.y -= rotSpeed;
    if (keys["Space"]) droneRef.current.position.y += speed;
    if (keys["ShiftLeft"]) droneRef.current.position.y -= speed;

    const minY = 1;
    const maxY = 200;
    const limitX = 600;
    const limitZ = 600;
    if (droneRef.current.position.y < minY) droneRef.current.position.y = minY;
    if (droneRef.current.position.y > maxY) droneRef.current.position.y = maxY;
    if (droneRef.current.position.x < -limitX)
      droneRef.current.position.x = -limitX;
    if (droneRef.current.position.x > limitX)
      droneRef.current.position.x = limitX;
    if (droneRef.current.position.z < -limitZ)
      droneRef.current.position.z = -limitZ;
    if (droneRef.current.position.z > limitZ)
      droneRef.current.position.z = limitZ;

    const droneZ = droneRef.current.position.z;
    let curDir = awosData?.mid?.wd || 40;
    let curSpeed = awosData?.mid?.ws || 0;
    if (droneZ > 0) {
      const f = Math.min(droneZ / 110, 1);
      curDir = THREE.MathUtils.lerp(
        awosData?.mid?.wd || 40,
        awosData?.site04?.wd || 40,
        f,
      );
      curSpeed = THREE.MathUtils.lerp(
        awosData?.mid?.ws || 0,
        awosData?.site04?.ws || 0,
        f,
      );
    } else {
      const f = Math.min(-droneZ / 110, 1);
      curDir = THREE.MathUtils.lerp(
        awosData?.mid?.wd || 40,
        awosData?.site22?.wd || 40,
        f,
      );
      curSpeed = THREE.MathUtils.lerp(
        awosData?.mid?.ws || 0,
        awosData?.site22?.ws || 0,
        f,
      );
    }
    if (curSpeed > 5) {
      const toRad = THREE.MathUtils.degToRad(curDir + 180);
      const pushForce =
        curSpeed * 0.5 * delta +
        (Math.random() - 0.5) * (curSpeed * 0.1 * delta);
      droneRef.current.position.x += Math.sin(toRad) * pushForce;
      droneRef.current.position.z -= Math.cos(toRad) * pushForce;
    }

    const dronePos = droneRef.current.position;

    if (isMoving) {
      const droneRot = droneRef.current.rotation.y;
      const cameraOffset = new THREE.Vector3(
        Math.sin(droneRot) * 15,
        8,
        Math.cos(droneRot) * 15,
      );
      const targetCameraPos = dronePos.clone().add(cameraOffset);
      camera.position.lerp(targetCameraPos, 0.1);
      camera.lookAt(dronePos);

      if (controlsRef.current) {
        controlsRef.current.target.copy(dronePos);
      }
    } else {
      const displacement = dronePos.clone().sub(prevPos.current);
      camera.position.add(displacement);

      if (controlsRef.current) {
        controlsRef.current.target.copy(dronePos);
        controlsRef.current.update();
      }
    }
    prevPos.current.copy(dronePos);
  });

  return (
    <>
      <group ref={droneRef} position={[0, 10, 80]}>
        <primitive object={scene} scale={4} />
      </group>
      <OrbitControls
        ref={controlsRef}
        enabled={!isMoving}
        enablePan={false}
        minDistance={5}
        maxDistance={80}
        maxPolarAngle={Math.PI / 2 - 0.02}
      />
    </>
  );
}

// KOMPONEN MODEL BANGUNAN

// Fungsi helper untuk memperbaiki rotasi, skala, dan material gelap dari GLB
function fixGLB(scene: THREE.Group) {
  const clone = scene.clone();
  clone.traverse((child: any) => {
    if (child.isMesh && child.material) {
      // Kurangi sifat metalik agar tidak memantulkan warna hitam dari void
      child.material.metalness = 0.1;
      child.material.roughness = 0.8;
      child.material.needsUpdate = true;
    }
  });
  return clone;
}

function TerminalModel({ position }: { position: [number, number, number] }) {
  const { scene } = useGLTF("/terminal_bandara_apt_pranoto.glb");
  const model = useMemo(() => fixGLB(scene), [scene]);
  return (
    <group position={position}>
      <primitive
        object={model}
        scale={0.4}
        rotation={[-Math.PI / 2, 0, THREE.MathUtils.degToRad(-90)]}
      />
      <Text
        position={[0, 10, 0]}
        fontSize={2}
        color="white"
        outlineWidth={0.2}
        outlineColor="black"
      >
        TERMINAL
      </Text>
    </group>
  );
}

function TowerATCModel({ position }: { position: [number, number, number] }) {
  const { scene } = useGLTF("/tower_atc_model.glb");
  const model = useMemo(() => fixGLB(scene), [scene]);
  return (
    <group position={position}>
      <primitive object={model} scale={1.1} rotation={[-Math.PI / 2, 0, 0]} />
      <Text
        position={[0, 14, 0]}
        fontSize={1.8}
        color="white"
        outlineWidth={0.2}
        outlineColor="black"
      >
        TOWER
      </Text>
    </group>
  );
}

function BMKGModel({ position }: { position: [number, number, number] }) {
  const { scene } = useGLTF("/kantor_bmkg_apt_pranoto.glb");
  const model = useMemo(() => fixGLB(scene), [scene]);
  return (
    <group position={position}>
      <primitive
        object={model}
        scale={0.4}
        rotation={[-Math.PI / 2, 0, THREE.MathUtils.degToRad(90)]}
      />
      <Text
        position={[0, 5, 0]}
        fontSize={1.8}
        color="white"
        outlineWidth={0.2}
        outlineColor="black"
      >
        BMKG
      </Text>
    </group>
  );
}

function PertaminaModel({ position }: { position: [number, number, number] }) {
  const { scene } = useGLTF("/pertamina_apt_pranoto.glb");
  const model = useMemo(() => fixGLB(scene), [scene]);
  return (
    <group position={position}>
      <primitive
        object={model}
        scale={0.3}
        rotation={[-Math.PI / 2, 0, THREE.MathUtils.degToRad(90)]}
      />
      <Text
        position={[0, 5, 0]}
        fontSize={1.2}
        color="white"
        outlineWidth={0.2}
        outlineColor="red"
      >
        PERTAMINA
      </Text>
    </group>
  );
}

function FireStationModel({
  position,
}: {
  position: [number, number, number];
}) {
  const { scene } = useGLTF("/fire_station_apt_pranoto.glb");
  const model = useMemo(() => fixGLB(scene), [scene]);
  return (
    <group position={position}>
      <primitive
        object={model}
        scale={0.3}
        rotation={[-Math.PI / 2, 0, THREE.MathUtils.degToRad(-90)]}
      />
      <Text
        position={[0, 5, 0]}
        fontSize={1.2}
        color="white"
        outlineWidth={0.2}
        outlineColor="black"
      >
        FIRE STATION
      </Text>
    </group>
  );
}

// TOWER AWOS
function AwosTower({
  position,
  windDir,
  label,
}: {
  position: [number, number, number];
  windDir: number;
  label: string;
}) {
  const windValue = typeof windDir === "number" ? windDir : 0;
  const vaneRotationY = THREE.MathUtils.degToRad(180 - windValue);
  const runwayCompensation = THREE.MathUtils.degToRad(-40);
  const finalRotation = vaneRotationY - runwayCompensation;

  return (
    <group position={position}>
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[1.5, 0.4, 1.5]} />
        <meshStandardMaterial color="#888888" />
      </mesh>
      <mesh position={[0, 4.7, 0]}>
        <cylinderGeometry args={[0.1, 0.3, 9, 4]} />
        <meshStandardMaterial color="#cccccc" wireframe />
      </mesh>
      <mesh position={[0, 9.2, 0]}>
        <boxGeometry args={[1.2, 0.05, 0.05]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      <group position={[0, 9.5, 0]} rotation={[0, finalRotation, 0]}>
        <mesh position={[0, 0, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.1, 0.4, 8]} />
          <meshStandardMaterial color="#e74c3c" />
        </mesh>
        <mesh position={[0, 0, -0.3]}>
          <boxGeometry args={[0.02, 0.2, 0.4]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      </group>
      <Text
        position={[0, 11, 0]}
        fontSize={2}
        color="#ffffff"
        anchorY="bottom"
        outlineWidth={0.2}
        outlineColor="#000000"
      >
        {label}
      </Text>
    </group>
  );
}

// ANGIN 3D BOLA
function Wind3DParticles({
  site04,
  mid,
  site22,
}: {
  site04: any;
  mid: any;
  site22: any;
}) {
  const count = 1500;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorObj = useMemo(() => new THREE.Color(), []);

  const particles = useMemo(() => {
    return Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 400,
      baseY: 2 + Math.random() * 6,
      z: (Math.random() - 0.5) * 400,
      speedFactor: 0.6 + Math.random() * 0.6,
    }));
  }, [count]);

  const getWindColor = (speed: number) => {
    if (speed < 5) return "#74b9ff";
    if (speed < 10) return "#55efc4";
    if (speed < 15) return "#ffeaa7";
    if (speed < 20) return "#fab1a0";
    return "#ff7675";
  };

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const wd04 = site04?.wd || 40;
    const ws04 = site04?.ws || 5;
    const wdMid = mid?.wd || 40;
    const wsMid = mid?.ws || 5;
    const wd22 = site22?.wd || 40;
    const ws22 = site22?.ws || 5;

    particles.forEach((p, i) => {
      let curDir = wdMid;
      let curSpeed = wsMid;
      if (p.z > 0) {
        const f = Math.min(p.z / 110, 1);
        curDir = THREE.MathUtils.lerp(wdMid, wd04, f);
        curSpeed = THREE.MathUtils.lerp(wsMid, ws04, f);
      } else {
        const f = Math.min(-p.z / 110, 1);
        curDir = THREE.MathUtils.lerp(wdMid, wd22, f);
        curSpeed = THREE.MathUtils.lerp(wsMid, ws22, f);
      }

      const toRad = THREE.MathUtils.degToRad(curDir + 180);
      const velocity = Math.max(curSpeed, 1) * 1.5 * p.speedFactor * delta;

      p.x += Math.sin(toRad) * velocity;
      p.z -= Math.cos(toRad) * velocity;
      let currentY = p.baseY;

      if (Math.abs(p.x) > 200 || Math.abs(p.z) > 200) {
        p.x = (Math.random() - 0.5) * 400;
        p.z = (Math.random() - 0.5) * 400;
      }

      dummy.position.set(p.x, currentY, p.z);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
      meshRef.current!.setColorAt(i, colorObj.set(getWindColor(curSpeed)));
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor)
      meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.5, 8, 8]} />
      <meshStandardMaterial transparent opacity={0.6} roughness={0.5} />
    </instancedMesh>
  );
}

// GENERATOR AWAN
function RealisticClouds({ skyString }: { skyString: string }) {
  const str = (skyString || "").toUpperCase();
  const cloudData = useMemo(() => {
    let count = 0;
    if (str.includes("OVC") || str.includes("VV")) count = 25;
    else if (str.includes("BKN")) count = 15;
    else if (str.includes("SCT")) count = 8;
    else if (str.includes("FEW")) count = 4;

    return Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 400,
      y: 50 + Math.random() * 20,
      z: (Math.random() - 0.5) * 400,
      op: 0.5 + Math.random() * 0.4,
    }));
  }, [str]);

  return (
    <Clouds material={THREE.MeshLambertMaterial}>
      {cloudData.map((c, i) => (
        <Cloud
          key={i}
          position={[c.x, c.y, c.z]}
          opacity={c.op}
          speed={0.2}
          bounds={[25, 15, 25]}
          color={str.includes("OVC") ? "#7f8c8d" : "#ffffff"}
        />
      ))}
    </Clouds>
  );
}

// EFEK PETIR
function LightningFX({ ltx }: { ltx: string }) {
  const str = (ltx || "").toUpperCase();
  const lightRef = useRef<THREE.PointLight>(null);

  const pos = useMemo(() => {
    let x = 0,
      z = 0;
    const dist = 350;
    if (str.includes(" N")) z = -dist;
    else if (str.includes(" S")) z = dist;
    else if (str.includes(" E")) x = dist;
    else if (str.includes(" W")) x = -dist;
    else if (str.includes("NE")) {
      x = dist;
      z = -dist;
    } else if (str.includes("NW")) {
      x = -dist;
      z = -dist;
    } else if (str.includes("SE")) {
      x = dist;
      z = dist;
    } else if (str.includes("SW")) {
      x = -dist;
      z = dist;
    }
    return [x, 60, z] as [number, number, number];
  }, [str]);

  useFrame(() => {
    if (lightRef.current) {
      const randomFlash = Math.random();
      lightRef.current.intensity = randomFlash > 0.95 ? 15000 : 0;
    }
  });

  if (!str.includes("LTG")) return null;

  return (
    <group position={pos}>
      <pointLight ref={lightRef} color="#a29bfe" distance={500} decay={2} />
      <Clouds material={THREE.MeshLambertMaterial}>
        <Cloud
          opacity={0.9}
          speed={0.1}
          bounds={[30, 20, 30]}
          color="#2d3436"
        />
      </Clouds>
    </group>
  );
}

export default function Scene3D({
  awosData,
  resetCameraTrigger,
  hour,
  droneMode,
}: SceneProps) {
  const isNight = hour >= 18 || hour < 6;
  const isMorning = hour >= 6 && hour < 10;
  const isAfternoon = hour >= 15 && hour < 18;

  let sunPos: [number, number, number] = [0, 50, 0];
  if (isNight) sunPos = [0, -50, 0];
  else if (isMorning) sunPos = [150, 20, 150];
  else if (isAfternoon) sunPos = [-150, 20, -150];

  const minVis = Math.min(
    awosData.site04?.vis || 10000,
    awosData.site22?.vis || 10000,
  );
  let fogDensity = isNight ? 0.001 : 0.0003;
  if (minVis < 1000) fogDensity = 0.015;

  const runwayRotationY = THREE.MathUtils.degToRad(-40);
  const ltxData =
    awosData.mid?.ltx || awosData.site04?.ltx || awosData.site22?.ltx || "";

  return (
    <div className="absolute inset-0 z-0">
      <Canvas camera={{ position: [0, 80, 150], fov: 50 }}>
        {!droneMode && <CameraController resetTrigger={resetCameraTrigger} />}
        {droneMode && <DroneInspector awosData={awosData} />}

        <CompassHUD />

        <Sky
          sunPosition={sunPos}
          turbidity={minVis < 3000 ? 15 : 2}
          rayleigh={isNight ? 0.1 : 2}
        />
        <fogExp2
          attach="fog"
          args={[
            isNight ? "#0f172a" : minVis < 3000 ? "#bdc3c7" : "#87CEEB",
            fogDensity,
          ]}
        />

        <ambientLight intensity={0.8} />
        <directionalLight
          position={isNight ? [-50, 60, -50] : sunPos}
          intensity={isNight ? 0.4 : isAfternoon || isMorning ? 0.8 : 1.2}
          color={isNight ? "#b0c4de" : "#ffffff"}
          castShadow
        />

        <Wind3DParticles
          site04={awosData.site04}
          mid={awosData.mid}
          site22={awosData.site22}
        />
        <RealisticClouds skyString={awosData.site04?.sky || "FEW"} />
        <LightningFX ltx={ltxData} />

        {/* TANAH */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[3000, 3000]} />
          <meshStandardMaterial color="#558b2f" roughness={0.8} />
        </mesh>

        <group rotation={[0, runwayRotationY, 0]}>
          {/* GUNUNG 300m di NW */}
          <group position={[-300, 0, 0]}>
            <mesh position={[0, 15, -120]}>
              <coneGeometry args={[120, 30, 32]} />
              <meshStandardMaterial color="#2e5a1c" />
            </mesh>
            <mesh position={[20, 15, 0]}>
              <coneGeometry args={[140, 30, 32]} />
              <meshStandardMaterial color="#386b24" />
            </mesh>
            <mesh position={[-10, 15, 120]}>
              <coneGeometry args={[100, 30, 32]} />
              <meshStandardMaterial color="#254b17" />
            </mesh>
          </group>

          {/* RUNWAY */}
          <mesh position={[0, 0.05, 0]}>
            <boxGeometry args={[12, 0.1, 225]} />
            <meshStandardMaterial color="#212121" />
          </mesh>
          <mesh position={[0, 0.11, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.5, 205]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <Text
            position={[0, 0.12, 98]}
            rotation={[-Math.PI / 2, 0, Math.PI]}
            fontSize={6}
            color="#ffffff"
          >
            04
          </Text>
          <Text
            position={[0, 0.12, -98]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={6}
            color="#ffffff"
          >
            22
          </Text>

          {isNight && (
            <group>
              {Array.from({ length: 20 }).map((_, i) => (
                <mesh key={`L${i}`} position={[6.5, 0.2, -100 + i * 10]}>
                  <sphereGeometry args={[0.4]} />
                  <meshBasicMaterial color="#ffc107" />
                </mesh>
              ))}
              {Array.from({ length: 20 }).map((_, i) => (
                <mesh key={`R${i}`} position={[-6.5, 0.2, -100 + i * 10]}>
                  <sphereGeometry args={[0.4]} />
                  <meshBasicMaterial color="#ffc107" />
                </mesh>
              ))}
            </group>
          )}

          {/* SENSOR AWOS */}
          <AwosTower
            position={[-16, 0, -95]}
            windDir={awosData.site22?.wd}
            label="AWOS 22"
          />
          <AwosTower
            position={[16, 0, 0]}
            windDir={awosData.mid?.wd}
            label="AWOS MID"
          />
          <AwosTower
            position={[16, 0, 95]}
            windDir={awosData.site04?.wd}
            label="AWOS 04"
          />

          {/* TAXIWAY */}
          <mesh position={[12, 0.04, -10]}>
            <boxGeometry args={[12, 0.08, 6]} />
            <meshStandardMaterial color="#37474f" />
          </mesh>
          <mesh position={[12, 0.04, -105]}>
            <boxGeometry args={[12, 0.08, 6]} />
            <meshStandardMaterial color="#37474f" />
          </mesh>
          <mesh position={[24, 0.04, -57.5]}>
            <boxGeometry args={[12, 0.08, 100]} />
            <meshStandardMaterial color="#455a64" />
          </mesh>

          {/* === CUSTOM GLB MODELS === */}
          <TerminalModel position={[40, -0.1, -90]} />
          <TowerATCModel position={[40, 0, -45]} />
          <BMKGModel position={[40, 0.1, -30]} />
          <PertaminaModel position={[48, 0.1, 15]} />
          <FireStationModel position={[32, 0.1, 15]} />

          {/* DANAU */}
          <group position={[45, 0.1, -5]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[10, 25]} />
              <meshStandardMaterial
                color="#3498db"
                roughness={0.1}
                metalness={0.8}
              />
            </mesh>
            <Text
              position={[0, 2, 0]}
              fontSize={1.8}
              color="white"
              outlineWidth={0.2}
              outlineColor="black"
            >
              LAKE
            </Text>
          </group>
        </group>
      </Canvas>
    </div>
  );
}

// Pre-load all GLB models
useGLTF.preload("/drone.glb");
useGLTF.preload("/terminal_bandara_apt_pranoto.glb");
useGLTF.preload("/tower_atc_model.glb");
useGLTF.preload("/kantor_bmkg_apt_pranoto.glb");
useGLTF.preload("/pertamina_apt_pranoto.glb");
useGLTF.preload("/fire_station_apt_pranoto.glb");
