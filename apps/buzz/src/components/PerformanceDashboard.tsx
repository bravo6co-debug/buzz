import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const Dashboard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing.xl};
  box-shadow: ${({ theme }) => theme.shadows.sm};
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const Title = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const PeriodSelector = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const PeriodButton = styled.button<{ active: boolean }>`
  padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.md}`};
  background: ${({ active, theme }) => active ? theme.colors.primary : theme.colors.background};
  color: ${({ active, theme }) => active ? 'white' : theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  transition: all 0.2s ease;

  &:hover {
    background: ${({ active, theme }) => !active && theme.colors.background};
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const MetricCard = styled.div<{ trend?: 'up' | 'down' | 'neutral' }>`
  background: ${({ theme }) => theme.colors.background};
  padding: ${({ theme }) => theme.spacing.lg};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border-left: 4px solid ${({ trend, theme }) => {
    if (trend === 'up') return theme.colors.success;
    if (trend === 'down') return theme.colors.error;
    return theme.colors.primary;
  }};
`;

const MetricLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const MetricValue = styled.div`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.text};
`;

const MetricChange = styled.div<{ positive: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ positive, theme }) => positive ? theme.colors.success : theme.colors.error};
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

const ChartContainer = styled.div`
  background: ${({ theme }) => theme.colors.background};
  padding: ${({ theme }) => theme.spacing.lg};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const ChartTitle = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const SimpleChart = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  height: 200px;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const Bar = styled.div<{ height: number; active?: boolean }>`
  flex: 1;
  background: ${({ active, theme }) => active ? theme.colors.primary : theme.colors.border};
  height: ${({ height }) => height}%;
  border-radius: ${({ theme }) => theme.borderRadius.sm} ${({ theme }) => theme.borderRadius.sm} 0 0;
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;

  &:hover {
    background: ${({ theme }) => theme.colors.primary};
    transform: scaleY(1.05);
  }

  &::after {
    content: attr(data-value);
    position: absolute;
    bottom: -25px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 10px;
    color: ${({ theme }) => theme.colors.textSecondary};
  }

  &::before {
    content: attr(data-label);
    position: absolute;
    top: -20px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 12px;
    font-weight: bold;
    opacity: ${({ active }) => active ? 1 : 0};
    transition: opacity 0.3s ease;
  }

  &:hover::before {
    opacity: 1;
  }
`;

const TopPerformers = styled.div`
  background: ${({ theme }) => theme.colors.background};
  padding: ${({ theme }) => theme.spacing.lg};
  border-radius: ${({ theme }) => theme.borderRadius.md};
`;

const PerformerItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.md} 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  &:last-child {
    border-bottom: none;
  }
`;

const PerformerInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
`;

const PlatformIcon = styled.div<{ platform: string }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${({ platform }) => {
    const colors = {
      kakao: '#FEE500',
      naver: '#03C75A',
      instagram: '#E1306C',
      facebook: '#1877F2',
      twitter: '#1DA1F2'
    };
    return colors[platform] || '#ccc';
  }};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
`;

const PerformerName = styled.div`
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
`;

const PerformerStats = styled.div`
  text-align: right;
`;

