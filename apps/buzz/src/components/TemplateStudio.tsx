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
`;

const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.lg}`};
  background: ${({ variant, theme }) => 
    variant === 'primary' 
      ? `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`
      : theme.colors.background
  };
  color: ${({ variant, theme }) => variant === 'primary' ? 'white' : theme.colors.text};
  border: ${({ variant, theme }) => variant !== 'primary' ? `2px solid ${theme.colors.border}` : 'none'};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.02);
  }
`;

const TemplateGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
`;

const TemplateCard = styled.div`
  background: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.lg};
  border: 2px solid ${({ theme }) => theme.colors.border};
  transition: all 0.3s ease;
  position: relative;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadows.md};
  }
`;

const PlatformBadge = styled.div<{ platform: string }>`
  position: absolute;
  top: 12px;
  right: 12px;
  padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.sm}`};
  background: ${({ platform, theme }) => {
    const colors = {
      kakao: '#FEE500',
      naver: '#03C75A',
      instagram: '#E1306C',
      facebook: '#1877F2',
      twitter: '#1DA1F2'
    };
    return colors[platform] || theme.colors.primary;
  }};
  color: ${({ platform }) => platform === 'kakao' ? '#000' : '#fff'};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
`;

const TemplateContent = styled.div`
  margin: ${({ theme }) => theme.spacing.md} 0;
`;

const TemplateText = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.md};
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text};
  white-space: pre-wrap;
`;

const TemplateHashtags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.xs};
  margin-top: ${({ theme }) => theme.spacing.md};
`;

const Hashtag = styled.span`
  padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.sm}`};
  background: ${({ theme }) => theme.colors.primary}20;
  color: ${({ theme }) => theme.colors.primary};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const TemplateStats = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: ${({ theme }) => theme.spacing.lg};
  padding-top: ${({ theme }) => theme.spacing.md};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const StatValue = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.primary};
`;

const StatLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

const TemplateActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-top: ${({ theme }) => theme.spacing.md};
`;

const ActionButton = styled.button`
  flex: 1;
  padding: ${({ theme }) => theme.spacing.sm};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.primary}10;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing['2xl']};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const AIGeneratorModal = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing.xl};
  box-shadow: ${({ theme }) => theme.shadows.xl};
  z-index: 1000;
  max-width: 500px;
  width: 90%;
`;

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
`;

const FormGroup = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const Label = styled.label`
  display: block;
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
`;

const Select = styled.select`
  width: 100%;
  padding: ${({ theme }) => theme.spacing.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  background: ${({ theme }) => theme.colors.background};
  font-size: ${({ theme }) => theme.fontSizes.md};
`;

const Input = styled.input`
  width: 100%;
  padding: ${({ theme }) => theme.spacing.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  background: ${({ theme }) => theme.colors.background};
  font-size: ${({ theme }) => theme.fontSizes.md};
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: ${({ theme }) => theme.spacing.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  background: ${({ theme }) => theme.colors.background};
  font-size: ${({ theme }) => theme.fontSizes.md};
  resize: vertical;
  min-height: 100px;
`;

interface Template {
  id: number;
  platform: string;
  templateName: string;
  templateText: string;
  hashtags: string[];
  performanceScore: number;
  analytics?: {
    totalViews: number;
    totalClicks: number;
    totalConversions: number;
  };
}

