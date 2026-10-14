import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { POS } from './pages/POS';
import { ProductsAdmin } from './pages/ProductsAdmin';
import { ProductAddonsAdmin } from './pages/ProductAddonsAdmin';
import { ProductFlavorsAdmin } from './pages/ProductFlavorsAdmin';
import { ActiveOrders } from './pages/ActiveOrders';
import { Dashboard } from './pages/Dashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/pos" replace />} />
        <Route path="/pos" element={<POS />} />
        <Route path="/admin/products" element={<ProductsAdmin />} />
        <Route path="/admin/product-addons" element={<ProductAddonsAdmin />} />
        <Route path="/admin/product-flavors" element={<ProductFlavorsAdmin />} />
        <Route path="/orders" element={<ActiveOrders />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}

export default App;