const PerformerMetric = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.primary};
`;

const PerformerLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

type Period = 'day' | 'week' | 'month';

interface PerformanceData {
  metrics: {
    views: number;
    clicks: number;
    conversions: number;
    revenue: number;
    ctr: number;
    conversionRate: number;
    viewsChange: number;
    clicksChange: number;
    conversionsChange: number;
    revenueChange: number;
  };
  chartData: Array<{
    label: string;
    value: number;
  }>;
  topTemplates: Array<{
    id: number;
    name: string;
    platform: string;
    conversions: number;
    revenue: number;
  }>;
}

export function PerformanceDashboard() {
  const [period, setPeriod] = useState<Period>('week');
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPerformanceData();
  }, [period]);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      
      // Mock data for now - replace with actual API call
      setData({
        metrics: {
          views: 15234,
          clicks: 1823,
          conversions: 234,
          revenue: 2340000,
          ctr: 11.96,
          conversionRate: 12.84,
          viewsChange: 23.5,
          clicksChange: 15.2,
          conversionsChange: 45.7,
          revenueChange: 38.9
        },
        chartData: [
          { label: '월', value: 45 },
          { label: '화', value: 62 },
          { label: '수', value: 78 },
          { label: '목', value: 85 },
          { label: '금', value: 92 },
          { label: '토', value: 88 },
          { label: '일', value: 73 }
        ],
        topTemplates: [
          { id: 1, name: '주말 특가 이벤트', platform: 'kakao', conversions: 87, revenue: 870000 },
          { id: 2, name: '친구 추천 혜택', platform: 'instagram', conversions: 65, revenue: 650000 },
          { id: 3, name: '첫 구매 할인', platform: 'naver', conversions: 43, revenue: 430000 }
        ]
      });
    } catch (error) {
      console.error('Failed to fetch performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ko-KR').format(num);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getPlatformIcon = (platform: string) => {
    const icons = {
      kakao: 'K',
      naver: 'N',
      instagram: 'I',
      facebook: 'F',
      twitter: 'T'
    };
    return icons[platform] || '?';
  };

  if (loading || !data) {
    return <Dashboard>로딩중...</Dashboard>;
  }

  return (
    <Dashboard>
      <Header>
        <Title>
          📊 실시간 성과 대시보드
        </Title>
        <PeriodSelector>
          <PeriodButton active={period === 'day'} onClick={() => setPeriod('day')}>
            일간
          </PeriodButton>
          <PeriodButton active={period === 'week'} onClick={() => setPeriod('week')}>
            주간
          </PeriodButton>
          <PeriodButton active={period === 'month'} onClick={() => setPeriod('month')}>
            월간
          </PeriodButton>
        </PeriodSelector>
      </Header>

      <MetricsGrid>
        <MetricCard trend={data.metrics.viewsChange > 0 ? 'up' : 'down'}>
          <MetricLabel>조회수</MetricLabel>
          <MetricValue>{formatNumber(data.metrics.views)}</MetricValue>
          <MetricChange positive={data.metrics.viewsChange > 0}>
            <span>{data.metrics.viewsChange > 0 ? '↑' : '↓'}</span>
            <span>{Math.abs(data.metrics.viewsChange)}%</span>
          </MetricChange>
        </MetricCard>

        <MetricCard trend={data.metrics.clicksChange > 0 ? 'up' : 'down'}>
          <MetricLabel>클릭수</MetricLabel>
          <MetricValue>{formatNumber(data.metrics.clicks)}</MetricValue>
          <MetricChange positive={data.metrics.clicksChange > 0}>
            <span>{data.metrics.clicksChange > 0 ? '↑' : '↓'}</span>
            <span>{Math.abs(data.metrics.clicksChange)}%</span>
          </MetricChange>
        </MetricCard>

        <MetricCard trend={data.metrics.conversionsChange > 0 ? 'up' : 'down'}>
          <MetricLabel>전환수</MetricLabel>
          <MetricValue>{formatNumber(data.metrics.conversions)}</MetricValue>
          <MetricChange positive={data.metrics.conversionsChange > 0}>
            <span>{data.metrics.conversionsChange > 0 ? '↑' : '↓'}</span>
            <span>{Math.abs(data.metrics.conversionsChange)}%</span>
          </MetricChange>
        </MetricCard>

        <MetricCard trend={data.metrics.revenueChange > 0 ? 'up' : 'down'}>
          <MetricLabel>수익</MetricLabel>
          <MetricValue>{formatCurrency(data.metrics.revenue)}</MetricValue>
          <MetricChange positive={data.metrics.revenueChange > 0}>
            <span>{data.metrics.revenueChange > 0 ? '↑' : '↓'}</span>
            <span>{Math.abs(data.metrics.revenueChange)}%</span>
          </MetricChange>
        </MetricCard>

        <MetricCard trend="neutral">
          <MetricLabel>클릭률 (CTR)</MetricLabel>
          <MetricValue>{data.metrics.ctr.toFixed(1)}%</MetricValue>
        </MetricCard>

        <MetricCard trend="neutral">
          <MetricLabel>전환율</MetricLabel>
          <MetricValue>{data.metrics.conversionRate.toFixed(1)}%</MetricValue>
        </MetricCard>
      </MetricsGrid>

      <ChartContainer>
        <ChartTitle>일별 전환 추이</ChartTitle>
        <SimpleChart>
          {data.chartData.map((item, index) => (
            <Bar
              key={index}
              height={item.value}
              active={index === data.chartData.length - 1}
              data-value={item.label}
              data-label={item.value}
            />
          ))}
        </SimpleChart>
      </ChartContainer>

      <TopPerformers>
        <ChartTitle>🏆 TOP 성과 템플릿</ChartTitle>
        {data.topTemplates.map((template, index) => (
          <PerformerItem key={template.id}>
            <PerformerInfo>
              <PlatformIcon platform={template.platform}>
                {getPlatformIcon(template.platform)}
              </PlatformIcon>
              <div>
                <PerformerName>{template.name}</PerformerName>
                <div style={{ fontSize: '12px', color: '#999' }}>
                  {template.platform.toUpperCase()}
                </div>
              </div>
            </PerformerInfo>
            <PerformerStats>
              <PerformerMetric>{template.conversions}건</PerformerMetric>
              <PerformerLabel>{formatCurrency(template.revenue)}</PerformerLabel>
            </PerformerStats>
          </PerformerItem>
        ))}
      </TopPerformers>
    </Dashboard>
  );
}