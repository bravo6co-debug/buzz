import React from 'react';
import styled from 'styled-components';

const Container = styled.div`
  padding: ${({ theme }) => theme.spacing.xl};
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes.xxl};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

export function OrdersPage() {
  return (
    <Container>
      <Title>주문 관리</Title>
      <p>주문 관리 페이지 내용이 여기에 표시됩니다.</p>
    </Container>
  );
}