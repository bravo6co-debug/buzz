import { db } from './client';
import { 
  systemSettings, 
  users, 
  events, 
  regionalContents,
  businesses,
  mileageTransactions,
  referrals
} from './schema';

async function seed() {
  console.log('🌱 Starting database seeding...');

  try {
    // 1. 시스템 설정 기본값 삽입
    console.log('📋 Seeding system settings...');
    await db.insert(systemSettings).values([
      {
        settingKey: 'referral_reward',
        settingValue: '500',
        description: '리퍼럴 추천인 보상 (원)'
      },
      {
        settingKey: 'signup_bonus_default',
        settingValue: '1000',
        description: '기본 가입 보너스 (원)'
      },
      {
        settingKey: 'signup_bonus_referral',
        settingValue: '3000',
        description: '리퍼럴 가입 보너스 (원)'
      },
      {
        settingKey: 'basic_coupon_amount',
        settingValue: '3000',
        description: '기본 쿠폰 할인 금액 (원)'
      },
      {
        settingKey: 'basic_coupon_percentage',
        settingValue: '10',
        description: '기본 쿠폰 할인율 (%)'
      },
      {
        settingKey: 'event_coupon_percentage',
        settingValue: '30',
        description: '이벤트 쿠폰 할인율 (%)'
      },
      {
        settingKey: 'event_coupon_government_ratio',
        settingValue: '50',
        description: '이벤트 쿠폰 정부 지원 비율 (%)'
      },
      {
        settingKey: 'referral_enabled',
        settingValue: 'true',
        description: '리퍼럴 시스템 활성화 여부'
      },
      {
        settingKey: 'mileage_min_use',
        settingValue: '100',
        description: '마일리지 최소 사용 금액 (원)'
      },
      {
        settingKey: 'mileage_max_use',
        settingValue: '50000',
        description: '마일리지 최대 사용 금액 (원)'
      },
      {
        settingKey: 'qr_expiry_minutes',
        settingValue: '10',
        description: 'QR 코드 만료 시간 (분)'
      }
    ]);

    // 2. 관리자 계정 생성
    console.log('👤 Seeding admin user...');
    await db.insert(users).values([
      {
        email: 'admin@buzz.com',
        name: '시스템 관리자',
        phone: '010-0000-0000',
        role: 'admin',
        mileageBalance: 0,
        referralCode: 'ADMIN001',
        isActive: true
      }
    ]);

    // 3. 샘플 이벤트 생성
    console.log('🎪 Seeding sample events...');
    await db.insert(events).values([
      {
        title: '신규 가입 보너스 이벤트',
        description: '신규 회원가입시 3,000원 마일리지 적립!',
        eventType: 'signup_bonus',
        bonusAmount: 3000,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        isActive: true
      },
      {
        title: '친구 초대 보너스 이벤트',
        description: '친구 초대시 추천인에게 500원, 신규 회원에게 3,000원 적립!',
        eventType: 'referral_bonus',
        bonusAmount: 500,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        isActive: true
      }
    ]);

    // 4. 지역 추천 컨텐츠 생성
    console.log('📍 Seeding regional contents...');
    await db.insert(regionalContents).values([
      {
        title: '남구 대표 맛집 투어',
        content: '남구의 숨은 맛집들을 소개합니다. 전통적인 맛부터 트렌디한 카페까지!',
        contentType: 'tour_course',
        images: JSON.stringify([
          '/images/tour1_1.jpg',
          '/images/tour1_2.jpg'
        ]),
        isFeatured: true,
        displayOrder: 1,
        isActive: true
      },
      {
        title: '남구 포토스팟 BEST 5',
        content: '인스타그램에 올리기 좋은 남구의 아름다운 포토스팟을 소개합니다.',
        contentType: 'photo_spot',
        images: JSON.stringify([
          '/images/photo1_1.jpg',
          '/images/photo1_2.jpg'
        ]),
        isFeatured: true,
        displayOrder: 2,
        isActive: true
      },
      {
        title: '가을 단풍 명소 추천',
        content: '가을철 남구에서 단풍을 감상할 수 있는 최고의 장소들입니다.',
        contentType: 'seasonal_special',
        images: JSON.stringify([
          '/images/autumn1_1.jpg',
          '/images/autumn1_2.jpg'
        ]),
        isFeatured: false,
        displayOrder: 3,
        isActive: true
      }
    ]);

    // 5. 샘플 사업자 및 매장 생성
    console.log('🏪 Seeding sample businesses...');
    const businessUsers = await db.insert(users).values([
      {
        email: 'business1@example.com',
        name: '김사장',
        phone: '010-1111-1111',
        role: 'business',
        mileageBalance: 0,
        referralCode: 'BIZ001',
        isActive: true
      },
      {
        email: 'business2@example.com',
        name: '이대표',
        phone: '010-2222-2222',
        role: 'business',
        mileageBalance: 0,
        referralCode: 'BIZ002',
        isActive: true
      }
    ]).returning({ id: users.id });

    await db.insert(businesses).values([
      {
        userId: businessUsers[0].id,
        businessName: '남구 전통 한식당',
        description: '30년 전통의 정통 한식을 맛볼 수 있는 곳입니다.',
        address: '부산광역시 남구 용소로 123',
        phone: '051-111-1111',
        category: '한식',
        images: JSON.stringify([
          '/images/restaurant1_1.jpg',
          '/images/restaurant1_2.jpg'
        ]),
        businessHours: JSON.stringify({
          monday: { open: '11:00', close: '21:00' },
          tuesday: { open: '11:00', close: '21:00' },
          wednesday: { open: '11:00', close: '21:00' },
          thursday: { open: '11:00', close: '21:00' },
          friday: { open: '11:00', close: '22:00' },
          saturday: { open: '11:00', close: '22:00' },
          sunday: { open: '12:00', close: '20:00' }
        }),
        rating: '4.5',
        reviewCount: 125,
        isApproved: true
      },
      {
        userId: businessUsers[1].id,
        businessName: '모던 카페 브루',
        description: '신선한 원두와 홈메이드 디저트를 즐길 수 있는 모던 카페입니다.',
        address: '부산광역시 남구 수영로 456',
        phone: '051-222-2222',
        category: '카페',
        images: JSON.stringify([
          '/images/cafe1_1.jpg',
          '/images/cafe1_2.jpg'
        ]),
        businessHours: JSON.stringify({
          monday: { open: '08:00', close: '22:00' },
          tuesday: { open: '08:00', close: '22:00' },
          wednesday: { open: '08:00', close: '22:00' },
          thursday: { open: '08:00', close: '22:00' },
          friday: { open: '08:00', close: '23:00' },
          saturday: { open: '09:00', close: '23:00' },
          sunday: { open: '09:00', close: '21:00' }
        }),
        rating: '4.3',
        reviewCount: 89,
        isApproved: true
      }
    ]);

    // 6. 샘플 일반 사용자 생성
    console.log('👥 Seeding sample users...');
    const regularUsers = await db.insert(users).values([
      {
        email: 'user1@example.com',
        name: '김고객',
        phone: '010-3333-3333',
        role: 'user',
        mileageBalance: 15000,
        referralCode: 'USER001',
        isActive: true
      },
      {
        email: 'user2@example.com',
        name: '이회원',
        phone: '010-4444-4444',
        role: 'user',
        mileageBalance: 8500,
        referralCode: 'USER002',
        isActive: true
      },
      {
        email: 'user3@example.com',
        name: '박멤버',
        phone: '010-5555-5555',
        role: 'user',
        mileageBalance: 23500,
        referralCode: 'USER003',
        isActive: true
      }
    ]).returning({ id: users.id });

    // 7. 샘플 마일리지 트랜잭션 생성
    console.log('💰 Seeding sample mileage transactions...');
    await db.insert(mileageTransactions).values([
      // 김고객의 거래 내역
      {
        userId: regularUsers[0].id,
        transactionType: 'earn',
        amount: 3000,
        description: '리퍼럴 가입 보너스',
        referenceType: 'signup',
        referenceId: regularUsers[0].id
      },
      {
        userId: regularUsers[0].id,
        transactionType: 'earn',
        amount: 5000,
        description: '이벤트 보너스 - 신규 가입 보너스 이벤트',
        referenceType: 'event',
        referenceId: 1
      },
      {
        userId: regularUsers[0].id,
        transactionType: 'earn',
        amount: 500,
        description: '리퍼럴 추천 보상 - 이회원님 가입',
        referenceType: 'referral',
        referenceId: regularUsers[1].id
      },
      {
        userId: regularUsers[0].id,
        transactionType: 'use',
        amount: -2000,
        description: '남구 전통 한식당에서 마일리지 사용',
        referenceType: 'mileage_use',
        referenceId: 1
      },
      
      // 이회원의 거래 내역
      {
        userId: regularUsers[1].id,
        transactionType: 'earn',
        amount: 3000,
        description: '리퍼럴 가입 보너스',
        referenceType: 'signup',
        referenceId: regularUsers[1].id
      },
      {
        userId: regularUsers[1].id,
        transactionType: 'earn',
        amount: 2000,
        description: '관리자 조정 - 고객 만족도 보상',
        referenceType: 'admin',
        referenceId: 1
      },
      {
        userId: regularUsers[1].id,
        transactionType: 'use',
        amount: -1500,
        description: '모던 카페 브루에서 마일리지 사용',
        referenceType: 'mileage_use',
        referenceId: 2
      },
      
      // 박멤버의 거래 내역
      {
        userId: regularUsers[2].id,
        transactionType: 'earn',
        amount: 1000,
        description: '가입 보너스',
        referenceType: 'signup',
        referenceId: regularUsers[2].id
      },
      {
        userId: regularUsers[2].id,
        transactionType: 'earn',
        amount: 500,
        description: '리퍼럴 추천 보상 - 다른 회원님 가입',
        referenceType: 'referral',
        referenceId: 999
      },
      {
        userId: regularUsers[2].id,
        transactionType: 'earn',
        amount: 10000,
        description: '이벤트 보너스 - 특별 프로모션',
        referenceType: 'event',
        referenceId: 2
      },
      {
        userId: regularUsers[2].id,
        transactionType: 'earn',
        amount: 15000,
        description: '관리자 조정 - VIP 고객 보상',
        referenceType: 'admin',
        referenceId: 1
      },
      {
        userId: regularUsers[2].id,
        transactionType: 'use',
        amount: -3000,
        description: '남구 전통 한식당에서 마일리지 사용',
        referenceType: 'mileage_use',
        referenceId: 1
      }
    ]);

    // 8. 샘플 리퍼럴 데이터 생성
    console.log('🔗 Seeding sample referrals...');
    await db.insert(referrals).values([
      {
        referrerId: regularUsers[0].id,
        refereeId: regularUsers[1].id,
        referralCode: 'USER001',
        rewardAmount: 500,
        signupBonus: 3000,
        status: 'completed'
      }
    ]);

    console.log('✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

// Run the seed function
if (require.main === module) {
  seed()
    .then(() => {
      console.log('🎉 Seeding finished!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

export { seed };