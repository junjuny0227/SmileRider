import { buildTrack, skyway } from '@winkrider/track';

import { placeProps, PROP_CLEARANCE } from './prop-placement';

const track = buildTrack(skyway);

describe('placeProps', () => {
  it('소품은 모든 도로 샘플에서 폭/2 + 6m 이상 떨어져 있다 (트랙 바깥)', () => {
    expect(PROP_CLEARANCE).toBe(6);
    for (const prop of placeProps(track)) {
      for (const sample of track.samples) {
        const d = Math.hypot(prop.position.x - sample.position.x, prop.position.z - sample.position.z);
        expect(d).toBeGreaterThanOrEqual(sample.width / 2 + PROP_CLEARANCE);
      }
    }
  });

  it('땅 위(y = 0)에 놓이고, 같은 트랙이면 항상 같은 배치', () => {
    const a = placeProps(track);
    expect(a.every((p) => p.position.y === 0)).toBe(true);
    expect(placeProps(track)).toEqual(a);
  });

  it('건물, 나무, 가로등이 고루 놓인다', () => {
    const props = placeProps(track);
    expect(props.length).toBeGreaterThan(40);
    const kinds = new Set(props.map((p) => p.kind.split('-')[0]));
    expect(kinds).toEqual(new Set(['building', 'tree', 'street']));
  });
});
