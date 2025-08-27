import React from 'react';
import styled from 'styled-components';

const Container = styled.div`
  padding: ${({ theme }) => theme.spacing.xl};
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes.xxl};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const OrderList = styled.div`
  background-color: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  overflow: hidden;
  box-shadow: ${({ theme }) => theme.shadows.sm};
`;

const OrderItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.lg};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  
  &:last-child {
    border-bottom: none;
  }
`;

const OrderInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const OrderId = styled.div`
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  font-size: ${({ theme }) => theme.fontSizes.lg};
`;

const OrderDetails = styled.div`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const StatusBadge = styled.span<{ status: string }>`
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  background-color: ${
    ({ theme, status }) => {
      switch (status) {
        case 'pending': return theme.colors.warning + '20';
        case 'confirmed': return theme.colors.info + '20';
        case 'preparing': return theme.colors.primary + '20';
        case 'ready': return theme.colors.success + '20';
        default: return theme.colors.textSecondary + '20';
      }
    }
  };
  color: ${
    ({ theme, status }) => {
      switch (status) {
        case 'pending': return theme.colors.warning;
        case 'confirmed': return theme.colors.info;
        case 'preparing': return theme.colors.primary;
        case 'ready': return theme.colors.success;
        default: return theme.colors.textSecondary;
      }
    }
  };
`;

const orders = [
  { id: '#001', items: '진주 비블밥 2개', amount: 35000, status: 'preparing', time: '10:30' },
  { id: '#002', items: '삼겹살 정식 1개', amount: 25000, status: 'ready', time: '10:25' },
  { id: '#003', items: '김치찌개 1개', amount: 18000, status: 'confirmed', time: '10:20' },
  { id: '#004', items: '비블밥 + 사이다 세트', amount: 22000, status: 'pending', time: '10:15' },
];

const getStatusText = (status: string) => {
  switch (status) {
    case 'pending': return '주문 대기';
    case 'confirmed': return '주문 확인';
    case 'preparing': return '조리 중';
    case 'ready': return '조리 완료';
    default: return status;
  }
};

export function OrdersPage() {
  return (
    <Container>
      <Title>주문 관리</Title>
      <OrderList>
        {orders.map((order) => (
          <OrderItem key={order.id}>
            <OrderInfo>
              <OrderId>{order.id}</OrderId>
              <OrderDetails>
                {order.items} • {order.time}
              </OrderDetails>
            </OrderInfo>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
              <div style={{ fontWeight: 'bold' }}>{order.amount.toLocaleString()}원</div>
              <StatusBadge status={order.status}>
                {getStatusText(order.status)}
              </StatusBadge>
            </div>
          </OrderItem>
        ))}
      </OrderList>
    </Container>
  );
}