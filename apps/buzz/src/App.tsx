import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Router, Route, Switch } from 'wouter';
import { queryClient } from './lib/query-client';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { RecommendationsPage } from './pages/RecommendationsPage';
import { EventsPage } from './pages/EventsPage';
import { MyPage } from './pages/MyPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { BusinessModal } from './components/BusinessModal';
import { QRModal } from './components/QRModal';
import { Toaster } from './components/ui/toaster';
import './globals.css';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-background">
          <Switch>
            {/* Auth pages - no layout */}
            <Route path="/login">
              <LoginPage />
            </Route>
            <Route path="/signup">
              <SignupPage />
            </Route>
            
            {/* Main app pages - with layout */}
            <Route path="/" nest>
              <Layout>
                <Switch>
                  <Route path="/">
                    <HomePage />
                  </Route>
                  <Route path="/recommendations">
                    <RecommendationsPage />
                  </Route>
                  <Route path="/events">
                    <EventsPage />
                  </Route>
                  <Route path="/my">
                    <MyPage />
                  </Route>
                  
                  {/* Catch all - redirect to home */}
                  <Route>
                    <HomePage />
                  </Route>
                </Switch>
              </Layout>
            </Route>
          </Switch>
          
          {/* Global modals */}
          <BusinessModal />
          <QRModal />
          
          {/* Toast notifications */}
          <Toaster />
        </div>
      </Router>
      
      {/* Development tools */}
      {import.meta.env.DEV && <ReactQueryDevtools />}
    </QueryClientProvider>
  );
}

export default App;