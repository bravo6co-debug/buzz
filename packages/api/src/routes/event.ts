import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '@buzz/database';
import { events } from '@buzz/database/schema';
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';
import { requireRole, optionalAuth } from '../middleware/auth.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validation.js';
import { paginationSchema, idParamSchema } from '../schemas/common.js';
import { createSuccessResponse, createErrorResponse } from '../schemas/common.js';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Event:
 *       type: object
 *       properties:
 *         id:
 *           type: number
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         eventType:
 *           type: string
 *           enum: [signup_bonus, referral_bonus, special_coupon]
 *         bonusAmount:
 *           type: number
 *         startDate:
 *           type: string
 *           format: date-time
 *         endDate:
 *           type: string
 *           format: date-time
 *         isActive:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *     
 *     EventCreateRequest:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - eventType
 *         - bonusAmount
 *         - startDate
 *         - endDate
 *       properties:
 *         title:
 *           type: string
 *           maxLength: 200
 *         description:
 *           type: string
 *         eventType:
 *           type: string
 *           enum: [signup_bonus, referral_bonus, special_coupon]
 *         bonusAmount:
 *           type: number
 *           minimum: 0
 *         startDate:
 *           type: string
 *           format: date-time
 *         endDate:
 *           type: string
 *           format: date-time
 *       example:
 *         title: "신규 가입 특별 혜택"
 *         description: "2월 한정! 신규 가입하고 5,000원 마일리지 받으세요"
 *         eventType: "signup_bonus"
 *         bonusAmount: 5000
 *         startDate: "2024-02-01T00:00:00Z"
 *         endDate: "2024-02-29T23:59:59Z"
 */

const eventCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title cannot exceed 200 characters'),
  description: z.string().optional(),
  eventType: z.enum(['signup_bonus', 'referral_bonus', 'special_coupon']),
  bonusAmount: z.number().min(0, 'Bonus amount must be non-negative'),
  startDate: z.string().datetime('Invalid start date'),
  endDate: z.string().datetime('Invalid end date')
}).refine(data => new Date(data.endDate) > new Date(data.startDate), {
  message: 'End date must be after start date',
  path: ['endDate']
});

const eventUpdateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title cannot exceed 200 characters').optional(),
  description: z.string().optional(),
  eventType: z.enum(['signup_bonus', 'referral_bonus', 'special_coupon']).optional(),
  bonusAmount: z.number().min(0, 'Bonus amount must be non-negative').optional(),
  startDate: z.string().datetime('Invalid start date').optional(),
  endDate: z.string().datetime('Invalid end date').optional()
});

/**
 * @swagger
 * /api/events/active:
 *   get:
 *     summary: 진행 중인 이벤트 조회
 *     description: 현재 진행 중인 이벤트 목록을 조회합니다.
 *     tags: [Event]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [signup_bonus, referral_bonus, special_coupon]
 *         description: 이벤트 타입 필터
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 50
 *     responses:
 *       200:
 *         description: 진행 중인 이벤트 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     events:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Event'
 */
router.get('/active', optionalAuth, validateQuery(z.object({
  type: z.enum(['signup_bonus', 'referral_bonus', 'special_coupon']).optional(),
  limit: z.string().optional().default('10').transform(val => Math.min(Number(val), 50))
})), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, limit } = req.query as any;
    const now = new Date();

    // Build where conditions for active events
    const whereConditions = [
      eq(events.isActive, true),
      lte(events.startDate, now),
      gte(events.endDate, now)
    ];

    if (type) {
      whereConditions.push(eq(events.eventType, type));
    }

    // Get active events
    const activeEvents = await db
      .select()
      .from(events)
      .where(and(...whereConditions))
      .orderBy(events.startDate)
      .limit(limit);

    res.json(createSuccessResponse({
      events: activeEvents,
      currentTime: now.toISOString()
    }));

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/events:
 *   get:
 *     summary: 이벤트 목록 조회
 *     description: 이벤트 목록을 조회합니다. (종료된 이벤트 포함)
 *     tags: [Event]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [upcoming, active, ended]
 *         description: 이벤트 상태 필터
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [signup_bonus, referral_bonus, special_coupon]
 *         description: 이벤트 타입 필터
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: 이벤트 목록 조회 성공
 */
