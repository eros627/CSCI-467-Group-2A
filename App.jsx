import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Catalog from './pages/customer/Catalog';
import Fulfillment from './pages/warehouse/Fulfillment';
import Receiving from './pages/receiving/Receiving';
import Admin from './pages/admin/Admin';
import './App.css';

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Catalog />} />
                <Route path="/warehouse/fulfillment" element={<Fulfillment />} />
                <Route path="/receiving" element={<Receiving />} />
                <Route path="/admin" element={<Admin />} />
            </Routes>
        </BrowserRouter>
    );
}
