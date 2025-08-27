import React from 'react';
import styled from 'styled-components';

const Container = styled.div`
  padding: ${({ theme }) => theme.spacing.xl};
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes.xxl};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const StatCard = styled.div`
  background-color: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing.lg};
  box-shadow: ${({ theme }) => theme.shadows.sm};
`;

const StatTitle = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.md};
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const StatValue = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xxl};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const StatChange = styled.div<{ positive: boolean }>`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme, positive }) => 
    positive ? theme.colors.success : theme.colors.error
  };
`;

const ChartContainer = styled.div`
  background-color: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing.lg};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

export function AnalyticsPage() {
  return (
    <Container>
      <Title>분석</Title>
      
      <StatsGrid>
        <StatCard>
          <StatTitle>이달 매출</StatTitle>
          <StatValue>12,500,000원</StatValue>
          <StatChange positive={true}>+15% 전월 대비</StatChange>
        </StatCard>
        
        <StatCard>
          <StatTitle>이달 주문 수</StatTitle>
          <StatValue>342건</StatValue>
          <StatChange positive={true}>+8% 전월 대비</StatChange>
        </StatCard>
        
        <StatCard>
          <StatTitle>평균 주문 금액</StatTitle>
          <StatValue>36,550원</StatValue>
          <StatChange positive={false}>-2% 전월 대비</StatChange>
        </StatCard>
        
        <StatCard>
          <StatTitle>고객 만족도</StatTitle>
          <StatValue>4.7/5.0</StatValue>
          <StatChange positive={true}>+0.3 전월 대비</StatChange>
        </StatCard>
      </StatsGrid>
      
      <ChartContainer>
        차트가 여기에 표시됩니다 (Recharts 라이브러리 사용)
      </ChartContainer>
    </Container>
  );
}