import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Router, Route, Switch } from 'wouter';
import { queryClient } from './lib/query-client';
import { useEffect } from 'react';
import { initializePushNotifications } from './utils/firebase';
import { initDeepLink } from './utils/deeplink';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { RecommendationsPage } from './pages/RecommendationsPage';
import { EventsPage } from './pages/EventsPage';
import { MyPage } from './pages/MyPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ReferralHub } from './pages/ReferralHub';
import { BusinessModal } from './components/BusinessModal';
import { QRModal } from './components/QRModal';
import { Toaster } from './components/ui/toaster';
import './globals.css';

function App() {
  useEffect(() => {
    // 푸시 알림 초기화
    initializePushNotifications().then((success) => {
      if (success) {
        console.log('Push notifications initialized successfully');
      } else {
        console.log('Failed to initialize push notifications');
      }
    });

    // 딥링크 초기화 (navigate 함수는 wouter의 useLocation 훅에서 가져와야 하지만, 여기서는 임시로 처리)
    // 실제로는 각 페이지에서 개별적으로 처리하는 것이 더 좋습니다.
  }, []);

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
                  <Route path="/referrals">
                    <ReferralHub />
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