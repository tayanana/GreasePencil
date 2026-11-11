import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Garage from './pages/Garage';
import Parts from './pages/Parts';
import VehicleDetail from './pages/VehicleDetail';

/**
 * Greasepencil is a single-page app. The shell stays mounted while
 * the board, garage, vehicle, and parts catalogue swap in the outlet.
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="garage" element={<Garage />} />
          <Route path="garage/:vehicleId" element={<VehicleDetail />} />
          <Route path="parts" element={<Parts />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
