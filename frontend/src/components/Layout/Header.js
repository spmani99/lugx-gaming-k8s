import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <header className="header-area header-sticky">
      <div className="container">
        <div className="row">
          <div className="col-12">
            <nav className="main-nav">
              {/* Logo */}
              <Link to="/" className="logo">
                <img src="assets/images/logo.png" alt="" style={{width: '158px'}} />
              </Link>
              
              {/* Navigation Menu */}
              <ul className="nav">
                <li><Link to="/" className={isActive('/')}>Home</Link></li>
                <li><Link to="/shop" className={isActive('/shop')}>Our Shop</Link></li>
                <li><Link to="/product-details" className={isActive('/product-details')}>Product Details</Link></li>
                <li><Link to="/contact" className={isActive('/contact')}>Contact Us</Link></li>
                <li><a href="#">Sign In</a></li>
              </ul>
              
              {/* Mobile Menu Trigger */}
              <a 
                className='menu-trigger'
                href="#"
                onClick={(e) => { e.preventDefault(); setIsMenuOpen(!isMenuOpen); }}
              >
                <span>Menu</span>
              </a>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 