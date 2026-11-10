import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';
import { STORAGE_KEYS } from './utils/storage';

/** Make the next random rolls come out as the given dice (die = floor(r * 6) + 1). */
const queueRolls = (...rolls: Array<[number, number]>) => {
  const values = rolls.flat().map(die => (die - 1) / 6 + 0.01);
  jest.spyOn(Math, 'random').mockImplementation(() => values.shift() ?? 0.5);
};

const bankroll = () => Number(window.localStorage.getItem(STORAGE_KEYS.bankroll));
const area = (name: string) => screen.getByRole('button', { name });
const roll = () => fireEvent.click(screen.getAllByRole('button', { name: /roll dice/i })[0]);

beforeEach(() => {
  window.localStorage.clear();
  // Skip the dice animation so rolls resolve synchronously.
  window.localStorage.setItem(STORAGE_KEYS.quickRoll, 'true');
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('renders a roll button', () => {
  render(<App />);
  expect(screen.getAllByRole('button', { name: /roll dice/i }).length).toBeGreaterThan(0);
});

test('pays a pass line bet on a come-out 7', () => {
  render(<App />);
  fireEvent.click(area('Pass Line')); // default chip is $5
  expect(screen.getByText(/Wager: \$5/)).toBeInTheDocument();

  queueRolls([3, 4]);
  roll();

  expect(bankroll()).toBe(1005);
  expect(screen.getByText(/Wager: \$0/)).toBeInTheDocument();
});

test('does not pay a winning bet twice on back-to-back quick rolls', () => {
  render(<App />);
  queueRolls([2, 2], [3, 3], [3, 3]);
  roll(); // point is 4

  fireEvent.click(area('Place Six'));
  roll(); // place 6 wins $5.83 and comes down
  roll(); // nothing left on the 6

  expect(bankroll()).toBe(1005.83);
});

test('place bets are off on the come-out roll', () => {
  render(<App />);
  fireEvent.click(area('Place Eight'));
  queueRolls([3, 4]);
  roll(); // come-out 7: the place bet neither wins nor loses

  expect(bankroll()).toBe(1000);
  expect(screen.getByText(/Wager: \$5/)).toBeInTheDocument();
});

test('refuses line bets once a point is set and explains why', () => {
  render(<App />);
  queueRolls([4, 2]);
  roll(); // point is 6

  fireEvent.click(area('Pass Line'));
  expect(screen.getByText(/only be made on the come-out roll/i)).toBeInTheDocument();
  expect(screen.getByText(/Wager: \$0/)).toBeInTheDocument();
});

describe('settings', () => {
  const openSettings = () => fireEvent.click(screen.getByRole('button', { name: /open settings/i }));
  const startingBalanceInput = () => screen.getByLabelText(/starting balance/i);

  test('reset board clears the table and starts over with the chosen starting balance', () => {
    render(<App />);
    queueRolls([4, 2]);
    roll(); // point is 6
    fireEvent.click(area('Place Eight'));
    expect(screen.getByLabelText(/point is 6/i)).toBeInTheDocument();

    openSettings();
    fireEvent.change(startingBalanceInput(), { target: { value: '500' } });
    fireEvent.click(screen.getByRole('button', { name: /reset board/i }));
    fireEvent.click(screen.getByRole('button', { name: /yes, reset the board/i }));

    expect(bankroll()).toBe(500);
    expect(window.localStorage.getItem(STORAGE_KEYS.startingBank)).toBe('500');
    expect(screen.getByText(/Wager: \$0/)).toBeInTheDocument();
    expect(screen.getByLabelText(/point is off/i)).toBeInTheDocument();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0); // roll history cleared
  });

  test('saving sets the bank and the starting balance used for rebuys', () => {
    render(<App />);
    openSettings();
    fireEvent.change(screen.getByLabelText(/bank balance/i), { target: { value: '0' } });
    fireEvent.change(startingBalanceInput(), { target: { value: '250' } });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    fireEvent.click(screen.getByRole('button', { name: /rebuy \$250/i }));
    expect(bankroll()).toBe(250);
  });

  test('rejects a starting balance below $1', () => {
    render(<App />);
    openSettings();
    fireEvent.change(startingBalanceInput(), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/at least \$1/i);
  });
});

describe('on a phone', () => {
  const setViewport = (width: number, height: number) => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
    Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: height });
  };
  const original = { width: window.innerWidth, height: window.innerHeight };
  afterEach(() => setViewport(original.width, original.height));

  test('plays in landscape with the controls in a side panel', () => {
    setViewport(844, 390);
    render(<App />);
    expect(screen.getByRole('complementary', { name: /betting controls/i })).toBeInTheDocument();

    fireEvent.click(area('Pass Line'));
    queueRolls([5, 6]);
    roll();
    expect(bankroll()).toBe(1005);
  });

  test('asks to rotate when held upright', () => {
    setViewport(390, 844);
    render(<App />);
    expect(screen.getByText(/turn your phone sideways/i)).toBeInTheDocument();
  });
});

test('undo returns the last chip to the bank', () => {
  render(<App />);
  fireEvent.click(area('Field'));
  fireEvent.click(area('Field'));
  expect(screen.getByText(/Wager: \$10/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /undo bet/i }));
  expect(screen.getByText(/Wager: \$5/)).toBeInTheDocument();
});
