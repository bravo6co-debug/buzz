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

export function CartPage() {
  return (
    <Container>
      <Title>장바구니</Title>
      <p>선택한 메뉴들이 여기에 표시됩니다.</p>
    </Container>
  );
}