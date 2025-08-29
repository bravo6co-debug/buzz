import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8083;

// Load sample auth data
const authData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../sample-auth.json'), 'utf-8'));

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mock authentication endpoint
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  const user = authData.users.find(u => u.email === email);
  
  if (user && password === authData.plainPassword) {
    const { password: _, ...userWithoutPassword } = user;
    res.json({
      success: true,
      user: userWithoutPassword,
      token: 'mock-jwt-token-' + user.id
    });
  } else {
    res.status(401).json({
      success: false,
      message: '이메일 또는 비밀번호가 올바르지 않습니다'
    });
  }
});

// Mock user profile endpoint
app.get('/api/users/profile', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ success: false, message: '인증이 필요합니다' });
  }
  
  // Extract user ID from mock token
  const token = authHeader.replace('Bearer ', '');
  const userId = parseInt(token.replace('mock-jwt-token-', ''));
  
  const user = authData.users.find(u => u.id === userId);
  
  if (user) {
    const { password: _, ...userWithoutPassword } = user;
    res.json({
      success: true,
      data: userWithoutPassword
    });
  } else {
    res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다' });
  }
});

// Mock mileage balance
app.get('/api/mileage/balance', (req, res) => {
  res.json({
    success: true,
    data: {
      balance: 5000,
      pending: 0,
      totalEarned: 10000,
      totalSpent: 5000
    }
  });
});

// Mock businesses list
app.get('/api/businesses', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 1,
        businessName: '버즈 카페',
        category: 'cafe',
        address: '서울시 강남구 테헤란로 123',
        rating: 4.5,
        totalReviews: 128
      },
      {
        id: 2,
        businessName: '버즈 레스토랑',
        category: 'restaurant',
        address: '서울시 서초구 강남대로 456',
        rating: 4.3,
        totalReviews: 89
      }
    ]
  });
});

// Mock admin dashboard stats
app.get('/api/admin/dashboard/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      totalUsers: 15234,
      totalBusinesses: 342,
      totalTransactions: 48921,
      totalMileageIssued: 5234000,
      totalMileageUsed: 2156000,
      activeUsers30d: 8234,
      newUsersToday: 127,
      pendingSettlements: 12,
      todayRevenue: 3456000,
      monthlyGrowth: 15.7,
      conversionRate: 3.4
    }
  });
});

// Mock admin users list
app.get('/api/admin/users', (req, res) => {
  res.json({
    success: true,
    data: authData.users.map(user => {
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }),
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalItems: authData.users.length,
      itemsPerPage: 10
    }
  });
});

// Mock admin businesses list
app.get('/api/admin/businesses', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 1,
        businessName: '버즈 카페',
        ownerName: '김사장',
        category: 'cafe',
        status: 'approved',
        createdAt: '2024-01-15T10:00:00Z',
        totalRevenue: 5670000
      },
      {
        id: 2,
        businessName: '버즈 레스토랑',
        ownerName: '이사장',
        category: 'restaurant',
        status: 'pending',
        createdAt: '2024-02-20T14:30:00Z',
        totalRevenue: 0
      }
    ],
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 2,
      itemsPerPage: 10
    }
  });
});

// Mock referral campaigns
app.get('/api/campaigns', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 1,
        name: '신년 이벤트',
        referralCode: 'NEWYEAR2025',
        clickCount: 1234,
        conversionCount: 89,
        conversionRate: 7.2,
        isActive: true
      },
      {
        id: 2,
        name: '봄맞이 캠페인',
        referralCode: 'SPRING2025',
        clickCount: 567,
        conversionCount: 34,
        conversionRate: 6.0,
        isActive: true
      }
    ]
  });
});

// Mock notifications
app.get('/api/notifications', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 1,
        title: '마일리지 적립',
        body: '500 마일리지가 적립되었습니다',
        type: 'info',
        isRead: false,
        createdAt: new Date().toISOString()
      },
      {
        id: 2,
        title: '이벤트 안내',
        body: '신년 이벤트가 시작되었습니다',
        type: 'success',
        isRead: true,
        createdAt: new Date(Date.now() - 86400000).toISOString()
      }
    ]
  });
});

// Mock coupons
app.get('/api/coupons', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 1,
        couponType: 'welcome',
        discountType: 'percentage',
        discountValue: 10,
        minPurchase: 10000,
        isUsed: false,
        expiresAt: new Date(Date.now() + 30 * 86400000).toISOString()
      },
      {
        id: 2,
        couponType: 'event',
        discountType: 'fixed',
        discountValue: 3000,
        minPurchase: 20000,
        isUsed: false,
        expiresAt: new Date(Date.now() + 7 * 86400000).toISOString()
      }
    ]
  });
});

// Mock reviews
app.get('/api/reviews', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 1,
        userName: '김고객',
        businessName: '버즈 카페',
        rating: 5,
        comment: '정말 좋아요! 커피가 맛있습니다.',
        createdAt: new Date().toISOString()
      },
      {
        id: 2,
        userName: '이고객',
        businessName: '버즈 레스토랑',
        rating: 4,
        comment: '음식이 맛있고 서비스가 친절해요',
        createdAt: new Date(Date.now() - 86400000).toISOString()
      }
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Test API server running on http://localhost:${PORT}`);
  console.log(`📌 Health check: http://localhost:${PORT}/health`);
  console.log('\n✅ Available test accounts:');
  authData.users.forEach(user => {
    console.log(`   - ${user.email} / ${authData.plainPassword} (${user.role})`);
  });
});