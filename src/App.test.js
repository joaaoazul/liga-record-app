import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock(
  'react-router-dom',
  () => ({
    BrowserRouter: ({ children }) => <div data-testid="router">{children}</div>,
  }),
  { virtual: true }
);

jest.mock('./hooks/useAuth', () => ({
  AuthProvider: ({ children }) => <div data-testid="auth-provider">{children}</div>,
  useAuth: () => ({ user: { uid: 'test-user' }, loading: false }),
}));

jest.mock('./components/auth/ProtectedRoute', () => ({ children }) => (
  <div data-testid="protected-route">{children}</div>
));

jest.mock('./components/dashboard/ResponsiveDashboard', () => () => (
  <div>Dashboard overview</div>
));

jest.mock('./components/dashboard/Dashboard', () => () => <div>Dashboard overview</div>);

jest.mock('./services/firebase', () => ({
  authService: {
    onAuthStateChanged: jest.fn(() => () => {}),
    signIn: jest.fn(async () => ({ success: true, user: { uid: 'test-user' } })),
    signUp: jest.fn(async () => ({ success: true, user: { uid: 'test-user' } })),
    signOut: jest.fn(async () => ({ success: true })),
  },
}));

test('renders the dashboard when user is authenticated', () => {
  render(<App />);
  expect(screen.getByText(/dashboard overview/i)).toBeInTheDocument();
});
