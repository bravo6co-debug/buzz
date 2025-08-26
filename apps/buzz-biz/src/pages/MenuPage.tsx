import React from 'react';
import styled from 'styled-components';

const Container = styled.div`
  padding: ${({ theme }) => theme.spacing.xl};
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes.xxl};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const MenuGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
`;

const MenuCard = styled.div`
  background-color: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  overflow: hidden;
  box-shadow: ${({ theme }) => theme.shadows.sm};
`;

const MenuImage = styled.div`
  height: 150px;
  background-color: ${({ theme }) => theme.colors.background};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${({ theme }) => theme.fontSizes.xxxl};
`;

const MenuInfo = styled.div`
  padding: ${({ theme }) => theme.spacing.lg};
`;

const MenuName = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const MenuPrice = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const MenuDescription = styled.p`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const AddButton = styled.button`
  position: fixed;
  bottom: 30px;
  right: 30px;
  width: 60px;
  height: 60px;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  background-color: ${({ theme }) => theme.colors.primary};
  color: white;
  font-size: ${({ theme }) => theme.fontSizes.xxl};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  
  &:hover {
    background-color: ${({ theme }) => theme.colors.primaryDark};
  }
`;

const menuItems = [
  {
    id: 1,
    name: '진주 비블밥',
    price: 18000,
    description: '신선한 야채와 고소한 진주 된장으로 만든 비빔밥',
    emoji: '🍲',
  },
  {
    id: 2,
    name: '삼겹살 정식',
    price: 25000,
    description: '바빡하게 구워낸 삼겹살과 신선한 반찬',
    emoji: '🥩',
  },
  {
    id: 3,
    name: '김치찌개',
    price: 15000,
    description: '고소한 김치와 두부가 들어간 칼칼한 찌개',
    emoji: '🍲',
  },
  {
    id: 4,
    name: '새우 볶음밥',
    price: 16000,
    description: '프리미엄 새우와 다양한 야채로 만든 볶음밥',
    emoji: '🍚',
  },
];

export function MenuPage() {
  return (
    <Container>
      <Title>메뉴 관리</Title>
      <MenuGrid>
        {menuItems.map((item) => (
          <MenuCard key={item.id}>
            <MenuImage>{item.emoji}</MenuImage>
            <MenuInfo>
              <MenuName>{item.name}</MenuName>
              <MenuPrice>{item.price.toLocaleString()}원</MenuPrice>
              <MenuDescription>{item.description}</MenuDescription>
            </MenuInfo>
          </MenuCard>
        ))}
      </MenuGrid>
      <AddButton>+</AddButton>
    </Container>
  );
}