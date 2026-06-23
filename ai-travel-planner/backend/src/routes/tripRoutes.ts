import express from 'express';
import { createTrip, getTrips, getTripById } from '../controllers/tripController';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

router.post('/', authMiddleware, createTrip);
router.get('/', authMiddleware, getTrips);
router.get('/:id', authMiddleware, getTripById);

export default router;