router.get('/', optionalAuth, validateQuery(paginationSchema.extend({
  status: z.enum(['upcoming', 'active', 'ended']).optional(),
  type: z.enum(['signup_bonus', 'referral_bonus', 'special_coupon']).optional()
})), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, status, type } = req.query as any;
    const offset = (page - 1) * limit;
    const now = new Date();

    // Build where conditions
    const whereConditions = [eq(events.isActive, true)];

    if (type) {
      whereConditions.push(eq(events.eventType, type));
    }

    // Status filter
    if (status === 'upcoming') {
      whereConditions.push(sql`${events.startDate} > ${now}`);
    } else if (status === 'active') {
      whereConditions.push(lte(events.startDate, now));
      whereConditions.push(gte(events.endDate, now));
    } else if (status === 'ended') {
      whereConditions.push(sql`${events.endDate} < ${now}`);
    }

    // Get events
    const eventList = await db
      .select()
      .from(events)
      .where(and(...whereConditions))
      .orderBy(desc(events.startDate))
      .limit(limit)
      .offset(offset);

    // Add status to each event
    const eventsWithStatus = eventList.map(event => {
      let eventStatus = 'ended';
      if (now < event.startDate) {
        eventStatus = 'upcoming';
      } else if (now >= event.startDate && now <= event.endDate) {
        eventStatus = 'active';
      }

      return {
        ...event,
        status: eventStatus
      };
    });

    res.json(createSuccessResponse({
      events: eventsWithStatus,
      pagination: {
        currentPage: page,
        limit,
        hasMore: eventList.length === limit
      }
    }));

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/events/{id}:
 *   get:
 *     summary: 이벤트 상세 조회
 *     description: 특정 이벤트의 상세 정보를 조회합니다.
 *     tags: [Event]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 이벤트 상세 조회 성공
 *       404:
 *         description: 이벤트를 찾을 수 없음
 */
