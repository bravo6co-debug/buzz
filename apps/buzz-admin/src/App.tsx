import { QueryClientProvider } from '@tanstack/react-query';
import { Router, Route, Switch } from 'wouter';
import { queryClient } from './lib/query-client';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { UsersPage } from './pages/UsersPage';
import { BusinessesPage } from './pages/BusinessesPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { LoginPage } from './pages/LoginPage';
import { PoliciesPage } from './pages/PoliciesPage';
import { ContentsPage } from './pages/ContentsPage';
import './globals.css';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Layout>
          <Switch>
            <Route path="/login" component={LoginPage} />
            <Route path="/" component={DashboardPage} />
            <Route path="/policies" component={PoliciesPage} />
            <Route path="/businesses" component={BusinessesPage} />
            <Route path="/contents" component={ContentsPage} />
            <Route path="/users" component={UsersPage} />
            <Route path="/analytics" component={AnalyticsPage} />
            <Route>
              <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-gray-900">페이지를 찾을 수 없습니다</h2>
                <p className="mt-2 text-gray-600">요청하신 페이지가 존재하지 않습니다.</p>
              </div>
            </Route>
          </Switch>
        </Layout>
      </Router>
    </QueryClientProvider>
  );
}

export default App;