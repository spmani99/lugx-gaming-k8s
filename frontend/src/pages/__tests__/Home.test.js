import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Home from '../Home';

// Mock the Layout component
jest.mock('../../components/Layout/Layout', () => ({ children }) => <div data-testid="layout">{children}</div>);

// Mock the usePageTitle hook
jest.mock('../../hooks/usePageTitle', () => ({
  usePageTitle: jest.fn()
}));

// Mock react-router-dom Link
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Link: ({ children, to }) => <a href={to}>{children}</a>
}));

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('Home Component', () => {
  it('renders main banner with correct content', () => {
    renderWithRouter(<Home />);
    
    expect(screen.getByText('Welcome to lugx')).toBeInTheDocument();
    expect(screen.getByText('BEST GAMING SITE EVER!')).toBeInTheDocument();
    expect(screen.getByText(/LUGX Gaming is free Bootstrap 5 HTML CSS website template/)).toBeInTheDocument();
  });

  it('renders search form with input and button', () => {
    renderWithRouter(<Home />);
    
    const searchInput = screen.getByPlaceholderText('Type Something');
    const searchButton = screen.getByText('Search Now');
    
    expect(searchInput).toBeInTheDocument();
    expect(searchButton).toBeInTheDocument();
    expect(searchButton).toHaveAttribute('type', 'submit');
  });

  it('handles search input changes', () => {
    renderWithRouter(<Home />);
    
    const searchInput = screen.getByPlaceholderText('Type Something');
    
    fireEvent.change(searchInput, { target: { value: 'test search' } });
    
    expect(searchInput.value).toBe('test search');
  });

  it('handles search form submission', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    renderWithRouter(<Home />);
    
    const searchInput = screen.getByPlaceholderText('Type Something');
    const searchForm = screen.getByRole('form');
    
    fireEvent.change(searchInput, { target: { value: 'test search' } });
    fireEvent.submit(searchForm);
    
    expect(consoleSpy).toHaveBeenCalledWith('Search:', 'test search');
    
    consoleSpy.mockRestore();
  });

  it('renders banner image with price and offer', () => {
    renderWithRouter(<Home />);
    
    const bannerImage = screen.getByAltText('');
    expect(bannerImage).toHaveAttribute('src', 'assets/images/banner-image.jpg');
    
    expect(screen.getByText('$22')).toBeInTheDocument();
    expect(screen.getByText('-40%')).toBeInTheDocument();
  });

  it('renders featured games section', () => {
    renderWithRouter(<Home />);
    
    expect(screen.getByText('FEATURED GAMES')).toBeInTheDocument();
    expect(screen.getByText('We Pick The Best Games For You')).toBeInTheDocument();
  });

  it('renders trending games section', () => {
    renderWithRouter(<Home />);
    
    expect(screen.getByText('TRENDING')).toBeInTheDocument();
    expect(screen.getByText('TRENDING GAMES')).toBeInTheDocument();
  });

  it('renders newsletter subscription form', () => {
    renderWithRouter(<Home />);
    
    const emailInput = screen.getByPlaceholderText('Your Email...');
    const subscribeButton = screen.getByText('Subscribe Now');
    
    expect(emailInput).toBeInTheDocument();
    expect(subscribeButton).toBeInTheDocument();
  });

  it('handles newsletter subscription', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    renderWithRouter(<Home />);
    
    const emailInput = screen.getByPlaceholderText('Your Email...');
    const subscribeForm = emailInput.closest('form');
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.submit(subscribeForm);
    
    expect(consoleSpy).toHaveBeenCalledWith('Subscribe:', 'test@example.com');
    
    consoleSpy.mockRestore();
  });

  it('renders categories section', () => {
    renderWithRouter(<Home />);
    
    expect(screen.getByText('CATEGORIES')).toBeInTheDocument();
    expect(screen.getByText('Top Categories')).toBeInTheDocument();
  });

  it('renders call-to-action section', () => {
    renderWithRouter(<Home />);
    
    expect(screen.getByText('Are You Ready To Order Your Favorite Game?')).toBeInTheDocument();
  });

  it('renders explore button', () => {
    renderWithRouter(<Home />);
    
    const exploreButton = screen.getByText('Explore Our Shop');
    expect(exploreButton).toBeInTheDocument();
    expect(exploreButton).toHaveAttribute('href', '/shop');
  });

  it('sets page title correctly', () => {
    const { usePageTitle } = require('../../hooks/usePageTitle');
    
    renderWithRouter(<Home />);
    
    expect(usePageTitle).toHaveBeenCalledWith('LUGX Gaming - Home Page');
  });

  it('renders within Layout component', () => {
    renderWithRouter(<Home />);
    
    const layout = screen.getByTestId('layout');
    expect(layout).toBeInTheDocument();
  });

  it('contains gaming-related imagery and content', () => {
    renderWithRouter(<Home />);
    
    // Check for gaming-related images
    const images = screen.getAllByRole('img');
    expect(images.length).toBeGreaterThan(0);
    
    // Check for gaming-related text content
    expect(screen.getByText(/gaming/i)).toBeInTheDocument();
  });

  it('has proper form validation behavior', () => {
    renderWithRouter(<Home />);
    
    const searchInput = screen.getByPlaceholderText('Type Something');
    const emailInput = screen.getByPlaceholderText('Your Email...');
    
    // Both inputs should be required for good UX
    expect(searchInput).toHaveAttribute('type', 'text');
    expect(emailInput).toHaveAttribute('type', 'email');
  });
});
