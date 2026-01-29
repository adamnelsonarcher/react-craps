import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders a roll button', () => {
  render(<App />);
  expect(screen.getAllByRole('button', { name: /roll dice/i }).length).toBeGreaterThan(0);
});
