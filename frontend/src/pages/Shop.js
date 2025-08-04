import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout/Layout';
import { usePageTitle } from '../hooks/usePageTitle';

const Shop = () => {
  const [activeFilter, setActiveFilter] = useState('*');
  usePageTitle('LUGX Gaming - Shop Page');
  const products = [
    {
      id: 1,
      name: 'Assasin Creed',
      category: 'Action',
      price: 24,
      originalPrice: 36,
      image: 'assets/images/trending-01.jpg',
      filters: ['adv']
    },
    {
      id: 2,
      name: 'Assasin Creed',
      category: 'Action', 
      price: 22,
      originalPrice: 32,
      image: 'assets/images/trending-02.jpg',
      filters: ['str']
    },
    {
      id: 3,
      name: 'Assasin Creed',
      category: 'Action',
      price: 30,
      originalPrice: 45,
      image: 'assets/images/trending-03.jpg',
      filters: ['adv', 'rac']
    },
    {
      id: 4,
      name: 'Assasin Creed',
      category: 'Action',
      price: 22,
      originalPrice: 32,
      image: 'assets/images/trending-04.jpg',
      filters: ['str']
    },
    {
      id: 5,
      name: 'Assasin Creed',
      category: 'Action',
      price: 26,
      originalPrice: 38,
      image: 'assets/images/trending-03.jpg',
      filters: ['rac', 'str']
    },
    {
      id: 6,
      name: 'Assasin Creed',
      category: 'Action',
      price: 20,
      originalPrice: 30,
      image: 'assets/images/trending-01.jpg',
      filters: ['rac', 'adv']
    },
    {
      id: 7,
      name: 'Assasin Creed',
      category: 'Action',
      price: 22,
      originalPrice: 32,
      image: 'assets/images/trending-04.jpg',
      filters: ['rac', 'str']
    },
    {
      id: 8,
      name: 'Assasin Creed',
      category: 'Action',
      price: 22,
      originalPrice: 32,
      image: 'assets/images/trending-02.jpg',
      filters: ['rac', 'adv']
    },
    {
      id: 9,
      name: 'Assasin Creed',
      category: 'Action',
      price: 20,
      originalPrice: 28,
      image: 'assets/images/trending-03.jpg',
      filters: ['adv', 'rac']
    },
    {
      id: 10,
      name: 'Assasin Creed',
      category: 'Action',
      price: 18,
      originalPrice: 26,
      image: 'assets/images/trending-04.jpg',
      filters: ['str']
    },
    {
      id: 11,
      name: 'Assasin Creed',
      category: 'Action',
      price: 24,
      originalPrice: 32,
      image: 'assets/images/trending-01.jpg',
      filters: ['adv']
    },
    {
      id: 12,
      name: 'Assasin Creed',
      category: 'Action',
      price: 30,
      originalPrice: 45,
      image: 'assets/images/trending-02.jpg',
      filters: ['str']
    }
  ];

  const filteredProducts = activeFilter === '*' 
    ? products 
    : products.filter(product => product.filters.includes(activeFilter));

  return (
    <Layout>
      {/* Page Heading */}
      <div className="page-heading header-text">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <h3>Our Shop</h3>
              <span className="breadcrumb">
                <Link to="/">Home</Link> &gt; Our Shop
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Shop Section */}
      <div className="section trending">
        <div className="container">
          {/* Filter Buttons */}
          <ul className="trending-filter">
            <li>
              <a 
                className={activeFilter === '*' ? 'is_active' : ''}
                href="#!"
                onClick={(e) => { e.preventDefault(); setActiveFilter('*'); }}
              >
                Show All
              </a>
            </li>
            <li>
              <a 
                className={activeFilter === 'adv' ? 'is_active' : ''}
                href="#!"
                onClick={(e) => { e.preventDefault(); setActiveFilter('adv'); }}
              >
                Adventure
              </a>
            </li>
            <li>
              <a 
                className={activeFilter === 'str' ? 'is_active' : ''}
                href="#!"
                onClick={(e) => { e.preventDefault(); setActiveFilter('str'); }}
              >
                Strategy
              </a>
            </li>
            <li>
              <a 
                className={activeFilter === 'rac' ? 'is_active' : ''}
                href="#!"
                onClick={(e) => { e.preventDefault(); setActiveFilter('rac'); }}
              >
                Racing
              </a>
            </li>
          </ul>

          {/* Products Grid */}
          <div className="row trending-box">
            {filteredProducts.map(product => (
              <div 
                key={product.id} 
                className={`col-lg-3 col-md-6 align-self-center mb-30 trending-items col-md-6 ${product.filters.join(' ')}`}
              >
                <div className="item">
                  <div className="thumb">
                    <Link to="/product-details">
                      <img src={product.image} alt={product.name} />
                    </Link>
                    <span className="price">
                      <em>${product.originalPrice}</em>${product.price}
                    </span>
                  </div>
                  <div className="down-content">
                    <span className="category">{product.category}</span>
                    <h4>{product.name}</h4>
                    <Link to="/product-details">
                      <i className="fa fa-shopping-bag"></i>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="row">
            <div className="col-lg-12">
              <ul className="pagination">
                <li><a href="#"> &lt; </a></li>
                <li><a href="#">1</a></li>
                <li><a className="is_active" href="#">2</a></li>
                <li><a href="#">3</a></li>
                <li><a href="#"> &gt; </a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Shop; 