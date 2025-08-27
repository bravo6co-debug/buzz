import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Star, 
  MessageSquare, 
  Clock, 
  User, 
  AlertCircle,
  Send,
  Edit,
  Trash2,
  Filter,
  RefreshCw,
  ChevronDown,
  Image as ImageIcon,
  CheckCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import axios from 'axios';
import { useToast } from '@/components/ui/use-toast';

// API 클라이언트
const reviewApi = {
  getReviews: (params: { page: number; limit: number; filter: string }) =>
    axios.get('/api/business/reviews', { params }),
  
  getStats: () =>
    axios.get('/api/business/reviews/stats'),
  
  createReply: (reviewId: number, reply: string) =>
    axios.post(`/api/business/reviews/${reviewId}/reply`, { reply }),
  
  updateReply: (reviewId: number, reply: string) =>
    axios.put(`/api/business/reviews/${reviewId}/reply`, { reply }),
  
  deleteReply: (reviewId: number) =>
    axios.delete(`/api/business/reviews/${reviewId}/reply`),
  
  markAsRead: (reviewId: number) =>
    axios.put(`/api/business/reviews/${reviewId}/read`)
};

interface Review {
  id: number;
  rating: number;
  reviewText: string;
  images?: string[];
  ownerReply?: string;
  ownerReplyAt?: string;
  isReadByOwner: boolean;
  createdAt: string;
  userName: string;
  userEmail: string;
}

