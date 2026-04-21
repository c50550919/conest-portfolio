import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import PlacementController from './placement.controller';
import { authenticateJWT } from '../../middleware/auth.middleware';
import { resolveOrgContext } from '../../middleware/orgContext';

const router = express.Router();

// All placement routes require auth + org context
const orgMiddleware = [authenticateJWT, resolveOrgContext()];

// Multer config for client photo uploads
const uploadDir = path.resolve(__dirname, '../../../uploads/client-photos');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (req, _file, cb) => cb(null, `${req.params.id}.jpg`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files allowed'));
  },
});

// Clients
router.get('/:orgSlug/clients', ...orgMiddleware, PlacementController.getClients);
router.get('/:orgSlug/clients/:id', ...orgMiddleware, PlacementController.getClient);

// Housing units
router.get('/:orgSlug/units', ...orgMiddleware, PlacementController.getUnits);

// Placements
router.get('/:orgSlug/placements', ...orgMiddleware, PlacementController.getPlacements);
router.get('/:orgSlug/placements/:id', ...orgMiddleware, PlacementController.getPlacement);
router.get('/:orgSlug/placements/:id/matches', ...orgMiddleware, PlacementController.getMatches);
router.patch('/:orgSlug/placements/:id/stage', ...orgMiddleware, PlacementController.updateStage);

// Reports
router.get('/:orgSlug/reports/summary', ...orgMiddleware, PlacementController.getReportSummary);

// Client CRUD (bulk-delete MUST be before :id routes)
router.post('/:orgSlug/clients/bulk-delete', ...orgMiddleware, PlacementController.bulkDeleteClients);
router.post('/:orgSlug/clients', ...orgMiddleware, PlacementController.createClient);
router.patch('/:orgSlug/clients/:id', ...orgMiddleware, PlacementController.updateClient);
router.delete('/:orgSlug/clients/:id', ...orgMiddleware, PlacementController.deleteClient);
router.post('/:orgSlug/clients/:id/photo', ...orgMiddleware, upload.single('photo'), PlacementController.uploadClientPhoto);

// Activity events
router.get('/:orgSlug/clients/:clientId/activity', ...orgMiddleware, PlacementController.getActivityEvents);
router.post('/:orgSlug/clients/:clientId/activity', ...orgMiddleware, PlacementController.createActivityEvent);
router.get('/:orgSlug/activity-feed', ...orgMiddleware, PlacementController.getOrgActivityFeed);

// Tasks
router.get('/:orgSlug/tasks/mine', ...orgMiddleware, PlacementController.getMyTasks);
router.get('/:orgSlug/clients/:clientId/tasks', ...orgMiddleware, PlacementController.getClientTasks);
router.post('/:orgSlug/tasks', ...orgMiddleware, PlacementController.createTask);
router.patch('/:orgSlug/tasks/:taskId', ...orgMiddleware, PlacementController.updateTask);
router.post('/:orgSlug/tasks/:taskId/complete', ...orgMiddleware, PlacementController.completeTask);

// Document checklist
router.post('/:orgSlug/placements/:id/documents/toggle', ...orgMiddleware, PlacementController.toggleDocumentItem);

// Dashboard
router.get('/:orgSlug/dashboard', ...orgMiddleware, PlacementController.getDashboardData);

export default router;