export function TemplateStudio() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAIModal, setShowAIModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<number | null>(null);

  useEffect(() => {
    fetchTemplates();
    fetchCampaigns();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.data.templates || []);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const response = await fetch('/api/referrals/campaigns', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.data.campaigns || []);
        if (data.data.campaigns.length > 0) {
          setSelectedCampaign(data.data.campaigns[0].campaign.id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
    }
  };

  const handleCopyTemplate = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('템플릿이 클립보드에 복사되었습니다!');
  };

  const handleShareTemplate = async (template: Template) => {
    if (navigator.share) {
      try {
        await navigator.share({
          text: template.templateText,
          title: template.templateName
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      handleCopyTemplate(template.templateText);
    }
  };

  const handleEditTemplate = (template: Template) => {
    setEditingTemplate(template);
  };

  const handleDeleteTemplate = async (templateId: number) => {
    if (!confirm('정말로 이 템플릿을 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        fetchTemplates();
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  if (loading) {
    return <Container>로딩중...</Container>;
  }

  return (
    <Container>
      <Header>
        <Title>📝 템플릿 스튜디오</Title>
        <Actions>
          <Button onClick={() => setShowAIModal(true)} variant="primary">
            ✨ AI 템플릿 생성
          </Button>
          <Button>
            ➕ 직접 만들기
          </Button>
        </Actions>
      </Header>

      {templates.length === 0 ? (
        <EmptyState>
          <h3>아직 템플릿이 없습니다</h3>
          <p>AI 생성 또는 직접 만들기로 첫 템플릿을 만들어보세요!</p>
        </EmptyState>
      ) : (
        <TemplateGrid>
          {templates.map(template => (
            <TemplateCard key={template.id}>
              <PlatformBadge platform={template.platform}>
                {template.platform.toUpperCase()}
              </PlatformBadge>
              
              <h3>{template.templateName}</h3>
              
              <TemplateContent>
                <TemplateText>{template.templateText}</TemplateText>
                
                {template.hashtags && template.hashtags.length > 0 && (
                  <TemplateHashtags>
                    {template.hashtags.map((tag, index) => (
                      <Hashtag key={index}>#{tag}</Hashtag>
                    ))}
                  </TemplateHashtags>
                )}
              </TemplateContent>

              {template.analytics && (
                <TemplateStats>
                  <StatItem>
                    <StatValue>{template.analytics.totalViews}</StatValue>
                    <StatLabel>조회수</StatLabel>
                  </StatItem>
                  <StatItem>
                    <StatValue>{template.analytics.totalClicks}</StatValue>
                    <StatLabel>클릭수</StatLabel>
                  </StatItem>
                  <StatItem>
                    <StatValue>{template.analytics.totalConversions}</StatValue>
                    <StatLabel>전환수</StatLabel>
                  </StatItem>
                </TemplateStats>
              )}

              <TemplateActions>
                <ActionButton onClick={() => handleCopyTemplate(template.templateText)}>
                  📋 복사
                </ActionButton>
                <ActionButton onClick={() => handleShareTemplate(template)}>
                  🔗 공유
                </ActionButton>
                <ActionButton onClick={() => handleEditTemplate(template)}>
                  ✏️ 수정
                </ActionButton>
                <ActionButton onClick={() => handleDeleteTemplate(template.id)}>
                  🗑️ 삭제
                </ActionButton>
              </TemplateActions>
            </TemplateCard>
          ))}
        </TemplateGrid>
      )}

      {showAIModal && (
        <>
          <Overlay onClick={() => setShowAIModal(false)} />
          <AIGeneratorModal>
            <h2>✨ AI 템플릿 생성</h2>
            <FormGroup>
              <Label>캠페인 선택</Label>
              <Select 
                value={selectedCampaign || ''}
                onChange={(e) => setSelectedCampaign(Number(e.target.value))}
              >
                <option value="">캠페인을 선택하세요</option>
                {campaigns.map(c => (
                  <option key={c.campaign.id} value={c.campaign.id}>
                    {c.campaign.name}
                  </option>
                ))}
              </Select>
            </FormGroup>

            <FormGroup>
              <Label>플랫폼</Label>
              <Select>
                <option value="kakao">카카오톡</option>
                <option value="naver">네이버</option>
                <option value="instagram">인스타그램</option>
                <option value="facebook">페이스북</option>
                <option value="twitter">트위터</option>
              </Select>
            </FormGroup>

            <FormGroup>
              <Label>톤 & 매너</Label>
              <Select>
                <option value="casual">캐주얼</option>
                <option value="formal">포멀</option>
                <option value="exciting">신나는</option>
                <option value="urgent">긴급한</option>
              </Select>
            </FormGroup>

            <FormGroup>
              <Label>타겟 고객 (선택)</Label>
              <Input type="text" placeholder="예: 20-30대 직장인" />
            </FormGroup>

            <FormGroup>
              <Label>키워드 (선택)</Label>
              <Input type="text" placeholder="쉼표로 구분 (예: 할인, 이벤트, 혜택)" />
            </FormGroup>

            <Actions>
              <Button variant="primary">생성하기</Button>
              <Button onClick={() => setShowAIModal(false)}>취소</Button>
            </Actions>
          </AIGeneratorModal>
        </>
      )}
    </Container>
  );
}