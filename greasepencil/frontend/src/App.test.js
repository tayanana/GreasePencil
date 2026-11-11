import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

function json(data, status = 200) {
  return Promise.resolve({
    ok: status < 300,
    status,
    text: async () => JSON.stringify(data),
  });
}

const dashboard = {
  summary: { vehicles: 1, needsWork: 1, dueSoon: 0, onTrack: 0 },
  attention: [
    {
      vehicleId: 'v1',
      vehicleName: 'W203 Kompressor',
      mileageUnit: 'km',
      intervalId: 'i1',
      title: 'Brake fluid',
      partNumber: 'MB 331.0',
      state: 'overdue',
      distanceRemaining: null,
      daysRemaining: -61,
      dueOn: '2026-09-10',
    },
  ],
  vehicles: [
    {
      id: 'v1',
      nickname: 'W203 Kompressor',
      year: 2005,
      make: 'Mercedes-Benz',
      model: 'C 200 Kompressor',
      chassisCode: 'W203',
      engineCode: 'M271.940',
      mileage: 186420,
      mileageUnit: 'km',
      attention: { state: 'overdue', title: 'Brake fluid', intervalId: 'i1' },
    },
  ],
  recentLogs: [],
};

beforeEach(() => {
  global.fetch = jest.fn(async (url) => {
    const path = String(url);
    if (path === '/api/me') {
      return json({ name: 'Dev Viewer', kind: 'person', simulated: true, stage: 'production' });
    }
    if (path === '/api/dashboard') return json(dashboard);
    if (path.startsWith('/api/parts')) return json({ parts: [] });
    if (path === '/api/vehicles') return json({ vehicles: [] });
    return json({ error: `unexpected ${path}` }, 500);
  });
});

describe('App', () => {
  it('shows an overdue job on the board and routes to an empty catalogue', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'What needs a wrench' })).toBeInTheDocument();
    expect(screen.getByText('Brake fluid')).toBeInTheDocument();
    expect(screen.getAllByText('Overdue').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('link', { name: 'Parts' }));

    expect(await screen.findByRole('heading', { name: 'Part numbers' })).toBeInTheDocument();
    expect(screen.getByText(/catalogue is empty/i)).toBeInTheDocument();
  });
});
