import { Router } from 'express';
import { authenticate } from './middleware/auth';
import { apiLimiter } from './middleware/rateLimit';
import { authRouter } from './modules/auth.routes';
import { dashboardRouter } from './modules/dashboard.routes';
import {
  heroRouter, serviceRouter, projectRouter, clientRouter, teamRouter,
  galleryRouter, pageRouter, seoRouter, cmsRelationRouter, settingsRouter, publicRouter,
} from './modules/cms.routes';
import { postRouter, categoryRouter, tagRouter, blogExtraRouter } from './modules/blog.routes';
import { mediaRouter, folderRouter } from './modules/media.routes';
import { leadRouter, dealRouter, contactRouter, crmExtraRouter, publicFormsRouter } from './modules/crm.routes';
import {
  employeeRouter, departmentRouter, leaveTypeRouter, attendanceRouter,
  leaveRouter, payrollRouter, jobRouter, applicationRouter,
} from './modules/hrms.routes';
import { adsRouter, analyticsRouter } from './modules/marketing.routes';
import {
  taskRouter, eventRouter, notificationRouter, messagingRouter, emailTemplateRouter,
  userRouter, auditRouter, backupRouter, reportRouter,
} from './modules/ops.routes';

export const api = Router();

api.get('/health', (_req, res) => res.json({ ok: true, service: 'risenext-api', ts: Date.now() }));

// ── public (website consumption + forms) ──
api.use('/public', publicRouter);
api.use('/public', publicFormsRouter);
api.use('/public/blog', blogExtraRouter);

// ── authentication ──
api.use('/auth', authRouter);

// ── everything below requires a session ──
api.use(apiLimiter, authenticate);

api.use('/dashboard', dashboardRouter);

api.use('/cms/heroes', heroRouter);
api.use('/cms/services', serviceRouter);
api.use('/cms/projects', projectRouter);
api.use('/cms/clients', clientRouter);
api.use('/cms/team', teamRouter);
api.use('/cms/gallery', galleryRouter);
api.use('/cms/pages', pageRouter);
api.use('/cms', cmsRelationRouter);
api.use('/seo', seoRouter);
api.use('/settings', settingsRouter);

api.use('/blog/posts', postRouter);
api.use('/blog/categories', categoryRouter);
api.use('/blog/tags', tagRouter);
api.use('/blog', blogExtraRouter);

api.use('/media', mediaRouter);
api.use('/folders', folderRouter);

api.use('/crm/leads', leadRouter);
api.use('/crm/deals', dealRouter);
api.use('/crm/contacts', contactRouter);
api.use('/crm', crmExtraRouter);

api.use('/hrms/employees', employeeRouter);
api.use('/hrms/departments', departmentRouter);
api.use('/hrms/leave-types', leaveTypeRouter);
api.use('/hrms/attendance', attendanceRouter);
api.use('/hrms/leave', leaveRouter);
api.use('/hrms/payroll', payrollRouter);
api.use('/recruitment/jobs', jobRouter);
api.use('/recruitment/applications', applicationRouter);

api.use('/ads', adsRouter);
api.use('/analytics', analyticsRouter);

api.use('/tasks', taskRouter);
api.use('/calendar', eventRouter);
api.use('/notifications', notificationRouter);
api.use('/messaging/templates', emailTemplateRouter);
api.use('/messaging', messagingRouter);
api.use('/users', userRouter);
api.use('/audit', auditRouter);
api.use('/backups', backupRouter);
api.use('/reports', reportRouter);
