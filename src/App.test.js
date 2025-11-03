import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

const mockNavigate = jest.fn();
const mockUseAuth = jest.fn();

jest.mock('react-router-dom', () => {
  const React = require('react');
  const mockLocation = { pathname: '/', state: {} };

  return {
    BrowserRouter: ({ children }) => <div data-testid="router">{children}</div>,
    Routes: ({ children }) => {
      const routeArray = React.Children.toArray(children);
      const activePath = mockLocation.pathname;

      for (const child of routeArray) {
        const { path = '/', element } = child.props;
        if (path === activePath || (path === '/' && activePath === '/')) {
          return element;
        }
      }

      const fallback = routeArray.find((child) => child.props.path === '*');
      return fallback ? fallback.props.element : null;
    },
    Route: ({ element }) => <>{element}</>,
    Navigate: ({ to }) => <div data-testid="navigate">navigate:{to}</div>,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
  };
}, { virtual: true });

jest.mock('./hooks/useAuth', () => ({
  AuthProvider: ({ children }) => <div data-testid="auth-provider">{children}</div>,
  useAuth: (...args) => mockUseAuth(...args),
}));

jest.mock('./components/auth/LoginForm', () => () => <div>Login Screen</div>);

jest.mock('./components/dashboard/ResponsiveDashboard', () => () => (
  <div>Dashboard overview</div>
));

jest.mock('./services/firebase', () => ({
  authService: {
    onAuthStateChanged: jest.fn(() => () => {}),
    signIn: jest.fn(async () => ({ success: true, user: { uid: 'test-user' } })),
    signUp: jest.fn(async () => ({ success: true, user: { uid: 'test-user' } })),
    signOut: jest.fn(async () => ({ success: true })),
  },
}));

afterEach(() => {
  jest.clearAllMocks();
});

test('renders the dashboard when user is authenticated', () => {
  mockUseAuth.mockReturnValue({ user: { uid: 'test-user' }, loading: false });
  render(<App />);
  expect(screen.getByText(/dashboard overview/i)).toBeInTheDocument();
  expect(mockNavigate).not.toHaveBeenCalled();
});

test('navigates to login when no user is authenticated', () => {
  mockUseAuth.mockReturnValue({ user: null, loading: false });
  render(<App />);
  expect(screen.getByTestId('navigate')).toHaveTextContent('navigate:/login');
});
