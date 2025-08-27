import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { GamificationPanel } from '../components/GamificationPanel';
import { PerformanceDashboard } from '../components/PerformanceDashboard';
import { TemplateStudio } from '../components/TemplateStudio';
import { Leaderboard } from '../components/Leaderboard';

const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.lg};
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  padding: ${({ theme }) => theme.spacing.lg};
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.primary}, ${({ theme }) => theme.colors.secondary});
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  color: white;
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['3xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  margin: 0;
`;

const Subtitle = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  opacity: 0.9;
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

const TabNav = styled.nav`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  border-bottom: 2px solid ${({ theme }) => theme.colors.border};
  padding-bottom: ${({ theme }) => theme.spacing.sm};
`;

const TabButton = styled.button<{ active: boolean }>`
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.lg}`};
  background-color: ${({ active, theme }) => active ? theme.colors.primary : 'transparent'};
  color: ${({ active, theme }) => active ? 'white' : theme.colors.text};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-weight: ${({ active, theme }) => active ? theme.fontWeights.semibold : theme.fontWeights.normal};
  transition: all 0.3s ease;
  border: 2px solid ${({ active, theme }) => active ? theme.colors.primary : 'transparent'};

  &:hover {
    background-color: ${({ active, theme }) => !active && theme.colors.surface};
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const ContentArea = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing.xl};
`;

const QuickStats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const StatCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  padding: ${({ theme }) => theme.spacing.lg};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  transition: transform 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadows.md};
  }
`;

const StatLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const StatValue = styled.div`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.primary};
`;

const StatChange = styled.span<{ positive: boolean }>`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ positive, theme }) => positive ? theme.colors.success : theme.colors.error};
  margin-left: ${({ theme }) => theme.spacing.sm};
`;

const FloatingActionButton = styled.button`
  position: fixed;
  bottom: ${({ theme }) => theme.spacing.xl};
  right: ${({ theme }) => theme.spacing.xl};
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.primary}, ${({ theme }) => theme.colors.secondary});
  color: white;
  font-size: 24px;
  box-shadow: ${({ theme }) => theme.shadows.lg};
  transition: transform 0.2s ease;
  z-index: 1000;

  &:hover {
    transform: scale(1.1);
  }
`;

type TabType = 'dashboard' | 'templates' | 'campaigns' | 'leaderboard';

interface Stats {
  totalReferrals: number;
  totalRevenue: number;
  conversionRate: number;
  activeTemplates: number;
  weeklyGrowth: number;
  monthlyGrowth: number;
}

export function ReferralHub() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [stats, setStats] = useState<Stats>({
    totalReferrals: 0,
    totalRevenue: 0,
    conversionRate: 0,
    activeTemplates: 0,
    weeklyGrowth: 0,
    monthlyGrowth: 0
  });
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Check if first time user
    const hasSeenOnboarding = localStorage.getItem('referralHubOnboarding');
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
      localStorage.setItem('referralHubOnboarding', 'true');
    }

    // Fetch user stats
    fetchUserStats();
  }, []);

  const fetchUserStats = async () => {
    try {
      const response = await fetch('/api/referrals/stats', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats({
          totalReferrals: data.data.totalReferrals || 0,
          totalRevenue: data.data.totalRevenue || 0,
          conversionRate: data.data.conversionRate || 0,
          activeTemplates: data.data.activeTemplates || 0,
          weeklyGrowth: data.data.weeklyGrowth || 0,
          monthlyGrowth: data.data.monthlyGrowth || 0
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleCreateCampaign = () => {
    navigate('/referrals/campaign/new');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <>
            <QuickStats>
              <StatCard>
                <StatLabel>총 추천 수</StatLabel>
                <StatValue>
                  {stats.totalReferrals}명
                  <StatChange positive={stats.weeklyGrowth > 0}>
                    {stats.weeklyGrowth > 0 ? '↑' : '↓'} {Math.abs(stats.weeklyGrowth)}%
                  </StatChange>
                </StatValue>
              </StatCard>
              <StatCard>
                <StatLabel>총 수익</StatLabel>
                <StatValue>
                  {formatCurrency(stats.totalRevenue)}
                  <StatChange positive={stats.monthlyGrowth > 0}>
                    {stats.monthlyGrowth > 0 ? '↑' : '↓'} {Math.abs(stats.monthlyGrowth)}%
                  </StatChange>
                </StatValue>
              </StatCard>
              <StatCard>
                <StatLabel>전환율</StatLabel>
                <StatValue>{stats.conversionRate.toFixed(1)}%</StatValue>
              </StatCard>
              <StatCard>
                <StatLabel>활성 템플릿</StatLabel>
                <StatValue>{stats.activeTemplates}개</StatValue>
              </StatCard>
            </QuickStats>
            <GamificationPanel />
            <PerformanceDashboard />
          </>
        );

      case 'templates':
        return <TemplateStudio />;

      case 'campaigns':
        return (
          <div>
            <h2>캠페인 관리</h2>
            {/* Campaign management component will be added here */}
          </div>
        );

      case 'leaderboard':
        return <Leaderboard />;

      default:
        return null;
    }
  };

  return (
    <Container>
      <Header>
        <div>
          <Title>🚀 마케터 허브</Title>
          <Subtitle>나만의 바이럴 마케팅을 시작하세요</Subtitle>
        </div>
      </Header>

      <TabNav>
        <TabButton 
          active={activeTab === 'dashboard'}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 대시보드
        </TabButton>
        <TabButton 
          active={activeTab === 'templates'}
          onClick={() => setActiveTab('templates')}
        >
          📝 템플릿 스튜디오
        </TabButton>
        <TabButton 
          active={activeTab === 'campaigns'}
          onClick={() => setActiveTab('campaigns')}
        >
          🎯 캠페인 관리
        </TabButton>
        <TabButton 
          active={activeTab === 'leaderboard'}
          onClick={() => setActiveTab('leaderboard')}
        >
          🏆 리더보드
        </TabButton>
      </TabNav>

      <ContentArea>
        {renderContent()}
      </ContentArea>

      <FloatingActionButton onClick={handleCreateCampaign}>
        ➕
      </FloatingActionButton>
    </Container>
  );
}