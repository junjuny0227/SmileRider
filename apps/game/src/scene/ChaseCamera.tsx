import { useFrame } from '@react-three/fiber';
import { useRef, type RefObject } from 'react';
import { Vector3, type Group } from 'three';

const BEHIND = 8;
const ABOVE = 3;
const LOOK_AHEAD = 4;
const FOLLOW_RATE = 6;

/** 카트 뒤 8m, 위 3m에서 부드럽게 따라가는 추격 카메라 */
export function ChaseCamera({ target }: { target: RefObject<Group | null> }) {
  const forward = useRef(new Vector3());
  const desired = useRef(new Vector3());
  const look = useRef(new Vector3());
  const placed = useRef(false);

  useFrame(({ camera }, delta) => {
    const kart = target.current;
    if (!kart) return;
    kart.getWorldDirection(forward.current);
    forward.current.y = 0;
    forward.current.normalize();
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
