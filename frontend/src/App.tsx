import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import { ToastProvider } from './components/Toast';
import TaxHarvesting from './pages/TaxHarvesting';
import ModelPortfolios from './pages/ModelPortfolios';
import BuyOrders from './pages/BuyOrders';
import PriceManager from './pages/PriceManager';
import Reports from './pages/Reports';

function App() {
  return (
    <ToastProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<TaxHarvesting />} />
            <Route path="/tax-harvesting" element={<TaxHarvesting />} />
            <Route path="/model-portfolios" element={<ModelPortfolios />} />
            <Route path="/buy-orders" element={<BuyOrders />} />
            <Route path="/price-manager" element={<PriceManager />} />
            <Route path="/reports" element={<Reports />} />
          </Routes>
        </Layout>
      </Router>
    </ToastProvider>
  );
}

export default App;
