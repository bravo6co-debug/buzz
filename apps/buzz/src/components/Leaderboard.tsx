import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const Container = styled.div`
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

const TypeSelector = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const TypeButton = styled.button<{ active: boolean }>`
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.lg}`};
  background: ${({ active, theme }) => active ? theme.colors.primary : theme.colors.background};
  color: ${({ active, theme }) => active ? 'white' : theme.colors.text};
  border: 2px solid ${({ active, theme }) => active ? theme.colors.primary : theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ active, theme }) => !active && theme.colors.primary + '10'};
  }
`;

const PodiumSection = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: ${({ theme }) => theme.spacing.lg};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const PodiumCard = styled.div<{ rank: number }>`
  background: ${({ rank, theme }) => {
    if (rank === 1) return 'linear-gradient(135deg, #FFD700, #FFA500)';
    if (rank === 2) return 'linear-gradient(135deg, #C0C0C0, #808080)';
    if (rank === 3) return 'linear-gradient(135deg, #CD7F32, #8B4513)';
    return theme.colors.background;
  }};
  padding: ${({ theme }) => theme.spacing.lg};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  text-align: center;
  color: white;
  order: ${({ rank }) => rank === 1 ? 0 : rank === 2 ? -1 : 1};
  transform: ${({ rank }) => rank === 1 ? 'scale(1.1)' : 'scale(1)'};
  
  @media (max-width: 768px) {
    order: ${({ rank }) => rank - 1};
    transform: scale(1);
  }
`;

const PodiumRank = styled.div`
  font-size: ${({ theme }) => theme.fontSizes['3xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const PodiumUser = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const PodiumScore = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
`;

const PodiumBadges = styled.div`
  display: flex;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.xs};
  margin-top: ${({ theme }) => theme.spacing.sm};
`;

const RankingList = styled.div`
  background: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.lg};
`;

const RankingHeader = styled.div`
  display: grid;
  grid-template-columns: 60px 1fr 150px 100px;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.md};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.textSecondary};
  border-bottom: 2px solid ${({ theme }) => theme.colors.border};
  
  @media (max-width: 768px) {
    grid-template-columns: 40px 1fr 80px;
    
    & > :nth-child(3) {
      display: none;
    }
  }
`;

const RankingItem = styled.div<{ isCurrentUser?: boolean }>`
  display: grid;
  grid-template-columns: 60px 1fr 150px 100px;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ isCurrentUser, theme }) => isCurrentUser ? theme.colors.primary + '10' : 'transparent'};
  border-left: ${({ isCurrentUser, theme }) => isCurrentUser ? `4px solid ${theme.colors.primary}` : '4px solid transparent'};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  transition: background 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.colors.surface};
  }
  
  &:last-child {
    border-bottom: none;
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 40px 1fr 80px;
    
    & > :nth-child(3) {
      display: none;
    }
  }
`;

const Rank = styled.div<{ rank: number }>`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ rank, theme }) => {
    if (rank === 1) return '#FFD700';
    if (rank === 2) return '#C0C0C0';
    if (rank === 3) return '#CD7F32';
    return theme.colors.text;
  }};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
`;

const UserAvatar = styled.div<{ level: number }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${({ level, theme }) => {
    const hue = (level * 36) % 360;
    return `linear-gradient(135deg, hsl(${hue}, 70%, 50%), hsl(${hue + 30}, 70%, 60%))`;
  }};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: ${({ theme }) => theme.fontWeights.bold};
`;

const UserName = styled.div`
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
`;

const UserLevel = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Score = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.primary};
  text-align: right;
`;

const BadgeCount = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.xs};
  color: ${({ theme }) => theme.colors.warning};
`;

const CurrentUserSection = styled.div`
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.primary}20, ${({ theme }) => theme.colors.secondary}20);
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.lg};
  margin-top: ${({ theme }) => theme.spacing.xl};
`;

const CurrentUserTitle = styled.div`
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

type LeaderboardType = 'global' | 'monthly' | 'conversion';

interface LeaderboardEntry {
  rank: number;
  userId: number;
  userName: string;
  userEmail: string;
  score: number;
  level: number;
  badgeCount: number;
  isCurrentUser: boolean;
}

interface LeaderboardData {
  top3: LeaderboardEntry[];
  rankings: LeaderboardEntry[];
  currentUser: {
    globalRank: number;
    monthlyRank: number;
    conversionRank: number;
  } | null;
}

