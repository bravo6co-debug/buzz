import React from 'react';
import styled from 'styled-components';

const Container = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes.xxl};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  text-align: center;
`;

export function OrdersPage() {
  return (
    <Container>
      <Title>주문내역</Title>
      <p>과거 주문 내역이 표시됩니다.</p>
    </Container>
  );
}