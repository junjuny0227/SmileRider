import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type RefObject } from 'react';
import { Object3D, type InstancedMesh } from 'three';

import type { RaceSession } from '../race/session';

// 입자 수 상한, 수명(s), 바퀴 하나에서 초당 내뿜는 입자 수
const CAPACITY = 60;
const LIFE = 0.6;
const RATE = 30;
// 뒷바퀴 위치: 카트 중심에서 뒤로 1m, 좌우 0.6m, 높이 0.2m
const REAR = 1;
const SIDE = 0.6;
const HEIGHT = 0.2;
// 수명 동안 떠오르는 높이(m)
const RISE = 0.8;

interface Particle {
  x: number;
  y: number;
  z: number;
  age: number;
}

/** 드리프트 중 뒷바퀴에서 나오는 타이어 연기. 커지며 떠오르다 사라진다 */
export function DriftSmoke({ session }: { session: RefObject<RaceSession> }) {
  const mesh = useRef<InstancedMesh>(null);
  const particles = useRef<Particle[]>(Array.from({ length: CAPACITY }, () => ({ x: 0, y: 0, z: 0, age: LIFE })));
  const next = useRef(0);
  const pending = useRef(0);
  const dummy = useMemo(() => new Object3D(), []);

  useFrame((_, delta) => {
    const m = mesh.current;
    if (!m) return;
    const kart = session.current.kart;
    const list = particles.current;

    if (kart.drifting) {
      pending.current += RATE * delta;
      const fx = Math.sin(kart.heading);
      const fz = Math.cos(kart.heading);
      while (pending.current >= 1) {
        pending.current -= 1;
        for (const side of [-1, 1]) {
          const p = list[next.current];
          next.current = (next.current + 1) % CAPACITY;
          p.x = kart.position.x - fx * REAR + fz * SIDE * side;
          p.y = kart.position.y + HEIGHT;
          p.z = kart.position.z - fz * REAR - fx * SIDE * side;
          p.age = 0;
        }
      }
    } else {
      pending.current = 0;
    }

    list.forEach((p, i) => {
      p.age = Math.min(LIFE, p.age + delta);
      const t = p.age / LIFE;
      // 커지다가 마지막 25% 동안 줄어들어 사라진다
      const scale = (0.4 + t) * Math.min(1, (1 - t) * 4);
      dummy.position.set(p.x, p.y + t * RISE, p.z);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, CAPACITY]} frustumCulled={false}>
      <icosahedronGeometry args={[0.5, 0]} />
      <meshBasicMaterial color="#dddddd" transparent opacity={0.45} depthWrite={false} />
    </instancedMesh>
  );
}
