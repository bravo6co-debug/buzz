import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@buzz/database';
import { users, referrals, mileageTransactions, businesses, systemSettings, events } from '@buzz/database/schema';
import { deviceFingerprints, signupAttempts } from '@buzz/database/schema/deviceFingerprints';
import { eq, and, sql, lte, gte } from 'drizzle-orm';
import { validateBody } from '../middleware/validation.js';
import { signupSchema, loginSchema, businessSignupSchema } from '../schemas/auth.js';
import { createSuccessResponse, createErrorResponse } from '../schemas/common.js';
import { notifyReferralConversion } from './notifications.js';
import { antifraudMiddleware, createRateLimiter, getClientIp } from '../middleware/antifraud.js';

const router = Router();

// Rate limiting: 5 가입 시도/15분
const signupRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: '너무 많은 가입 시도가 감지되었습니다. 15분 후 다시 시도해주세요.',
});

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: 사용자 회원가입
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SignupRequest'
 *     responses:
 *       201:
 *         description: 회원가입 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: 잘못된 요청 데이터
 *       409:
 *         description: 이미 존재하는 이메일
 */
router.post('/signup', signupRateLimiter, antifraudMiddleware, validateBody(signupSchema), async (req: Request, res: Response, next: NextFunction) => {
  let attemptLog: any = null;
  try {
    const { email, password, name, phone, referralCode } = req.body;
    const clientIp = getClientIp(req);
    const sessionId = req.sessionID || 'unknown';
    
    // 가입 시도 로깅 (시작)
    [attemptLog] = await db.insert(signupAttempts)
      .values({
        email,
        phone,
        ipAddress: clientIp,
        fingerprintId: req.fingerprintId,
        status: 'pending',
        referralCode,
        userAgent: req.headers['user-agent'] || '',
        headers: JSON.stringify(req.headers),
        sessionId,
        riskScore: req.antifraud?.riskScore || 0,
        riskFactors: req.antifraud ? JSON.stringify(req.antifraud) : null,
      })
      .returning();

    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingUser.length > 0) {
      return res.status(409).json(createErrorResponse('Email already exists'));
    }

    // Check if phone number already exists (if provided)
    if (phone) {
      const existingPhone = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
      if (existingPhone.length > 0) {
        return res.status(409).json(createErrorResponse('Phone number already exists'));
      }
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate unique referral code for new user
    let newReferralCode;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!isUnique && attempts < maxAttempts) {
      // Create a more user-friendly referral code
      const randomPart = uuidv4().substring(0, 6).toUpperCase();
      const namePrefix = name.substring(0, 2).toUpperCase().replace(/[^A-Z]/g, 'BZ');
      newReferralCode = namePrefix + randomPart;
      
      // Check if code already exists
      const existingCode = await db.select().from(users).where(eq(users.referralCode, newReferralCode)).limit(1);
      isUnique = existingCode.length === 0;
      attempts++;
    }
    
    // Fallback to UUID if all attempts failed
    if (!isUnique) {
      newReferralCode = uuidv4().substring(0, 8).toUpperCase();
    }

    // Start transaction for user creation
    const result = await db.transaction(async (tx) => {
      // Create user
      const [newUser] = await tx.insert(users).values({
        email,
        password: hashedPassword,
        name,
        phone,
        role: 'user',
        referralCode: newReferralCode,
        mileageBalance: 0 // Will be updated based on referral/signup bonus
      }).returning();

      // Get referral settings from system settings
      const referralSettings = await tx.select()
        .from(systemSettings)
        .where(sql`setting_key IN ('referral_reward', 'signup_bonus_default', 'signup_bonus_referral', 'referral_enabled')`);

      const settingsMap = referralSettings.reduce((acc, setting) => {
        acc[setting.settingKey] = setting.settingValue;
        return acc;
      }, {} as Record<string, string>);

      const referralEnabled = settingsMap['referral_enabled'] === 'true';
      const referrerReward = parseInt(settingsMap['referral_reward'] || '500');
      const defaultSignupBonus = parseInt(settingsMap['signup_bonus_default'] || '1000');
      const referralSignupBonus = parseInt(settingsMap['signup_bonus_referral'] || '3000');

      // Check for active signup bonus events
      const now = new Date();
      const activeSignupEvent = await tx.select()
        .from(events)
        .where(and(
          eq(events.eventType, 'signup_bonus'),
          eq(events.isActive, true),
          lte(events.startDate, now),
          gte(events.endDate, now)
        ))
        .orderBy(events.bonusAmount)
        .limit(1);

      // Check for active referral bonus events
      const activeReferralEvent = await tx.select()
        .from(events)
        .where(and(
          eq(events.eventType, 'referral_bonus'),
          eq(events.isActive, true),
          lte(events.startDate, now),
          gte(events.endDate, now)
        ))
        .orderBy(events.bonusAmount)
        .limit(1);

      // Apply event bonuses if available
      let eventSignupBonus = 0;
      let eventReferralBonus = 0;
      let activeEvents = [];
      
      if (activeSignupEvent.length > 0) {
        eventSignupBonus = activeSignupEvent[0].bonusAmount || 0;
        activeEvents.push({
          id: activeSignupEvent[0].id,
          title: activeSignupEvent[0].title,
          type: 'signup_bonus',
          bonus: eventSignupBonus
        });
      }
      
      if (activeReferralEvent.length > 0) {
        eventReferralBonus = activeReferralEvent[0].bonusAmount || 0;
        activeEvents.push({
          id: activeReferralEvent[0].id,
          title: activeReferralEvent[0].title,
          type: 'referral_bonus',
          bonus: eventReferralBonus
        });
      }

      let referralBonus = 0;
      let signupBonus = defaultSignupBonus;
      let totalSignupBonus = 0;
      let totalReferrerReward = referrerReward;

      // Apply event bonuses
      if (eventSignupBonus > 0) {
        signupBonus = Math.max(signupBonus, eventSignupBonus);
      }

      if (eventReferralBonus > 0) {
        totalReferrerReward = Math.max(totalReferrerReward, eventReferralBonus);
      }

      // Handle referral code if provided and referrals are enabled
      if (referralCode && referralEnabled) {
        // Security: Prevent self-referral
        if (referralCode === newReferralCode) {
          throw new Error('자기 자신을 추천할 수 없습니다');
        }

        const referrer = await tx.select().from(users).where(eq(users.referralCode, referralCode)).limit(1);
        
        if (referrer.length > 0) {
          const referrerId = referrer[0].id;

          // Security: Check for duplicate referrals from same referrer within 24 hours
          const recentReferrals = await tx.select()
            .from(referrals)
            .where(and(
              eq(referrals.referrerId, referrerId),
              gte(referrals.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000))
            ));

          if (recentReferrals.length >= 5) {
            throw new Error('추천인이 24시간 내 추천 한도(5명)를 초과했습니다');
          }
          
          // For referral signup, use either referral signup bonus or event bonus (whichever is higher)
          const referralSignupBonusWithEvent = Math.max(referralSignupBonus, eventSignupBonus || 0);
          signupBonus = referralSignupBonusWithEvent;
          referralBonus = signupBonus;
          totalSignupBonus = signupBonus;

          // Create referral record
          await tx.insert(referrals).values({
            referrerId,
            refereeId: newUser.id,
            referralCode,
            rewardAmount: totalReferrerReward,
            signupBonus,
            status: 'completed'
          });

          // Add mileage to referrer (with potential event bonus)
          await tx.update(users)
            .set({ mileageBalance: referrer[0].mileageBalance + totalReferrerReward })
            .where(eq(users.id, referrerId));

          // 리퍼럴 전환 알림 전송 (비동기)
          notifyReferralConversion(referrerId, newUser.id).catch(console.error);

          // Create referrer mileage transaction
          let referrerDescription = `리퍼럴 추천 보상 - ${name}님 가입`;
          if (eventReferralBonus > 0) {
            referrerDescription += ` (이벤트 보너스 포함)`;
          }
          
          await tx.insert(mileageTransactions).values({
            userId: referrerId,
            transactionType: 'earn',
            amount: totalReferrerReward,
            description: referrerDescription,
            referenceType: 'referral',
            referenceId: newUser.id
          });

          // Create referee mileage transaction
          let refereeDescription = '리퍼럴 가입 보너스';
          if (eventSignupBonus > 0) {
            refereeDescription += ` (이벤트 보너스 포함)`;
          }
          
          await tx.insert(mileageTransactions).values({
            userId: newUser.id,
            transactionType: 'earn',
            amount: signupBonus,
            description: refereeDescription,
            referenceType: 'signup',
            referenceId: newUser.id
          });

          // Create additional event bonus transactions if applicable
          if (activeEvents.length > 0) {
            for (const event of activeEvents) {
              if (event.type === 'signup_bonus' && event.bonus > referralSignupBonus) {
                const additionalBonus = event.bonus - referralSignupBonus;
                await tx.insert(mileageTransactions).values({
                  userId: newUser.id,
                  transactionType: 'earn',
                  amount: additionalBonus,
                  description: `이벤트 보너스 - ${event.title}`,
                  referenceType: 'event',
                  referenceId: event.id
                });
              }
              if (event.type === 'referral_bonus' && event.bonus > referrerReward) {
                const additionalBonus = event.bonus - referrerReward;
                await tx.insert(mileageTransactions).values({
                  userId: referrerId,
                  transactionType: 'earn',
                  amount: additionalBonus,
                  description: `이벤트 보너스 - ${event.title}`,
                  referenceType: 'event',
                  referenceId: event.id
                });
                // Update referrer balance with additional bonus
                await tx.update(users)
                  .set({ mileageBalance: referrer[0].mileageBalance + totalReferrerReward + additionalBonus })
                  .where(eq(users.id, referrerId));
              }
            }
          }
        }
      } else {
        // Regular signup bonus (apply event bonus if available)
        totalSignupBonus = signupBonus;
        let signupDescription = '가입 보너스';
        if (eventSignupBonus > 0) {
          signupDescription += ` (이벤트 보너스 포함)`;
        }
        
        await tx.insert(mileageTransactions).values({
          userId: newUser.id,
          transactionType: 'earn',
          amount: totalSignupBonus,
          description: signupDescription,
          referenceType: 'signup',
          referenceId: newUser.id
        });

        // Create additional event bonus transaction if event bonus is higher than default
        if (activeEvents.length > 0) {
          for (const event of activeEvents) {
            if (event.type === 'signup_bonus' && event.bonus > defaultSignupBonus) {
              const additionalBonus = event.bonus - defaultSignupBonus;
              await tx.insert(mileageTransactions).values({
                userId: newUser.id,
                transactionType: 'earn',
                amount: additionalBonus,
                description: `이벤트 보너스 - ${event.title}`,
                referenceType: 'event',
                referenceId: event.id
              });
              totalSignupBonus += additionalBonus;
            }
          }
        }
      }

      // Update user's mileage balance with total bonus (including event bonuses)
      const finalBalance = totalSignupBonus || signupBonus;
      await tx.update(users)
        .set({ mileageBalance: finalBalance })
        .where(eq(users.id, newUser.id));

      return { user: newUser, referralBonus, activeEvents, totalSignupBonus: finalBalance };
    });

    // Create session
    req.session.userId = result.user.id;
    req.session.userRole = 'user';

    const userResponse = {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role,
      mileageBalance: result.totalSignupBonus,
      referralCode: result.user.referralCode
    };

    const responseData: any = {
      user: userResponse
    };

    if (result.referralBonus > 0) {
      responseData.referralBonus = result.referralBonus;
    }

    if (result.activeEvents && result.activeEvents.length > 0) {
      responseData.appliedEvents = result.activeEvents;
    }

    let message = 'Account created successfully';
    if (result.activeEvents && result.activeEvents.length > 0) {
      message += ` with event bonuses applied`;
    }

    // 가입 시도 로깅 (성공)
    await db.update(signupAttempts)
      .set({
        status: 'success',
        completedAt: new Date(),
        referrerId: result.referrerId,
      })
      .where(eq(signupAttempts.id, attemptLog.id));
    
    // 디바이스 핑거프린트 성공 카운트 업데이트
    if (req.fingerprintId) {
      await db.update(deviceFingerprints)
        .set({
          successfulSignups: sql`successful_signups + 1`,
          updatedAt: new Date(),
        })
        .where(eq(deviceFingerprints.id, req.fingerprintId));
    }
    
    res.status(201).json(createSuccessResponse(responseData, message));

  } catch (error) {
    // 가입 시도 로깅 (실패)
    if (attemptLog) {
      await db.update(signupAttempts)
        .set({
          status: 'failed',
          blockedReason: error.message || 'unknown_error',
          completedAt: new Date(),
        })
        .where(eq(signupAttempts.id, attemptLog.id));
    }
    
    next(error);
  }
});

