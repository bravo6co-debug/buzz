export interface RegionalRecommendation {
  id: number;
  title: string;
  content: string;
  content_type: 'food_tour' | 'photo_spot' | 'tour_course' | 'seasonal_special' | 'shopping' | 'culture';
  images: string[];
  is_featured: boolean;
  view_count: number;
  like_count: number;
  location?: {
    address: string;
    latitude?: number;
    longitude?: number;
  };
  tags?: string[];
  difficulty_level?: 'easy' | 'moderate' | 'hard'; // 관광 코스용
  estimated_time?: number; // 예상 소요 시간 (분)
  price_range?: 'free' | 'low' | 'medium' | 'high'; // 가격대
  best_season?: string[]; // 최적 계절
  accessibility_info?: string; // 접근성 정보
  operating_hours?: {
    start: string;
    end: string;
    days: string[];
  };
  contact_info?: {
    phone?: string;
    website?: string;
    instagram?: string;
  };
  created_by_admin_id: number;
  created_at: string;
  updated_at: string;
  published_at?: string;
  is_published: boolean;
}

export interface RecommendationCategory {
  key: string;
  label: string;
  color: string;
  icon: string;
  description: string;
}

export interface RecommendationFilter {
  content_type?: string;
  is_featured?: boolean;
  price_range?: string;
  difficulty_level?: string;
  search_query?: string;
  location_radius?: number; // km
  sort_by?: 'created_at' | 'updated_at' | 'view_count' | 'like_count';
  sort_order?: 'asc' | 'desc';
}

export interface RecommendationStats {
  total_recommendations: number;
  by_category: Record<string, number>;
  total_views: number;
  total_likes: number;
  most_popular: RegionalRecommendation[];
  recent_additions: RegionalRecommendation[];
}