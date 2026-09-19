import { Router } from 'express';

import courseController from '../controllers/course.controller.js';
import asyncHandler from '../middlewares/asyncHandler.js';

const router = Router();

router.get('/', asyncHandler(courseController.list));
router.get('/directions', asyncHandler(courseController.directions));
router.get('/:id', asyncHandler(courseController.detail));

export default router;
