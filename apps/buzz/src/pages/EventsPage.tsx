import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Gift, Users, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { eventApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useToast } from '../hooks/use-toast';
import { formatCurrency } from '../lib/utils';

export function EventsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: activeEvents, isLoading } = useQuery({
    queryKey: ['active-events'],
    queryFn: () => eventApi.getActive().then(res => res.data.data),
  });

  const participateEvent = useMutation({
    mutationFn: async (eventId: number) => {
      // API call to participate in event
      await new Promise(resolve => setTimeout(resolve, 1000));
      return eventId;
    },
    onSuccess: () => {
      toast({
        title: "이벤트 참여 완료!",
        description: "이벤트에 성공적으로 참여했습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ['active-events'] });
    },
    onError: () => {
      toast({
        title: "참여 실패",
        description: "이벤트 참여 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'signup_bonus': return <Gift className="h-6 w-6 text-blue-600" />;
      case 'referral_bonus': return <Users className="h-6 w-6 text-green-600" />;
      case 'special_coupon': return <TrendingUp className="h-6 w-6 text-purple-600" />;
      default: return <Calendar className="h-6 w-6 text-gray-600" />;
    }
  };

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case 'signup_bonus': return '가입 보너스';
      case 'referral_bonus': return '추천 보너스';
      case 'special_coupon': return '특별 할인';
      default: return type;
    }
  };

  const isEventActive = (startDate: string, endDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    return now >= start && now <= end;
  };

  const formatEventDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    });
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">이벤트</h1>
        <p className="text-muted-foreground">
          진행 중인 이벤트에 참여하고 다양한 혜택을 받아보세요
        </p>
      </div>

      {/* 이벤트 요약 카드 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {activeEvents?.length || 0}
            </p>
            <p className="text-sm text-muted-foreground">진행 중인 이벤트</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Gift className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">최대 30%</p>
            <p className="text-sm text-muted-foreground">할인 혜택</p>
          </CardContent>
        </Card>
      </div>

      {/* 이벤트 리스트 */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-muted rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-5 bg-muted rounded w-3/4"></div>
                      <div className="h-4 bg-muted rounded w-1/2"></div>
                      <div className="h-3 bg-muted rounded w-full"></div>
                      <div className="h-3 bg-muted rounded w-2/3"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          activeEvents?.map((event) => {
            const eventActive = isEventActive(event.start_date, event.end_date);
            
            return (
              <Card key={event.id} className={eventActive ? "border-primary" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      {getEventIcon(event.event_type)}
                      <div>
                        <CardTitle className="text-lg">{event.title}</CardTitle>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                            {getEventTypeLabel(event.event_type)}
                          </span>
                          {eventActive && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center space-x-1">
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                              <span>진행중</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  {event.description && (
                    <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                      {event.description}
                    </p>
                  )}

                  {/* 이벤트 혜택 */}
                  {event.bonus_amount && (
                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-lg mb-4">
                      <div className="flex items-center justify-center space-x-2">
                        <TrendingUp className="h-5 w-5 text-orange-600" />
                        <span className="font-semibold text-orange-800">
                          {event.event_type === 'special_coupon' 
                            ? `${event.bonus_amount}% 할인`
                            : `${formatCurrency(event.bonus_amount)} 마일리지 지급`
                          }
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 이벤트 기간 */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>
                        {formatEventDate(event.start_date)} - {formatEventDate(event.end_date)}
                      </span>
                    </div>
                  </div>

                  {/* 참여 버튼 */}
                  <Button
                    className="w-full"
                    disabled={!eventActive || participateEvent.isPending}
                    onClick={() => participateEvent.mutate(event.id)}
                  >
                    {participateEvent.isPending ? (
                      "참여 중..."
                    ) : !eventActive ? (
                      "종료된 이벤트"
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        이벤트 참여하기
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })
        )}

        {activeEvents && activeEvents.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              진행 중인 이벤트가 없습니다
            </h3>
            <p className="text-sm text-muted-foreground">
              곧 새로운 이벤트가 시작될 예정입니다
            </p>
          </div>
        )}
      </div>
    </div>
  );
}