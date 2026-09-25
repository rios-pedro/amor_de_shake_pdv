import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { POS } from './pages/POS';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/pos" replace />} />
        <Route path="/pos" element={<POS />} />
        {/* Futuras rotas vão aqui */}
      </Routes>
    </Router>
  );
}

export default App;