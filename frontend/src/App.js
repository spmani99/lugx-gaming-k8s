import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import pages
import Home from './pages/Home';
import Shop from './pages/Shop';
import Contact from './pages/Contact';
import ProductDetails from './pages/ProductDetails';
import Analytics from './pages/Analytics';

// Import analytics
import { useAnalytics } from './hooks/useAnalytics';

// Analytics wrapper component that runs inside Router context
function AnalyticsWrapper({ children }) {
  useAnalytics(); // ✅ Now called inside Router context
  return children;
}

function App() {
  return (
    <Router>
      <AnalyticsWrapper>
        <div className="App">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/product-details" element={<ProductDetails />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/analytics" element={<Analytics />} />
            {/* Redirect any unknown routes to home */}
            <Route path="*" element={<Home />} />
          </Routes>
        </div>
      </AnalyticsWrapper>
    </Router>
  );
}

export default App;
