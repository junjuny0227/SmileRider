import type { TrackDefinition } from '../types.js';

// 반지름 100m 원 위의 점 8개, 높이 0, 폭 10m
export const circle: TrackDefinition = {
  id: 'circle',
  name: 'circle',
  laps: 2,
  checkpoints: [0.25, 0.5, 0.75],
  controlPoints: Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2;
    return {
      position: { x: Math.sin(a) * 100, y: 0, z: Math.cos(a) * 100 },
      width: 10,
    };
  }),
};

// 8자 모양. 원점에서 두 도로가 수직으로 교차하고, 처음 지날 때는 높이 0, 두 번째는 높이 10
export const figureEight: TrackDefinition = {
  id: 'figure-eight',
  name: 'figure-eight',
  laps: 2,
  checkpoints: [0.25, 0.5, 0.75],
  controlPoints: [
    { position: { x: 0, y: 0, z: 0 }, width: 10 },
    { position: { x: 100, y: 0, z: 100 }, width: 10 },
    { position: { x: 200, y: 0, z: 0 }, width: 10 },
    { position: { x: 100, y: 5, z: -100 }, width: 10 },
    { position: { x: 0, y: 10, z: 0 }, width: 10 },
    { position: { x: -100, y: 10, z: 100 }, width: 10 },
    { position: { x: -200, y: 10, z: 0 }, width: 10 },
    { position: { x: -100, y: 5, z: -100 }, width: 10 },
  ],
};
