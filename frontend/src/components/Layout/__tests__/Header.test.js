import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Header from '../Header';

// Mock react-router-dom
const mockLocation = { pathname: '/' };
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: () => mockLocation,
  Link: ({ children, to, className }) => (
    <a href={to} className={className}>{children}</a>
  )
}));

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('Header Component', () => {
  beforeEach(() => {
    mockLocation.pathname = '/';
  });

  it('renders header with logo and navigation', () => {
    renderWithRouter(<Header />);
    
    // Check logo is present
    const logo = screen.getByAltText('');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('src', 'assets/images/logo.png');
    
    // Check navigation links
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Our Shop')).toBeInTheDocument();
    expect(screen.getByText('Product Details')).toBeInTheDocument();
    expect(screen.getByText('Contact Us')).toBeInTheDocument();
    expect(screen.getByText('Sign In')).toBeInTheDocument();
  });

  it('highlights active navigation link', () => {
    renderWithRouter(<Header />);
    
    const homeLink = screen.getByText('Home');
    expect(homeLink).toHaveClass('active');
  });

  it('highlights shop link when on shop page', () => {
    mockLocation.pathname = '/shop';
    renderWithRouter(<Header />);
    
    const shopLink = screen.getByText('Our Shop');
    expect(shopLink).toHaveClass('active');
    
    const homeLink = screen.getByText('Home');
    expect(homeLink).not.toHaveClass('active');
  });

  it('highlights contact link when on contact page', () => {
    mockLocation.pathname = '/contact';
    renderWithRouter(<Header />);
    
    const contactLink = screen.getByText('Contact Us');
    expect(contactLink).toHaveClass('active');
  });

  it('has correct navigation links with proper hrefs', () => {
    renderWithRouter(<Header />);
    
    expect(screen.getByText('Home')).toHaveAttribute('href', '/');
    expect(screen.getByText('Our Shop')).toHaveAttribute('href', '/shop');
    expect(screen.getByText('Product Details')).toHaveAttribute('href', '/product-details');
    expect(screen.getByText('Contact Us')).toHaveAttribute('href', '/contact');
  });

  it('renders mobile menu toggle button', () => {
    renderWithRouter(<Header />);
    
    const menuToggle = screen.getByRole('button');
    expect(menuToggle).toBeInTheDocument();
  });

  it('toggles mobile menu when menu button is clicked', () => {
    renderWithRouter(<Header />);
    
    const menuToggle = screen.getByRole('button');
    const navMenu = screen.getByRole('list');
    
    // Initially menu should not have 'active' class
    expect(navMenu).not.toHaveClass('active');
    
    // Click menu toggle
    fireEvent.click(menuToggle);
    
    // Menu should now have 'active' class
    expect(navMenu).toHaveClass('active');
    
    // Click again to close
    fireEvent.click(menuToggle);
    
    // Menu should not have 'active' class anymore
    expect(navMenu).not.toHaveClass('active');
  });

  it('applies correct CSS classes to header structure', () => {
    renderWithRouter(<Header />);
    
    const header = screen.getByRole('banner');
    expect(header).toHaveClass('header-area', 'header-sticky');
    
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass('main-nav');
  });

  it('renders logo as a link to home page', () => {
    renderWithRouter(<Header />);
    
    const logoLink = screen.getByRole('link', { name: '' });
    expect(logoLink).toHaveAttribute('href', '/');
    expect(logoLink).toHaveClass('logo');
  });
});
