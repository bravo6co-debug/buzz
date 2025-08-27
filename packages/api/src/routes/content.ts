import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '@buzz/database';
import { regionalContents } from '@buzz/database/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { requireRole, optionalAuth } from '../middleware/auth.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validation.js';
import { paginationSchema, idParamSchema } from '../schemas/common.js';
import { createSuccessResponse, createErrorResponse } from '../schemas/common.js';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     RegionalContent:
 *       type: object
 *       properties:
 *         id:
 *           type: number
 *         title:
 *           type: string
 *         content:
 *           type: string
 *         images:
 *           type: array
 *           items:
 *             type: string
 *         contentType:
 *           type: string
 *           enum: [tour_course, photo_spot, seasonal_special]
 *         isFeatured:
 *           type: boolean
 *         displayOrder:
 *           type: number
 *         isActive:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *     
 *     ContentCreateRequest:
 *       type: object
 *       required:
 *         - title
 *         - content
 *         - contentType
 *       properties:
 *         title:
 *           type: string
 *           maxLength: 200
 *         content:
 *           type: string
 *           minLength: 10
 *         images:
 *           type: array
 *           items:
 *             type: string
 *             format: uri
 *           maxItems: 10
 *         contentType:
 *           type: string
 *           enum: [tour_course, photo_spot, seasonal_special]
 *         isFeatured:
 *           type: boolean
 *           default: false
 *         displayOrder:
 *           type: number
 *           default: 0
 */

const contentCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title cannot exceed 200 characters'),
  content: z.string().min(10, 'Content must be at least 10 characters'),
  images: z.array(z.string().url()).max(10, 'Maximum 10 images allowed').optional().default([]),
  contentType: z.enum(['tour_course', 'photo_spot', 'seasonal_special']),
  isFeatured: z.boolean().optional().default(false),
  displayOrder: z.number().int().min(0).optional().default(0)
});

const contentUpdateSchema = contentCreateSchema.partial();

/**
 * @swagger
 * /api/contents/regional:
 *   get:
 *     summary: 지역 추천 컨텐츠 조회
 *     description: 남구 지역 추천 컨텐츠 목록을 조회합니다.
 *     tags: [Content]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [tour_course, photo_spot, seasonal_special]
 *         description: 컨텐츠 타입 필터
 *       - in: query
 *         name: featured
 *         schema:
 *           type: boolean
 *         description: 추천 컨텐츠만 조회
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 12
 *     responses:
 *       200:
 *         description: 컨텐츠 조회 성공
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
 *                     contents:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/RegionalContent'
 *                     featured:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/RegionalContent'
 *                       description: 추천 컨텐츠 (featured=true인 경우만)
 */
router.get('/regional', optionalAuth, validateQuery(paginationSchema.extend({
  type: z.enum(['tour_course', 'photo_spot', 'seasonal_special']).optional(),
  featured: z.boolean().optional()
})), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, type, featured } = req.query as any;
    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [eq(regionalContents.isActive, true)];

    if (type) {
      whereConditions.push(eq(regionalContents.contentType, type));
    }

    if (featured) {
      whereConditions.push(eq(regionalContents.isFeatured, true));
    }

    // Get contents
    const contents = await db
      .select()
      .from(regionalContents)
      .where(and(...whereConditions))
      .orderBy(desc(regionalContents.displayOrder), desc(regionalContents.createdAt))
      .limit(limit)
      .offset(offset);

    // Get featured contents if not filtered by featured
    let featuredContents = [];
    if (!featured) {
      featuredContents = await db
        .select()
        .from(regionalContents)
        .where(
          and(
            eq(regionalContents.isActive, true),
            eq(regionalContents.isFeatured, true),
            ...(type ? [eq(regionalContents.contentType, type)] : [])
          )
        )
        .orderBy(desc(regionalContents.displayOrder), desc(regionalContents.createdAt))
        .limit(6);
    }

    res.json(createSuccessResponse({
      contents,
      ...(featuredContents.length > 0 && { featured: featuredContents }),
      pagination: {
        currentPage: page,
        limit,
        hasMore: contents.length === limit
      }
    }));

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/contents/regional/{id}:
 *   get:
 *     summary: 지역 컨텐츠 상세 조회
 *     description: 특정 지역 컨텐츠의 상세 정보를 조회합니다.
 *     tags: [Content]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 컨텐츠 상세 조회 성공
 *       404:
 *         description: 컨텐츠를 찾을 수 없음
 */