export function ReviewsPage() {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'no_reply' | 'unread'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isReplyDialogOpen, setIsReplyDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 리뷰 목록 조회
  const { data: reviewsData, isLoading, refetch } = useQuery({
    queryKey: ['business-reviews', currentPage, selectedFilter],
    queryFn: () => reviewApi.getReviews({ 
      page: currentPage, 
      limit: 20, 
      filter: selectedFilter 
    }).then(res => res.data.data),
  });

  // 통계 조회
  const { data: statsData } = useQuery({
    queryKey: ['review-stats'],
    queryFn: () => reviewApi.getStats().then(res => res.data.data),
  });

  // 답글 작성 뮤테이션
  const replyMutation = useMutation({
    mutationFn: ({ reviewId, reply }: { reviewId: number; reply: string }) => {
      if (editMode && selectedReview?.ownerReply) {
        return reviewApi.updateReply(reviewId, reply);
      }
      return reviewApi.createReply(reviewId, reply);
    },
    onSuccess: () => {
      toast({
        title: editMode ? '답글 수정 완료' : '답글 작성 완료',
        description: editMode ? '답글이 수정되었습니다.' : '답글이 작성되었습니다.',
      });
      queryClient.invalidateQueries({ queryKey: ['business-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['review-stats'] });
      setIsReplyDialogOpen(false);
      setReplyText('');
      setSelectedReview(null);
      setEditMode(false);
    },
    onError: (error: any) => {
      toast({
        title: '오류 발생',
        description: error.response?.data?.error || '답글 처리 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    },
  });

  // 답글 삭제 뮤테이션
  const deleteReplyMutation = useMutation({
    mutationFn: (reviewId: number) => reviewApi.deleteReply(reviewId),
    onSuccess: () => {
      toast({
        title: '답글 삭제 완료',
        description: '답글이 삭제되었습니다.',
      });
      queryClient.invalidateQueries({ queryKey: ['business-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['review-stats'] });
    },
    onError: (error: any) => {
      toast({
        title: '오류 발생',
        description: error.response?.data?.error || '답글 삭제 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    },
  });

  // 읽음 처리 뮤테이션
  const markAsReadMutation = useMutation({
    mutationFn: (reviewId: number) => reviewApi.markAsRead(reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['review-stats'] });
    },
  });

  const handleReplyClick = (review: Review) => {
    setSelectedReview(review);
    setReplyText(review.ownerReply || '');
    setEditMode(!!review.ownerReply);
    setIsReplyDialogOpen(true);
    
    // 읽지 않은 리뷰라면 읽음 처리
    if (!review.isReadByOwner) {
      markAsReadMutation.mutate(review.id);
    }
  };

  const handleReplySubmit = () => {
    if (!selectedReview || !replyText.trim()) return;
    
    replyMutation.mutate({
      reviewId: selectedReview.id,
      reply: replyText.trim()
    });
  };

  const handleDeleteReply = (reviewId: number) => {
    if (window.confirm('답글을 삭제하시겠습니까?')) {
      deleteReplyMutation.mutate(reviewId);
    }
  };

  const renderStars = (rating: number) => {
    return [...Array(5)].map((_, index) => (
      <Star
        key={index}
        className={`h-4 w-4 ${
          index < rating
            ? 'fill-yellow-400 text-yellow-400'
            : 'text-gray-300'
        }`}
      />
    ));
  };

  const filterButtons = [
    { value: 'all' as const, label: '전체', count: statsData?.totalReviews },
    { value: 'no_reply' as const, label: '미답변', count: statsData?.totalReviews - statsData?.repliedCount },
    { value: 'unread' as const, label: '안읽음', count: statsData?.unreadCount },
  ];

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">리뷰 관리</h1>
          <p className="text-gray-600">고객 리뷰를 확인하고 답글을 작성하세요.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          새로고침
        </Button>
      </div>

      {/* 통계 카드 */}
      {statsData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">전체 리뷰</p>
                  <p className="text-2xl font-bold">{statsData.totalReviews}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">평균 평점</p>
                  <p className="text-2xl font-bold">{statsData.averageRating}</p>
                </div>
                <Star className="h-8 w-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">답글 작성률</p>
                  <p className="text-2xl font-bold">{statsData.replyRate}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">안읽은 리뷰</p>
                  <p className="text-2xl font-bold text-red-600">{statsData.unreadCount}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 필터 탭 */}
      <div className="flex gap-2">
        {filterButtons.map((filter) => (
          <Button
            key={filter.value}
            variant={selectedFilter === filter.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setSelectedFilter(filter.value);
              setCurrentPage(1);
            }}
          >
            {filter.label}
            {filter.count !== undefined && (
              <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                {filter.count}
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* 리뷰 목록 */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
            <p className="mt-2 text-gray-600">리뷰를 불러오는 중...</p>
          </div>
        ) : reviewsData?.reviews?.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {selectedFilter === 'no_reply' 
                  ? '미답변 리뷰가 없습니다.'
                  : selectedFilter === 'unread'
                  ? '안읽은 리뷰가 없습니다.'
                  : '아직 작성된 리뷰가 없습니다.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          reviewsData?.reviews?.map((review: Review) => (
            <Card key={review.id} className={!review.isReadByOwner ? 'border-blue-200 bg-blue-50' : ''}>
              <CardContent className="p-6">
                {/* 리뷰 헤더 */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium">{review.userName}</p>
                      <div className="flex items-center space-x-2">
                        <div className="flex">{renderStars(review.rating)}</div>
                        <span className="text-sm text-gray-500">
                          {formatDistanceToNow(new Date(review.createdAt), {
                            addSuffix: true,
                            locale: ko
                          })}
                        </span>
                        {!review.isReadByOwner && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                            새 리뷰
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 리뷰 내용 */}
                <div className="mb-4">
                  <p className="text-gray-700">{review.reviewText}</p>
                  
                  {/* 리뷰 이미지 */}
                  {review.images && review.images.length > 0 && (
                    <div className="flex gap-2 mt-3">
                      {review.images.map((image, index) => (
                        <div key={index} className="relative w-20 h-20 bg-gray-100 rounded-lg overflow-hidden">
                          <img src={image} alt={`리뷰 이미지 ${index + 1}`} className="object-cover w-full h-full" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 사장님 답글 */}
                {review.ownerReply && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">사장님 답글</span>
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(review.ownerReplyAt!), {
                          addSuffix: true,
                          locale: ko
                        })}
                      </span>
                    </div>
                    <p className="text-gray-700">{review.ownerReply}</p>
                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReplyClick(review)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        수정
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteReply(review.id)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        삭제
                      </Button>
                    </div>
                  </div>
                )}

                {/* 액션 버튼 */}
                {!review.ownerReply && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReplyClick(review)}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    답글 작성
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* 페이지네이션 */}
      {reviewsData?.pagination && reviewsData.pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            이전
          </Button>
          <span className="flex items-center px-3 text-sm">
            {currentPage} / {reviewsData.pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === reviewsData.pagination.totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            다음
          </Button>
        </div>
      )}

      {/* 답글 작성/수정 다이얼로그 */}
      <Dialog open={isReplyDialogOpen} onOpenChange={setIsReplyDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editMode ? '답글 수정' : '답글 작성'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* 원본 리뷰 표시 */}
            {selectedReview && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="font-medium">{selectedReview.userName}</span>
                  <div className="flex">{renderStars(selectedReview.rating)}</div>
                </div>
                <p className="text-sm text-gray-700">{selectedReview.reviewText}</p>
              </div>
            )}
            
            {/* 답글 입력 */}
            <div>
              <Label htmlFor="reply">답글 내용</Label>
              <textarea
                id="reply"
                className="w-full mt-1 p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="정성스러운 답글을 작성해주세요..."
                maxLength={1000}
              />
              <p className="text-xs text-gray-500 mt-1 text-right">
                {replyText.length} / 1000
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsReplyDialogOpen(false);
                setReplyText('');
                setSelectedReview(null);
                setEditMode(false);
              }}
            >
              취소
            </Button>
            <Button
              onClick={handleReplySubmit}
              disabled={!replyText.trim() || replyMutation.isPending}
            >
              {replyMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  처리중...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {editMode ? '수정' : '작성'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}