import React from 'react';
import Header from './Header';
import Footer from './Footer';
import Preloader from './Preloader';

const Layout = ({ children }) => {
  return (
    <>
      <Preloader />
      <Header />
      <main>
        {children}
      </main>
      <Footer />
    </>
  );
};

export default Layout; 