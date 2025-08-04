import { render, screen } from '@testing-library/react';
import App from './App';

test('renders gaming site content', () => {
  render(<App />);
  const gamingElement = screen.getByText(/BEST GAMING SITE EVER!/i);
  expect(gamingElement).toBeInTheDocument();
});
