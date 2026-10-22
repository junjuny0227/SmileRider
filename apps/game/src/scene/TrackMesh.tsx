import { Line } from '@react-three/drei';
import type { Track } from '@smilerider/track';
import { useEffect, useMemo } from 'react';
import { BufferAttribute, BufferGeometry } from 'three';

import { buildRailPositions, buildRoadGeometry } from './track-geometry';

const RAIL_HEIGHT = 0.8;

// 닫힌 선이 되도록 첫 점을 끝에 한 번 더 붙인다
function toClosedPoints(positions: Float32Array): [number, number, number][] {
  const points: [number, number, number][] = [];
  for (let i = 0; i < positions.length; i += 3) points.push([positions[i], positions[i + 1], positions[i + 2]]);
  points.push(points[0]);
  return points;
}

/** 중심선 데이터로 만든 도로와 양쪽 가드레일 */
export function TrackMesh({ track }: { track: Track }) {
  const geometry = useMemo(() => {
    const road = buildRoadGeometry(track);
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(road.positions, 3));
    geo.setAttribute('normal', new BufferAttribute(road.normals, 3));
    geo.setAttribute('uv', new BufferAttribute(road.uvs, 2));
    geo.setIndex(new BufferAttribute(road.indices, 1));
    return geo;
  }, [track]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const rails = useMemo(
    () => ([1, -1] as const).map((side) => toClosedPoints(buildRailPositions(track, side, RAIL_HEIGHT))),
    [track],
  );

  return (
    <group>
      <mesh geometry={geometry}>
        <meshStandardMaterial color="#4b4f58" />
      </mesh>
      {rails.map((points, i) => (
        <Line key={i} points={points} color="#f2f2f2" lineWidth={3} />
      ))}
    </group>
  );
}
