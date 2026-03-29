import express from 'express';
import PlacementController from './placement.controller';
import { authenticateJWT } from '../../middleware/auth.middleware';
import { resolveOrgContext } from '../../middleware/orgContext';

const router = express.Router();

// All placement routes require auth + org context
const orgMiddleware = [authenticateJWT, resolveOrgContext()];

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

export default router;
