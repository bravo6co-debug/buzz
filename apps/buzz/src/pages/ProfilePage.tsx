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

export function ProfilePage() {
  return (
    <Container>
      <Title>마이페이지</Title>
      <p>사용자 정보와 설정이 여기에 표시됩니다.</p>
    </Container>
  );
}