export function Leaderboard() {
  const [type, setType] = useState<LeaderboardType>('global');
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboardData();
  }, [type]);

  const fetchLeaderboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/gamification/leaderboard?type=${type}&limit=20`, {
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        
        // Process the data
        const leaderboardEntries = result.data.leaderboard.map((entry: any, index: number) => ({
          rank: entry.rank,
          userId: entry.userId,
          userName: entry.userName || '익명 사용자',
          userEmail: entry.userEmail,
          score: entry.totalReferrals || entry.monthlyReferrals || parseFloat(entry.conversionRate || '0'),
          level: entry.level || 1,
          badgeCount: entry.badges ? entry.badges.length : 0,
          isCurrentUser: entry.isCurrentUser
        }));

        setData({
          top3: leaderboardEntries.slice(0, 3),
          rankings: leaderboardEntries.slice(3),
          currentUser: result.data.userRank
        });
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
      // Set mock data for development
      setData({
        top3: [
          { rank: 1, userId: 1, userName: '마케팅왕', userEmail: 'user1@example.com', score: 1234, level: 10, badgeCount: 15, isCurrentUser: false },
          { rank: 2, userId: 2, userName: '바이럴퀸', userEmail: 'user2@example.com', score: 987, level: 8, badgeCount: 12, isCurrentUser: false },
          { rank: 3, userId: 3, userName: '추천마스터', userEmail: 'user3@example.com', score: 756, level: 7, badgeCount: 10, isCurrentUser: false }
        ],
        rankings: Array.from({ length: 10 }, (_, i) => ({
          rank: i + 4,
          userId: i + 4,
          userName: `사용자${i + 4}`,
          userEmail: `user${i + 4}@example.com`,
          score: 700 - (i * 50),
          level: Math.max(1, 6 - Math.floor(i / 2)),
          badgeCount: Math.max(0, 8 - i),
          isCurrentUser: i === 3
        })),
        currentUser: { globalRank: 7, monthlyRank: 5, conversionRank: 12 }
      });
    } finally {
      setLoading(false);
    }
  };

  const getScoreLabel = () => {
    switch (type) {
      case 'monthly':
        return '이번 달 추천';
      case 'conversion':
        return '전환율';
      default:
        return '총 추천';
    }
  };

  const formatScore = (score: number) => {
    if (type === 'conversion') {
      return `${score.toFixed(1)}%`;
    }
    return `${score}명`;
  };

  if (loading || !data) {
    return <Container>로딩중...</Container>;
  }

  return (
    <Container>
      <Header>
        <Title>
          🏆 리더보드
        </Title>
        <TypeSelector>
          <TypeButton active={type === 'global'} onClick={() => setType('global')}>
            전체 랭킹
          </TypeButton>
          <TypeButton active={type === 'monthly'} onClick={() => setType('monthly')}>
            월간 랭킹
          </TypeButton>
          <TypeButton active={type === 'conversion'} onClick={() => setType('conversion')}>
            전환율 랭킹
          </TypeButton>
        </TypeSelector>
      </Header>

      <PodiumSection>
        {data.top3.map(user => (
          <PodiumCard key={user.userId} rank={user.rank}>
            <PodiumRank>
              {user.rank === 1 ? '🥇' : user.rank === 2 ? '🥈' : '🥉'}
            </PodiumRank>
            <PodiumUser>{user.userName}</PodiumUser>
            <PodiumScore>{formatScore(user.score)}</PodiumScore>
            <PodiumBadges>
              <span>Lv.{user.level}</span>
              <span>🏅 {user.badgeCount}</span>
            </PodiumBadges>
          </PodiumCard>
        ))}
      </PodiumSection>

      <RankingList>
        <RankingHeader>
          <div>순위</div>
          <div>사용자</div>
          <div>뱃지</div>
          <div style={{ textAlign: 'right' }}>{getScoreLabel()}</div>
        </RankingHeader>

        {data.rankings.map(user => (
          <RankingItem key={user.userId} isCurrentUser={user.isCurrentUser}>
            <Rank rank={user.rank}>
              {user.rank}
            </Rank>
            <UserInfo>
              <UserAvatar level={user.level}>
                {user.userName[0]}
              </UserAvatar>
              <div>
                <UserName>{user.userName}</UserName>
                <UserLevel>Lv.{user.level}</UserLevel>
              </div>
            </UserInfo>
            <BadgeCount>
              <span>🏅</span>
              <span>{user.badgeCount}개</span>
            </BadgeCount>
            <Score>{formatScore(user.score)}</Score>
          </RankingItem>
        ))}
      </RankingList>

      {data.currentUser && (
        <CurrentUserSection>
          <CurrentUserTitle>내 순위</CurrentUserTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#666' }}>전체 랭킹</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4CAF50' }}>
                #{data.currentUser.globalRank || '-'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#666' }}>월간 랭킹</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2196F3' }}>
                #{data.currentUser.monthlyRank || '-'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#666' }}>전환율 랭킹</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#FF9800' }}>
                #{data.currentUser.conversionRank || '-'}
              </div>
            </div>
          </div>
        </CurrentUserSection>
      )}
    </Container>
  );
}