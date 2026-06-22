const express = require('express');
const tripController = require('../controllers/tripController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All trip routes are protected
router.use(authMiddleware);

// Trip CRUD operations
router.post('/generate', tripController.generateNewTrip);
router.get('/', tripController.getUserTrips);
router.get('/:tripId', tripController.getTripById);
router.put('/:tripId', tripController.updateTrip);
router.delete('/:tripId', tripController.deleteTrip);

// Special operations
router.post('/:tripId/regenerate-day/:dayNumber', tripController.regenerateDay);

module.exports = router;
