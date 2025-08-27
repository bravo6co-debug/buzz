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

export function RestaurantPage() {
  return (
    <Container>
      <Title>음식점 페이지</Title>
      <p>음식점 상세 정보와 메뉴가 표시됩니다.</p>
    </Container>
  );
}