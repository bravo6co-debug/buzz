// 리포트 다운로드 API
import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { reportGenerator } from '../services/reportGenerator.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// 리포트 파일 다운로드
router.get('/download/:fileName', requireAuth, async (req, res) => {
  try {
    const fileName = req.params.fileName;
    
    // 파일명 보안 검증
    if (!fileName || fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      return res.status(400).json({ error: 'Invalid file name' });
    }
    
    // 허용된 파일 확장자 검증
    const allowedExtensions = ['.xlsx', '.pdf'];
    const fileExtension = path.extname(fileName).toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      return res.status(400).json({ error: 'File type not allowed' });
    }
    
    const reportsDir = path.join(process.cwd(), 'reports');
    const filePath = path.join(reportsDir, fileName);
    
    // 파일 존재 여부 확인
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // 파일 정보 가져오기
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;
    
    // Content-Type 설정
    let contentType;
    if (fileExtension === '.xlsx') {
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else if (fileExtension === '.pdf') {
      contentType = 'application/pdf';
    }
    
    // 헤더 설정
    res.set({
      'Content-Type': contentType,
      'Content-Length': fileSize.toString(),
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    // 파일 스트림으로 전송
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    // 로그 기록
    console.log(`Report downloaded by user ${req.user.id}: ${fileName}`);
    
  } catch (error) {
    console.error('Error downloading report:', error);
    res.status(500).json({ error: 'Failed to download report' });
  }
});

// 리포트 목록 조회 (관리자용)
router.get('/list', requireAuth, async (req, res) => {
  try {
    // 관리자만 모든 리포트 목록 조회 가능
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const reportsDir = path.join(process.cwd(), 'reports');
    
    if (!fs.existsSync(reportsDir)) {
      return res.json({ reports: [] });
    }
    
    const files = fs.readdirSync(reportsDir);
    const reports = [];
    
    for (const fileName of files) {
      const filePath = path.join(reportsDir, fileName);
      const stats = fs.statSync(filePath);
      
      // 리포트 파일만 필터링
      const fileExtension = path.extname(fileName).toLowerCase();
      if (['.xlsx', '.pdf'].includes(fileExtension)) {
        reports.push({
          fileName,
          fileSize: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
          type: fileExtension === '.xlsx' ? 'Excel' : 'PDF',
          downloadUrl: reportGenerator.getReportUrl(fileName)
        });
      }
    }
    
    // 최신 파일 순으로 정렬
    reports.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    res.json({ reports });
    
  } catch (error) {
    console.error('Error listing reports:', error);
    res.status(500).json({ error: 'Failed to list reports' });
  }
});

// 오래된 리포트 파일 정리 (관리자용)
router.delete('/cleanup', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    await reportGenerator.cleanupOldReports();
    
    res.json({ message: 'Old reports cleaned up successfully' });
    
  } catch (error) {
    console.error('Error cleaning up reports:', error);
    res.status(500).json({ error: 'Failed to cleanup reports' });
  }
});

export { router as reportsRouter };