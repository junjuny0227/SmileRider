import { useFrame } from '@react-three/fiber';
import { useRef, type RefObject } from 'react';
import { Vector3, type Group } from 'three';

const BEHIND = 8;
const ABOVE = 3;
const LOOK_AHEAD = 4;
const FOLLOW_RATE = 6;

/**
 * 카트 뒤 8m, 위 3m에서 부드럽게 따라가는 추격 카메라.
 * 차 앞 방향이 아니라 진행 방향(heading)을 따라가서, 드리프트 중에는 카트가 옆으로 틀어진 모습이 보인다
 */
export function ChaseCamera({ target, heading }: { target: RefObject<Group | null>; heading: RefObject<number> }) {
  const forward = useRef(new Vector3());
  const desired = useRef(new Vector3());
  const look = useRef(new Vector3());
  const placed = useRef(false);

  useFrame(({ camera }, delta) => {
    const kart = target.current;
    if (!kart) return;
    forward.current.set(Math.sin(heading.current), 0, Math.cos(heading.current));
    desired.current.copy(kart.position).addScaledVector(forward.current, -BEHIND);
    desired.current.y += ABOVE;
    if (placed.current) {
      camera.position.lerp(desired.current, 1 - Math.exp(-delta * FOLLOW_RATE));
    } else {
      camera.position.copy(desired.current);
      placed.current = true;
    }
    look.current.copy(kart.position).addScaledVector(forward.current, LOOK_AHEAD);
    look.current.y += 1;
    camera.lookAt(look.current);
  });

  return null;
}
