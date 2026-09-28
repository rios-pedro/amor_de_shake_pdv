import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { POS } from './pages/POS';
import { ProductsAdmin } from './pages/ProductsAdmin';
import { ProductAddonsAdmin } from './pages/ProductAddonsAdmin'; // Importe a nova tela
import { ActiveOrders } from './pages/ActiveOrders';
import { Dashboard } from './pages/Dashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/pos" replace />} />
        <Route path="/pos" element={<POS />} />
        <Route path="/admin/products" element={<ProductsAdmin />} />
        <Route path="/admin/product-addons" element={<ProductAddonsAdmin />} /> {/* Nova Rota */}
        <Route path="/orders" element={<ActiveOrders />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}

export default App;