import { Route, Switch } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';

import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { QRScanPage } from './pages/QRScanPage';
import { SettlementsPage } from './pages/SettlementsPage';
import { StatsPage } from './pages/StatsPage';
import { BusinessPage } from './pages/BusinessPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import './globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 30, // 30 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Layout>
        <Switch>
          <Route path="/login" component={LoginPage} />
          <Route path="/" component={DashboardPage} />
          <Route path="/scan" component={QRScanPage} />
          <Route path="/settlements" component={SettlementsPage} />
          <Route path="/stats" component={StatsPage} />
          <Route path="/business" component={BusinessPage} />
          <Route path="/settings" component={SettingsPage} />
          <Route>404 Page Not Found</Route>
        </Switch>
      </Layout>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;