router.get('/regional/:id', optionalAuth, validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const [content] = await db
      .select()
      .from(regionalContents)
      .where(and(eq(regionalContents.id, id), eq(regionalContents.isActive, true)))
      .limit(1);

    if (!content) {
      return res.status(404).json(createErrorResponse('Content not found'));
    }

    // Get related contents (same type, excluding current)
    const relatedContents = await db
      .select()
      .from(regionalContents)
      .where(
        and(
          eq(regionalContents.contentType, content.contentType),
          sql`${regionalContents.id} != ${id}`,
          eq(regionalContents.isActive, true)
        )
      )
      .orderBy(desc(regionalContents.createdAt))
      .limit(4);

    res.json(createSuccessResponse({
      content,
      relatedContents
    }));

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/contents/regional:
 *   post:
 *     summary: 지역 컨텐츠 생성 (관리자용)
 *     description: 새로운 지역 추천 컨텐츠를 생성합니다.
 *     tags: [Content]
 *     security:
 *       - session: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ContentCreateRequest'
 *     responses:
 *       201:
 *         description: 컨텐츠 생성 성공
 *       400:
 *         description: 잘못된 요청 데이터
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 관리자 권한 필요
 */
router.post('/regional', requireRole(['admin']), validateBody(contentCreateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contentData = req.body;

    const [newContent] = await db
      .insert(regionalContents)
      .values({
        ...contentData,
        isActive: true
      })
      .returning();

    res.status(201).json(createSuccessResponse({
      content: newContent
    }, 'Content created successfully'));

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/contents/regional/{id}:
 *   put:
 *     summary: 지역 컨텐츠 수정 (관리자용)
 *     description: 기존 지역 컨텐츠를 수정합니다.
 *     tags: [Content]
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
 *             $ref: '#/components/schemas/ContentCreateRequest'
 *     responses:
 *       200:
 *         description: 컨텐츠 수정 성공
 *       404:
 *         description: 컨텐츠를 찾을 수 없음
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 관리자 권한 필요
 */
router.put('/regional/:id', requireRole(['admin']), validateParams(idParamSchema), validateBody(contentUpdateSchema), async (req: Request, res: Response, next: NextFunction) => {
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

    const [updatedContent] = await db
      .update(regionalContents)
      .set({
        ...cleanedData,
        updatedAt: new Date()
      })
      .where(eq(regionalContents.id, id))
      .returning();

    if (!updatedContent) {
      return res.status(404).json(createErrorResponse('Content not found'));
    }

    res.json(createSuccessResponse({
      content: updatedContent
    }, 'Content updated successfully'));

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/contents/regional/{id}:
 *   delete:
 *     summary: 지역 컨텐츠 삭제 (관리자용)
 *     description: 지역 컨텐츠를 비활성화합니다. (소프트 삭제)
 *     tags: [Content]
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
 *         description: 컨텐츠 삭제 성공
 *       404:
 *         description: 컨텐츠를 찾을 수 없음
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 관리자 권한 필요
 */
router.delete('/regional/:id', requireRole(['admin']), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const [deletedContent] = await db
      .update(regionalContents)
      .set({
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(regionalContents.id, id))
      .returning();

    if (!deletedContent) {
      return res.status(404).json(createErrorResponse('Content not found'));
    }

    res.json(createSuccessResponse({
      content: deletedContent
    }, 'Content deleted successfully'));

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/contents/admin/regional:
 *   get:
 *     summary: 전체 지역 컨텐츠 조회 (관리자용)
 *     description: 관리자가 비활성화된 컨텐츠를 포함한 전체 목록을 조회합니다.
 *     tags: [Content]
 *     security:
 *       - session: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [tour_course, photo_spot, seasonal_special]
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: isFeatured
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
 *         description: 컨텐츠 목록 조회 성공
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 관리자 권한 필요
 */
router.get('/admin/regional', requireRole(['admin']), validateQuery(paginationSchema.extend({
  type: z.enum(['tour_course', 'photo_spot', 'seasonal_special']).optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  search: z.string().optional()
})), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, type, isActive, isFeatured, search } = req.query as any;
    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [];

    if (type) {
      whereConditions.push(eq(regionalContents.contentType, type));
    }

    if (typeof isActive === 'boolean') {
      whereConditions.push(eq(regionalContents.isActive, isActive));
    }

    if (typeof isFeatured === 'boolean') {
      whereConditions.push(eq(regionalContents.isFeatured, isFeatured));
    }

    if (search) {
      whereConditions.push(
        sql`(${regionalContents.title} ILIKE ${`%${search}%`} OR ${regionalContents.content} ILIKE ${`%${search}%`})`
      );
    }

    // Get contents
    const contents = await db
      .select()
      .from(regionalContents)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(regionalContents.displayOrder), desc(regionalContents.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [{ total }] = await db
      .select({ total: sql<number>`COUNT(*)` })
      .from(regionalContents)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    res.json(createSuccessResponse({
      contents,
      pagination: {
        currentPage: page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
        hasMore: contents.length === limit
      }
    }));

  } catch (error) {
    next(error);
  }
});

export default router;