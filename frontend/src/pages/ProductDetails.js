import React, { useState } from 'react';
import Layout from '../components/Layout/Layout';
import { usePageTitle } from '../hooks/usePageTitle';

const ProductDetails = () => {
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');

  usePageTitle('LUGX Gaming - Product Details Page');
  const handleAddToCart = (e) => {
    e.preventDefault();
    console.log('Add to cart:', quantity);
  };

  return (
    <Layout>
      {/* Page Heading */}
      <div className="page-heading header-text">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <h3>Modern Warfare® II</h3>
              <span className="breadcrumb">
                <a href="#">Home</a> &gt; <a href="#">Shop</a> &gt; Assasin Creed
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Single Product */}
      <div className="single-product section">
        <div className="container">
          <div className="row">
            <div className="col-lg-6">
              <div className="left-image">
                <img src="assets/images/single-game.jpg" alt="" />
              </div>
            </div>
            <div className="col-lg-6 align-self-center">
              <h4>Call of Duty®: Modern Warfare® II</h4>
              <span className="price"><em>$28</em> $22</span>
              <p>LUGX Gaming Template is based on the latest Bootstrap 5 CSS framework. This template is provided by TemplateMo and it is suitable for your gaming shop ecommerce websites. Feel free to use this for any purpose. Thank you.</p>
              <form id="qty" onSubmit={handleAddToCart}>
                <input 
                  type="number" 
                  className="form-control" 
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  min="1"
                  placeholder="1" 
                />
                <button type="submit">
                  <i className="fa fa-shopping-bag"></i> ADD TO CART
                </button>
              </form>
              <ul>
                <li><span>Game ID:</span> COD MMII</li>
                <li><span>Genre:</span> <a href="#">Action</a>, <a href="#">Team</a>, <a href="#">Single</a></li>
                <li><span>Multi-tags:</span> <a href="#">War</a>, <a href="#">Battle</a>, <a href="#">Royal</a></li>
              </ul>
            </div>
            <div className="col-lg-12">
              <div className="sep"></div>
            </div>
          </div>
        </div>
      </div>

      {/* More Info */}
      <div className="more-info">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <div className="tabs-content">
                <div className="row">
                  <div className="nav-wrapper">
                    <ul className="nav nav-tabs" role="tablist">
                      <li className="nav-item" role="presentation">
                        <button 
                          className={`nav-link ${activeTab === 'description' ? 'active' : ''}`}
                          onClick={() => setActiveTab('description')}
                          type="button" 
                          role="tab"
                        >
                          Description
                        </button>
                      </li>
                      <li className="nav-item" role="presentation">
                        <button 
                          className={`nav-link ${activeTab === 'reviews' ? 'active' : ''}`}
                          onClick={() => setActiveTab('reviews')}
                          type="button" 
                          role="tab"
                        >
                          Reviews (3)
                        </button>
                      </li>
                    </ul>
                  </div>              
                  <div className="tab-content">
                    <div 
                      className={`tab-pane fade ${activeTab === 'description' ? 'show active' : ''}`}
                      role="tabpanel"
                    >
                      <p>You can search for more templates on Google Search using keywords such as "templatemo digital marketing", "templatemo one-page", "templatemo gallery", etc. Please tell your friends about our website. If you need a variety of HTML templates, you may visit Tooplate and Too CSS websites.</p>
                      <br />
                      <p>Coloring book air plant shabby chic, crucifix normcore raclette cred swag artisan activated charcoal. PBR&B fanny pack pok pok gentrify truffaut kitsch helvetica jean shorts edison bulb poutine next level humblebrag la croix adaptogen. Hashtag poke literally locavore, beard marfa kogi bruh artisan succulents seitan tonx waistcoat chambray taxidermy. Same cred meggings 3 wolf moon lomo irony cray hell of bitters asymmetrical gluten-free art party raw denim chillwave tousled try-hard succulents street art.</p>
                    </div>
                    <div 
                      className={`tab-pane fade ${activeTab === 'reviews' ? 'show active' : ''}`}
                      role="tabpanel"
                    >
                      <p>Coloring book air plant shabby chic, crucifix normcore raclette cred swag artisan activated charcoal. PBR&B fanny pack pok pok gentrify truffaut kitsch helvetica jean shorts edison bulb poutine next level humblebrag la croix adaptogen. <br /><br />Hashtag poke literally locavore, beard marfa kogi bruh artisan succulents seitan tonx waistcoat chambray taxidermy. Same cred meggings 3 wolf moon lomo irony cray hell of bitters asymmetrical gluten-free art party raw denim chillwave tousled try-hard succulents street art.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related Games */}
      <div className="section categories related-games">
        <div className="container">
          <div className="row">
            <div className="col-lg-6">
              <div className="section-heading">
                <h6>Action</h6>
                <h2>Related Games</h2>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="main-button">
                <a href="shop.html">View All</a>
              </div>
            </div>
            <div className="col-lg col-sm-6 col-xs-12">
              <div className="item">
                <h4>Action</h4>
                <div className="thumb">
                  <a href="product-details.html"><img src="assets/images/categories-01.jpg" alt="" /></a>
                </div>
              </div>
            </div>
            <div className="col-lg col-sm-6 col-xs-12">
              <div className="item">
                <h4>Action</h4>
                <div className="thumb">
                  <a href="product-details.html"><img src="assets/images/categories-05.jpg" alt="" /></a>
                </div>
              </div>
            </div>
            <div className="col-lg col-sm-6 col-xs-12">
              <div className="item">
                <h4>Action</h4>
                <div className="thumb">
                  <a href="product-details.html"><img src="assets/images/categories-03.jpg" alt="" /></a>
                </div>
              </div>
            </div>
            <div className="col-lg col-sm-6 col-xs-12">
              <div className="item">
                <h4>Action</h4>
                <div className="thumb">
                  <a href="product-details.html"><img src="assets/images/categories-04.jpg" alt="" /></a>
                </div>
              </div>
            </div>
            <div className="col-lg col-sm-6 col-xs-12">
              <div className="item">
                <h4>Action</h4>
                <div className="thumb">
                  <a href="product-details.html"><img src="assets/images/categories-05.jpg" alt="" /></a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ProductDetails; 