import React, { useState } from 'react';
import Layout from '../components/Layout/Layout';
import { usePageTitle } from '../hooks/usePageTitle';

const Contact = () => {
  usePageTitle('LUGX Gaming - Contact Us Page');

  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    // Handle form submission logic here
  };

  return (
    <Layout>
      {/* Page Heading */}
      <div className="page-heading header-text">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <h3>Contact Us</h3>
              <span className="breadcrumb">
                <a href="#">Home</a> &gt; Contact Us
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="contact-page section">
        <div className="container">
          <div className="row">
            <div className="col-lg-6 align-self-center">
              <div className="left-text">
                <div className="section-heading">
                  <h6>Contact Us</h6>
                  <h2>Say Hello!</h2>
                </div>
                <p>
                  LUGX Gaming Template is based on the latest Bootstrap 5 CSS framework. This template is provided by TemplateMo and it is suitable for your gaming shop ecommerce websites. Feel free to use this for any purpose. Thank you.
                </p>
                <ul>
                  <li><span>Address</span> Sunny Isles Beach, FL 33160, United States</li>
                  <li><span>Phone</span> +123 456 7890</li>
                  <li><span>Email</span> lugx@contact.com</li>
                </ul>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="right-content">
                <div className="row">
                  <div className="col-lg-12">
                    <div id="map">
                      <iframe 
                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d12469.776493332698!2d-80.14036379941481!3d25.907788681148624!2m3!1f357.26927939317244!2f20.870722720054623!3f0!3m2!1i1024!2i768!4f35!3m3!1m2!1s0x88d9add4b4ac788f%3A0xe77469d09480fcdb!2sSunny%20Isles%20Beach!5e1!3m2!1sen!2sth!4v1642869952544!5m2!1sen!2sth" 
                        width="100%" 
                        height="325px" 
                        style={{border: 0, borderRadius: '23px'}} 
                        allowFullScreen="" 
                        loading="lazy" 
                        referrerPolicy="no-referrer-when-downgrade"
                      ></iframe>
                    </div>
                  </div>
                  <div className="col-lg-12">
                    <form id="contact-form" onSubmit={handleSubmit}>
                      <div className="row">
                        <div className="col-lg-6">
                          <fieldset>
                            <input 
                              type="text" 
                              name="name" 
                              placeholder="Your Name..." 
                              value={formData.name}
                              onChange={handleChange}
                              required 
                            />
                          </fieldset>
                        </div>
                        <div className="col-lg-6">
                          <fieldset>
                            <input 
                              type="text" 
                              name="surname" 
                              placeholder="Your Surname..." 
                              value={formData.surname}
                              onChange={handleChange}
                              required 
                            />
                          </fieldset>
                        </div>
                        <div className="col-lg-6">
                          <fieldset>
                            <input 
                              type="email" 
                              name="email" 
                              placeholder="Your E-mail..." 
                              value={formData.email}
                              onChange={handleChange}
                              required 
                            />
                          </fieldset>
                        </div>
                        <div className="col-lg-6">
                          <fieldset>
                            <input 
                              type="text" 
                              name="subject" 
                              placeholder="Subject..." 
                              value={formData.subject}
                              onChange={handleChange}
                              required 
                            />
                          </fieldset>
                        </div>
                        <div className="col-lg-12">
                          <fieldset>
                            <textarea 
                              name="message" 
                              placeholder="Your Message" 
                              value={formData.message}
                              onChange={handleChange}
                              required
                            ></textarea>
                          </fieldset>
                        </div>
                        <div className="col-lg-12">
                          <fieldset>
                            <button type="submit" className="orange-button">
                              Send Message Now
                            </button>
                          </fieldset>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Contact; 