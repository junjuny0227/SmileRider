import { Canvas, useFrame } from '@react-three/fiber';
import { NO_INPUT, type ControlInput, type TrackSurface } from '@winkrider/kart';
import type { Track } from '@winkrider/track';
import { useRef, type RefObject } from 'react';
import { Quaternion, Vector3, type Group } from 'three';

import { Hud } from '../hud/Hud';
import { createRaceSession, tickRaceSession, type InputMode, type RaceSession } from '../race/session';
import { ChaseCamera } from '../scene/ChaseCamera';
import { GameScene } from '../scene/GameScene';
import { Kart } from '../scene/Kart';
import { advanceFixedStep } from '../sim/fixed-step';

export interface RaceScreenProps {
  mode: InputMode;
  track: Track;
  surface: TrackSurface;
  /** 주행 로직 한 틱마다 한 번 부른다 */
  readInput: () => ControlInput;
  isFaceVisible: () => boolean;
  onFinish: (session: RaceSession) => void;
}

const WORLD_UP = new Vector3(0, 1, 0);

interface SimulationProps extends Omit<RaceScreenProps, 'mode'> {
  session: RefObject<RaceSession>;
  input: RefObject<ControlInput>;
  kart: RefObject<Group | null>;
}

/** Canvas 안에서 프레임마다 고정 간격 틱을 돌리고, 카트 mesh를 ref로 직접 움직인다 (React 상태를 거치지 않음) */
function Simulation({ session, input, kart, track, surface, readInput, isFaceVisible, onFinish }: SimulationProps) {
  const accumulator = useRef(0);
  const reported = useRef(false);
  const tmp = useRef({ up: new Vector3(), tilt: new Quaternion(), yaw: new Quaternion() });

  useFrame((_, delta) => {
    const step = advanceFixedStep(accumulator.current, delta);
    accumulator.current = step.accumulator;
    let s = session.current;
    for (let i = 0; i < step.ticks; i++) {
      const next = readInput();
      input.current = next;
      s = tickRaceSession(s, next, isFaceVisible(), track, surface);
    }
    session.current = s;

    const group = kart.current;
    if (group) {
      const { prevKart: a, kart: b } = s;
      const t = step.alpha;
      group.position.set(
        a.position.x + (b.position.x - a.position.x) * t,
        a.position.y + (b.position.y - a.position.y) * t,
        a.position.z + (b.position.z - a.position.z) * t,
      );
      const turn = Math.atan2(Math.sin(b.heading - a.heading), Math.cos(b.heading - a.heading));
      const { up, tilt, yaw } = tmp.current;
      up.set(b.up.x, b.up.y, b.up.z);
      tilt.setFromUnitVectors(WORLD_UP, up);
      yaw.setFromAxisAngle(WORLD_UP, a.heading + turn * t);
      group.quaternion.copy(tilt).multiply(yaw);
    }

    if (s.phase === 'finished' && !reported.current) {
      reported.current = true;
      onFinish(s);
    }
  });

  return null;
}

/** 레이스 한 판. 3D 장면과 HUD를 띄운다 */
export function RaceScreen({ track, surface, readInput, isFaceVisible, onFinish }: RaceScreenProps) {
  const session = useRef<RaceSession>(createRaceSession(track, surface));
  const input = useRef<ControlInput>(NO_INPUT);
  const kart = useRef<Group>(null);

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Canvas camera={{ fov: 70, near: 0.1, far: 1500 }}>
        <GameScene track={track}>
          <Kart ref={kart} />
          <ChaseCamera target={kart} />
          <Simulation
            track={track}
            surface={surface}
            readInput={readInput}
            isFaceVisible={isFaceVisible}
            onFinish={onFinish}
            session={session}
            input={input}
            kart={kart}
          />
        </GameScene>
      </Canvas>
      <Hud session={session} input={input} laps={track.definition.laps} />
    </div>
  );
}
