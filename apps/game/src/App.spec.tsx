import { render } from '@testing-library/react';

import App from './App';

describe('App', () => {
  it('게임 이름을 보여 준다', () => {
    const { getByRole } = render(<App />);
    expect(getByRole('heading', { name: 'WinkRider' })).toBeTruthy();
  });
});
