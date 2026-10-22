import { Clone, useGLTF } from '@react-three/drei';

// Kenney Car Kit의 kart-oopi (CC0, CREDITS.md)
const KART_URL = '/models3d/kart-oopi.glb';
// 원본은 폭 약 0.97 단위라, 기획의 카트 폭(1.6m)에 맞춰 키운다
const KART_SCALE = 1.65;
// 모델의 앞이 게임의 앞(+Z)을 보도록 돌리는 각도
const KART_YAW = 0;

/** 플레이어 카트 모델 */
export function KartModel() {
  const { scene } = useGLTF(KART_URL);
  return <Clone object={scene} scale={KART_SCALE} rotation-y={KART_YAW} />;
}

useGLTF.preload(KART_URL);