/**
 * @swagger
 * /api/auth/business/signup:
 *   post:
 *     summary: 사업자 회원가입
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BusinessSignupRequest'
 *     responses:
 *       201:
 *         description: 사업자 회원가입 성공
 *       400:
 *         description: 잘못된 요청 데이터
 *       409:
 *         description: 이미 존재하는 이메일
 */
router.post('/business/signup', validateBody(businessSignupSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name, businessName, businessPhone, address, category, description } = req.body;

    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingUser.length > 0) {
      return res.status(409).json(createErrorResponse('Email already exists'));
    }

    // Check if phone number already exists (if provided)
    if (phone) {
      const existingPhone = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
      if (existingPhone.length > 0) {
        return res.status(409).json(createErrorResponse('Phone number already exists'));
      }
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate unique referral code for business
    const newReferralCode = uuidv4().substring(0, 8).toUpperCase();

    // Start transaction for business creation
    const result = await db.transaction(async (tx) => {
      // Create user account
      const [newUser] = await tx.insert(users).values({
        email,
        password: hashedPassword,
        name,
        role: 'business',
        referralCode: newReferralCode,
        mileageBalance: 0
      }).returning();

      // Create business profile
      const [newBusiness] = await tx.insert(businesses).values({
        userId: newUser.id,
        businessName,
        description,
        address,
        phone: businessPhone,
        category,
        images: [],
        businessHours: {},
        rating: 0,
        reviewCount: 0,
        isApproved: false // Requires admin approval
      }).returning();

      return { user: newUser, business: newBusiness };
    });

    // Create session
    req.session.userId = result.user.id;
    req.session.userRole = 'business';

    const userResponse = {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role,
      business: {
        id: result.business.id,
        businessName: result.business.businessName,
        isApproved: result.business.isApproved
      }
    };

    res.status(201).json(createSuccessResponse(
      { user: userResponse },
      'Business account created successfully. Waiting for admin approval.'
    ));

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: 로그인
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: 로그인 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: 잘못된 요청 데이터
 *       401:
 *         description: 이메일 또는 비밀번호가 틀림
 */
router.post('/login', validateBody(loginSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user) {
      return res.status(401).json(createErrorResponse('Invalid email or password'));
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json(createErrorResponse('Account has been deactivated'));
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json(createErrorResponse('Invalid email or password'));
    }

    // Create session
    req.session.userId = user.id;
    req.session.userRole = user.role;

    const userResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      mileageBalance: user.mileageBalance,
      referralCode: user.referralCode
    };

    // If business user, include business info
    if (user.role === 'business') {
      const [business] = await db.select().from(businesses).where(eq(businesses.userId, user.id)).limit(1);
      if (business) {
        (userResponse as any).business = {
          id: business.id,
          businessName: business.businessName,
          isApproved: business.isApproved
        };
      }
    }

    res.json(createSuccessResponse({ user: userResponse }, 'Login successful'));

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: 로그아웃
 *     tags: [Authentication]
 *     security:
 *       - session: []
 *     responses:
 *       200:
 *         description: 로그아웃 성공
 */
router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json(createErrorResponse('Could not log out'));
    }
    res.clearCookie('buzz.sid');
    res.json(createSuccessResponse(null, 'Logout successful'));
  });
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: 현재 사용자 정보 조회
 *     tags: [Authentication]
 *     security:
 *       - session: []
 *     responses:
 *       200:
 *         description: 사용자 정보 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: 인증되지 않은 사용자
 */
router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json(createErrorResponse('Not authenticated'));
    }

    const [user] = await db.select().from(users).where(eq(users.id, req.session.userId)).limit(1);

    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json(createErrorResponse('User not found'));
    }

    const userResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      mileageBalance: user.mileageBalance,
      referralCode: user.referralCode
    };

    // If business user, include business info
    if (user.role === 'business') {
      const [business] = await db.select().from(businesses).where(eq(businesses.userId, user.id)).limit(1);
      if (business) {
        (userResponse as any).business = {
          id: business.id,
          businessName: business.businessName,
          isApproved: business.isApproved,
          category: business.category
        };
      }
    }

    res.json(createSuccessResponse({ user: userResponse }));

  } catch (error) {
    next(error);
  }
});

export default router;