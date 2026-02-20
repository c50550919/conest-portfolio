/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
import { Router } from 'express';
import { matchController } from './matching.controller';
import { authenticateToken, requireFullVerification } from '../../middleware/auth.middleware';

const router = Router();

// All routes require authentication and full verification
router.use(authenticateToken);
router.use(requireFullVerification);

router.get('/find', matchController.findMatches);
router.get('/my-matches', matchController.getMyMatches);
router.get('/compatibility/:targetUserId', matchController.calculateCompatibility);
router.get('/:id', matchController.getMatch);
router.post('/create', matchController.createMatch);
router.post('/:id/respond', matchController.respondToMatch);

export default router;
