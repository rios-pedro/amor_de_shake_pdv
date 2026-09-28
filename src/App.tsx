import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { POS } from './pages/POS';
import { ProductsAdmin } from './pages/ProductsAdmin';
import { ActiveOrders } from './pages/ActiveOrders';
import { Dashboard } from './pages/Dashboard'; // Importe o Dashboard

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/pos" replace />} />
        <Route path="/pos" element={<POS />} />
        <Route path="/admin/products" element={<ProductsAdmin />} />
        <Route path="/orders" element={<ActiveOrders />} />
        {/* Nova Rota do Dashboard */}
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}

export default App;