router.get('/:id', optionalAuth, validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const [event] = await db
      .select()
      .from(events)
      .where(and(eq(events.id, id), eq(events.isActive, true)))
      .limit(1);

    if (!event) {
      return res.status(404).json(createErrorResponse('Event not found'));
    }

    // Determine event status
    const now = new Date();
    let status = 'ended';
    if (now < event.startDate) {
      status = 'upcoming';
    } else if (now >= event.startDate && now <= event.endDate) {
      status = 'active';
    }

    res.json(createSuccessResponse({
      event: {
        ...event,
        status
      }
    }));

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/events:
 *   post:
 *     summary: 이벤트 생성 (관리자용)
 *     description: 새로운 이벤트를 생성합니다.
 *     tags: [Event]
 *     security:
 *       - session: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EventCreateRequest'
 *     responses:
 *       201:
 *         description: 이벤트 생성 성공
 *       400:
 *         description: 잘못된 요청 데이터
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 관리자 권한 필요
 */
router.post('/', requireRole(['admin']), validateBody(eventCreateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eventData = req.body;

    const [newEvent] = await db
      .insert(events)
      .values({
        title: eventData.title,
        description: eventData.description,
        eventType: eventData.eventType,
        bonusAmount: eventData.bonusAmount,
        startDate: new Date(eventData.startDate),
        endDate: new Date(eventData.endDate),
        isActive: true
      })
      .returning();

    res.status(201).json(createSuccessResponse({
      event: newEvent
    }, 'Event created successfully'));

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/events/{id}:
 *   put:
 *     summary: 이벤트 수정 (관리자용)
 *     description: 기존 이벤트를 수정합니다.
 *     tags: [Event]
 *     security:
 *       - session: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EventCreateRequest'
 *     responses:
 *       200:
 *         description: 이벤트 수정 성공
 *       404:
 *         description: 이벤트를 찾을 수 없음
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 관리자 권한 필요
 */
router.put('/:id', requireRole(['admin']), validateParams(idParamSchema), validateBody(eventUpdateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove undefined values
    const cleanedData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    );

    if (Object.keys(cleanedData).length === 0) {
      return res.status(400).json(createErrorResponse('No valid fields to update'));
    }

    // Convert date strings to Date objects
    if (cleanedData.startDate) {
      cleanedData.startDate = new Date(cleanedData.startDate as string);
    }
    if (cleanedData.endDate) {
      cleanedData.endDate = new Date(cleanedData.endDate as string);
    }

    const [updatedEvent] = await db
      .update(events)
      .set(cleanedData)
      .where(eq(events.id, id))
      .returning();

    if (!updatedEvent) {
      return res.status(404).json(createErrorResponse('Event not found'));
    }

    res.json(createSuccessResponse({
      event: updatedEvent
    }, 'Event updated successfully'));

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/events/{id}/toggle:
 *   post:
 *     summary: 이벤트 활성화/비활성화 (관리자용)
 *     description: 이벤트의 활성화 상태를 토글합니다.
 *     tags: [Event]
 *     security:
 *       - session: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 이벤트 상태 변경 성공
 *       404:
 *         description: 이벤트를 찾을 수 없음
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 관리자 권한 필요
 */
router.post('/:id/toggle', requireRole(['admin']), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Get current event
    const [currentEvent] = await db.select().from(events).where(eq(events.id, id)).limit(1);

    if (!currentEvent) {
      return res.status(404).json(createErrorResponse('Event not found'));
    }

    // Toggle active status
    const [updatedEvent] = await db
      .update(events)
      .set({ isActive: !currentEvent.isActive })
      .where(eq(events.id, id))
      .returning();

    res.json(createSuccessResponse({
      event: updatedEvent,
      action: updatedEvent.isActive ? 'activated' : 'deactivated'
    }, `Event ${updatedEvent.isActive ? 'activated' : 'deactivated'} successfully`));

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/events/admin/all:
 *   get:
 *     summary: 전체 이벤트 조회 (관리자용)
 *     description: 관리자가 비활성화된 이벤트를 포함한 전체 목록을 조회합니다.
 *     tags: [Event]
 *     security:
 *       - session: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [upcoming, active, ended]
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [signup_bonus, referral_bonus, special_coupon]
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: 이벤트 목록 조회 성공
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 관리자 권한 필요
 */
router.get('/admin/all', requireRole(['admin']), validateQuery(paginationSchema.extend({
  status: z.enum(['upcoming', 'active', 'ended']).optional(),
  type: z.enum(['signup_bonus', 'referral_bonus', 'special_coupon']).optional(),
  isActive: z.boolean().optional(),
  search: z.string().optional()
})), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, status, type, isActive, search } = req.query as any;
    const offset = (page - 1) * limit;
    const now = new Date();

    // Build where conditions
    const whereConditions = [];

    if (type) {
      whereConditions.push(eq(events.eventType, type));
    }

    if (typeof isActive === 'boolean') {
      whereConditions.push(eq(events.isActive, isActive));
    }

    if (search) {
      whereConditions.push(
        sql`(${events.title} ILIKE ${`%${search}%`} OR ${events.description} ILIKE ${`%${search}%`})`
      );
    }

    // Status filter
    if (status === 'upcoming') {
      whereConditions.push(sql`${events.startDate} > ${now}`);
    } else if (status === 'active') {
      whereConditions.push(lte(events.startDate, now));
      whereConditions.push(gte(events.endDate, now));
    } else if (status === 'ended') {
      whereConditions.push(sql`${events.endDate} < ${now}`);
    }

    // Get events
    const eventList = await db
      .select()
      .from(events)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(events.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [{ total }] = await db
      .select({ total: sql<number>`COUNT(*)` })
      .from(events)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    // Add status to each event
    const eventsWithStatus = eventList.map(event => {
      let eventStatus = 'ended';
      if (now < event.startDate) {
        eventStatus = 'upcoming';
      } else if (now >= event.startDate && now <= event.endDate) {
        eventStatus = 'active';
      }

      return {
        ...event,
        status: eventStatus
      };
    });

    res.json(createSuccessResponse({
      events: eventsWithStatus,
      pagination: {
        currentPage: page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
        hasMore: eventList.length === limit
      }
    }));

  } catch (error) {
    next(error);
  }
});

export default router;