import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const Panel = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing.xl};
  box-shadow: ${({ theme }) => theme.shadows.sm};
`;

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing.xl};
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const LevelSection = styled.div`
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.primary}10, ${({ theme }) => theme.colors.secondary}10);
  padding: ${({ theme }) => theme.spacing.lg};
  border-radius: ${({ theme }) => theme.borderRadius.md};
`;

const LevelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const Level = styled.div`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.primary};
`;

const LevelTitle = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  color: ${({ theme }) => theme.colors.text};
`;

const XPBar = styled.div`
  background: ${({ theme }) => theme.colors.background};
  height: 20px;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const XPFill = styled.div<{ percentage: number }>`
  background: linear-gradient(90deg, ${({ theme }) => theme.colors.primary}, ${({ theme }) => theme.colors.secondary});
  height: 100%;
  width: ${({ percentage }) => percentage}%;
  transition: width 0.5s ease;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: ${({ theme }) => theme.spacing.sm};
`;

const XPText = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  text-align: center;
`;

const QuestSection = styled.div`
  background: ${({ theme }) => theme.colors.background};
  padding: ${({ theme }) => theme.spacing.lg};
  border-radius: ${({ theme }) => theme.borderRadius.md};
`;

const QuestList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;

const QuestItem = styled.div<{ completed: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ completed, theme }) => completed ? theme.colors.success + '10' : theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  border: 1px solid ${({ completed, theme }) => completed ? theme.colors.success : theme.colors.border};
`;

const QuestInfo = styled.div`
  flex: 1;
`;

const QuestTitle = styled.div<{ completed: boolean }>`
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ completed, theme }) => completed ? theme.colors.success : theme.colors.text};
  text-decoration: ${({ completed }) => completed ? 'line-through' : 'none'};
`;

const QuestProgress = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

const QuestReward = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.warning};
`;

const BadgeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
  gap: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.lg};
`;

const Badge = styled.div<{ earned: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.sm};
  background: ${({ earned, theme }) => earned ? theme.colors.surface : theme.colors.background};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  opacity: ${({ earned }) => earned ? 1 : 0.3};
  filter: ${({ earned }) => earned ? 'none' : 'grayscale(100%)'};
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: ${({ earned }) => earned ? 'scale(1.1)' : 'none'};
    opacity: ${({ earned }) => earned ? 1 : 0.5};
  }
`;

const BadgeIcon = styled.div`
  font-size: 32px;
`;

const BadgeName = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  text-align: center;
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

const ClaimButton = styled.button`
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.success}, ${({ theme }) => theme.colors.primary});
  color: white;
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.lg}`};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  width: 100%;
  margin-top: ${({ theme }) => theme.spacing.lg};
  transition: transform 0.2s ease;

  &:hover:not(:disabled) {
    transform: scale(1.02);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

interface GamificationData {
  level: number;
  title: string;
  totalXp: number;
  xpToNextLevel: number;
  badges: Array<{
    id: string;
    name: string;
    icon: string;
    description: string;
    earned: boolean;
  }>;
  dailyQuests: Array<{
    id: string;
    title: string;
    description: string;
    progress: number;
    target: number;
    reward: number;
    completed: boolean;
  }>;
  allQuestsCompleted: boolean;
  rewardClaimed: boolean;
}

export function GamificationPanel() {
  const [data, setData] = useState<GamificationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGamificationData();
  }, []);

  const fetchGamificationData = async () => {
    try {
      setLoading(true);
      
      // Fetch profile data
      const profileResponse = await fetch('/api/gamification/profile', {
        credentials: 'include'
      });
      
      // Fetch daily quests
      const questsResponse = await fetch('/api/gamification/daily-quests', {
        credentials: 'include'
      });

      if (profileResponse.ok && questsResponse.ok) {
        const profileData = await profileResponse.json();
        const questsData = await questsResponse.json();

        setData({
          level: profileData.data.level,
          title: profileData.data.title,
          totalXp: profileData.data.totalXp,
          xpToNextLevel: profileData.data.xpToNextLevel,
          badges: profileData.data.badges || [],
          dailyQuests: questsData.data.quests,
          allQuestsCompleted: questsData.data.allCompleted,
          rewardClaimed: questsData.data.rewardClaimed
        });
      }
    } catch (error) {
      console.error('Failed to fetch gamification data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimReward = async () => {
    try {
      const response = await fetch('/api/gamification/daily-quests/claim', {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        // Refresh data
        fetchGamificationData();
        // Show success message
        alert('보상을 성공적으로 수령했습니다!');
      }
    } catch (error) {
      console.error('Failed to claim reward:', error);
    }
  };

  if (loading || !data) {
    return <Panel>로딩중...</Panel>;
  }

  const xpPercentage = ((data.totalXp % 1000) / 1000) * 100;

  return (
    <Panel>
      <SectionTitle>
        🎮 게임화 대시보드
      </SectionTitle>

      <Grid>
        <LevelSection>
          <LevelHeader>
            <div>
              <Level>Lv.{data.level}</Level>
              <LevelTitle>{data.title}</LevelTitle>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 'bold' }}>{data.totalXp} XP</div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                다음 레벨까지 {data.xpToNextLevel} XP
              </div>
            </div>
          </LevelHeader>
          
          <XPBar>
            <XPFill percentage={xpPercentage}>
              <span style={{ color: 'white', fontSize: '10px' }}>
                {xpPercentage.toFixed(0)}%
              </span>
            </XPFill>
          </XPBar>
          
          <XPText>
            {data.totalXp} / {data.totalXp + data.xpToNextLevel} XP
          </XPText>
        </LevelSection>

        <QuestSection>
          <h3 style={{ marginBottom: '16px' }}>📋 일일 퀘스트</h3>
          <QuestList>
            {data.dailyQuests.map(quest => (
              <QuestItem key={quest.id} completed={quest.completed}>
                <QuestInfo>
                  <QuestTitle completed={quest.completed}>
                    {quest.title}
                  </QuestTitle>
                  <QuestProgress>
                    {quest.progress} / {quest.target}
                  </QuestProgress>
                </QuestInfo>
                <QuestReward>
                  <span>💰</span>
                  <span>{quest.reward}</span>
                </QuestReward>
              </QuestItem>
            ))}
          </QuestList>
          
          <ClaimButton
            disabled={!data.allQuestsCompleted || data.rewardClaimed}
            onClick={handleClaimReward}
          >
            {data.rewardClaimed 
              ? '오늘의 보상 수령 완료' 
              : data.allQuestsCompleted 
                ? '보상 받기 (100 마일리지)'
                : '모든 퀘스트를 완료하세요'
            }
          </ClaimButton>
        </QuestSection>
      </Grid>

      <div style={{ marginTop: '32px' }}>
        <h3 style={{ marginBottom: '16px' }}>🏆 획득한 뱃지</h3>
        <BadgeGrid>
          {data.badges.length > 0 ? (
            data.badges.map(badge => (
              <Badge key={badge.id} earned={badge.earned} title={badge.description}>
                <BadgeIcon>{badge.icon}</BadgeIcon>
                <BadgeName>{badge.name}</BadgeName>
              </Badge>
            ))
          ) : (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#999' }}>
              아직 획득한 뱃지가 없습니다
            </div>
          )}
        </BadgeGrid>
      </div>
    </Panel>
  );
}