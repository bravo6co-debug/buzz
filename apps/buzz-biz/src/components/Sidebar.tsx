import React from 'react';
import styled from 'styled-components';
import { useNavigate, useLocation } from 'react-router-dom';

const SidebarContainer = styled.aside`
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: 250px;
  background-color: ${({ theme }) => theme.colors.surface};
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  z-index: 100;
`;

const Logo = styled.div`
  padding: ${({ theme }) => theme.spacing.xl} ${({ theme }) => theme.spacing.lg};
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.primary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const NavList = styled.nav`
  padding: ${({ theme }) => theme.spacing.lg} 0;
`;

const NavItem = styled.button<{ active: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.lg};
  background-color: ${({ theme, active }) => 
    active ? theme.colors.primary + '10' : 'transparent'
  };
  color: ${({ theme, active }) => 
    active ? theme.colors.primary : theme.colors.text
  };
  border-left: ${({ theme, active }) => 
    active ? `3px solid ${theme.colors.primary}` : '3px solid transparent'
  };
  font-weight: ${({ theme, active }) => 
    active ? theme.fontWeights.semibold : theme.fontWeights.normal
  };
  
  &:hover {
    background-color: ${({ theme }) => theme.colors.primary + '05'};
  }
`;

const NavIcon = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.lg};
`;

const navItems = [
  { path: '/', label: '대시보드', icon: '📊' },
  { path: '/orders', label: '주문 관리', icon: '📋' },
  { path: '/menu', label: '메뉴 관리', icon: '🍽️' },
  { path: '/analytics', label: '분석', icon: '📈' },
  { path: '/settings', label: '설정', icon: '⚙️' },
];

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <SidebarContainer>
      <Logo>Buzz Business</Logo>
      <NavList>
        {navItems.map((item) => (
          <NavItem
            key={item.path}
            active={location.pathname === item.path}
            onClick={() => navigate(item.path)}
          >
            <NavIcon>{item.icon}</NavIcon>
            <span>{item.label}</span>
          </NavItem>
        ))}
      </NavList>
    </SidebarContainer>
  );
}