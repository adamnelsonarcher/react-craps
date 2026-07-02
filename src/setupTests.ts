// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// CRA (react-scripts@5) + Jest can have trouble parsing some ESM-only dependencies
// (notably `framer-motion` and its transitive deps). For unit tests we don't need
// real animations, so we provide a lightweight mock.
jest.mock('framer-motion', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');

  const motion = new Proxy(
    {},
    {
      get: (_target, key: string) => {
        // e.g. motion.div -> <div {...props} />
        return React.forwardRef((props: any, ref: any) =>
          React.createElement(key, { ...props, ref })
        );
      }
    }
  );

  // Keep this file as plain `.ts` (not `.tsx`) by avoiding JSX fragments.
  const AnimatePresence = ({ children }: any) => children;

  const createMotionValue = (initial: any) => {
    let current = initial;
    return {
      get: () => current,
      set: (v: any) => {
        current = v;
      },
      onChange: () => () => {}
    };
  };

  return {
    __esModule: true,
    motion,
    AnimatePresence,
    useAnimation: () => ({ start: jest.fn(), stop: jest.fn(), set: jest.fn() }),
    useMotionValue: (initial: any) => createMotionValue(initial),
    useTransform: (motionValue: any, transformer: (latest: any) => any) => {
      try {
        return transformer(motionValue?.get ? motionValue.get() : motionValue);
      } catch {
        return transformer(motionValue);
      }
    },
    animate: (motionValue: any, to: any) => {
      if (motionValue?.set) motionValue.set(to);
      return { stop: () => {} };
    }
  };
});
