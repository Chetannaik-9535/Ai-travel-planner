const Trip = require('../models/Trip');
const User = require('../models/User');

// Helper function: Fetch with exponential backoff retry
async function fetchWithRetry(url, options, retries = 5, delay = 1000) {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      if (response.status === 429 && retries > 0) {
        console.log(`Rate limited. Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return fetchWithRetry(url, options, retries - 1, delay * 2);
      }
      throw new Error(`External API Error: Status Code ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (retries > 0) {
      console.log(`Request failed. Retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 2);
    }
    throw error;
  }
}

// Generate new trip with AI
exports.generateNewTrip = async (req, res) => {
  try {
    const { destination, durationDays, budgetTier, interests } = req.body;
    const userId = req.user.id;

    // Validation
    if (!destination || !durationDays || !budgetTier || !interests || interests.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: destination, durationDays, budgetTier, and interests',
      });
    }

    if (!['Low', 'Medium', 'High'].includes(budgetTier)) {
      return res.status(400).json({
        success: false,
        message: 'Budget tier must be Low, Medium, or High',
      });
    }

    // Create prompt for Gemini API
    const prompt = `You are an expert travel planner. Create a detailed ${durationDays}-day travel itinerary for ${destination}.
    
Budget Preference: ${budgetTier}
Traveler Interests: ${interests.join(', ')}

You MUST respond with ONLY valid JSON (no markdown, no code blocks, just raw JSON) matching this exact structure:
{
  "itinerary": [
    {
      "dayNumber": 1,
      "activities": [
        {
          "title": "Activity Name",
          "description": "Brief description",
          "estimatedCostUSD": 50,
          "timeOfDay": "Morning"
        }
      ]
    }
  ],
  "hotels": [
    {
      "name": "Hotel Name",
      "tier": "Budget",
      "estimatedCostNightUSD": 80,
      "rating": "4.5/5",
      "description": "Brief hotel description"
    }
  ],
  "estimatedBudget": {
    "transport": 300,
    "accommodation": 600,
    "food": 400,
    "activities": 300,
    "total": 1600
  },
  "packingList": [
    {
      "item": "Passport",
      "category": "Documents",
      "isPacked": false
    }
  ]
}

IMPORTANT REQUIREMENTS:
1. Generate exactly ${durationDays} days of itinerary
2. Each day should have 3-5 activities
3. Budget estimates should be realistic for ${budgetTier} tier in ${destination}
4. Include 3-5 hotel recommendations
5. Packing list should have 15-20 items based on destination climate
6. All activities must have estimatedCostUSD values
7. Return ONLY the JSON object, nothing else`;

    console.log('🚀 Generating trip with Gemini API...');

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: 'Gemini API key not configured',
      });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const requestPayload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
      },
    };

    const data = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload),
    });

    // Extract response text
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      throw new Error('Could not extract generation data from response');
    }

    // Parse JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseText);
      throw new Error('Invalid JSON response from AI');
    }

    // Create new trip document
    const newTrip = new Trip({
      userId,
      destination,
      durationDays,
      budgetTier,
      interests,
      itinerary: parsedResponse.itinerary || [],
      hotels: parsedResponse.hotels || [],
      estimatedBudget: parsedResponse.estimatedBudget || {},
      packingList: parsedResponse.packingList || [],
      aiGenerationNotes: `Generated on ${new Date().toISOString()}`,
    });

    await newTrip.save();

    console.log('✅ Trip generated successfully');

    return res.status(201).json({
      success: true,
      message: 'Trip generated successfully',
      trip: newTrip,
    });
  } catch (error) {
    console.error('Trip Generation Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate trip',
      error: error.message,
    });
  }
};

// Get all user trips
exports.getUserTrips = async (req, res) => {
  try {
    const userId = req.user.id;

    const trips = await Trip.find({ userId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: trips.length,
      trips,
    });
  } catch (error) {
    console.error('Get Trips Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch trips',
      error: error.message,
    });
  }
};

// Get single trip by ID (with user isolation check)
exports.getTripById = async (req, res) => {
  try {
    const { tripId } = req.params;
    const userId = req.user.id;

    const trip = await Trip.findOne({ _id: tripId, userId });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found or unauthorized access',
      });
    }

    return res.status(200).json({
      success: true,
      trip,
    });
  } catch (error) {
    console.error('Get Trip Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch trip',
      error: error.message,
    });
  }
};

// Update trip (add/remove activities, modify itinerary)
exports.updateTrip = async (req, res) => {
  try {
    const { tripId } = req.params;
    const userId = req.user.id;
    const updateData = req.body;

    // Verify user owns the trip
    const trip = await Trip.findOne({ _id: tripId, userId });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found or unauthorized access',
      });
    }

    // Update allowed fields
    const allowedUpdates = ['itinerary', 'packingList', 'interests', 'isPublic'];
    Object.keys(updateData).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        trip[key] = updateData[key];
      }
    });

    await trip.save();

    return res.status(200).json({
      success: true,
      message: 'Trip updated successfully',
      trip,
    });
  } catch (error) {
    console.error('Update Trip Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update trip',
      error: error.message,
    });
  }
};

// Delete trip
exports.deleteTrip = async (req, res) => {
  try {
    const { tripId } = req.params;
    const userId = req.user.id;

    const trip = await Trip.findOneAndDelete({ _id: tripId, userId });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found or unauthorized access',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Trip deleted successfully',
    });
  } catch (error) {
    console.error('Delete Trip Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete trip',
      error: error.message,
    });
  }
};

// Regenerate specific day with custom prompt
exports.regenerateDay = async (req, res) => {
  try {
    const { tripId, dayNumber } = req.params;
    const { customPrompt } = req.body;
    const userId = req.user.id;

    const trip = await Trip.findOne({ _id: tripId, userId });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found or unauthorized access',
      });
    }

    const dayNum = parseInt(dayNumber, 10);

    if (dayNum < 1 || dayNum > trip.durationDays) {
      return res.status(400).json({
        success: false,
        message: `Invalid day number. Trip duration is ${trip.durationDays} days.`,
      });
    }

    // Create regeneration prompt
    const regenerationPrompt = `You are an expert travel planner. 
    
The user is traveling to ${trip.destination} for ${trip.durationDays} days with a ${trip.budgetTier} budget.
They are interested in: ${trip.interests.join(', ')}

Please regenerate activities for Day ${dayNum} ${customPrompt ? `with this additional requirement: ${customPrompt}` : ''}.

You MUST respond with ONLY valid JSON (no markdown, no code blocks, just raw JSON):
{
  "dayNumber": ${dayNum},
  "activities": [
    {
      "title": "Activity Name",
      "description": "Brief description",
      "estimatedCostUSD": 50,
      "timeOfDay": "Morning"
    }
  ]
}

Provide 3-5 realistic activities for this day.`;

    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const requestPayload = {
      contents: [{ parts: [{ text: regenerationPrompt }] }],
      generationConfig: {
        temperature: 0.7,
      },
    };

    const data = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload),
    });

    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      throw new Error('Could not extract generation data from response');
    }

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseText);
      throw new Error('Invalid JSON response from AI');
    }

    // Update the specific day
    const dayIndex = trip.itinerary.findIndex((d) => d.dayNumber === dayNum);
    if (dayIndex !== -1) {
      trip.itinerary[dayIndex].activities = parsedResponse.activities;
    }

    await trip.save();

    return res.status(200).json({
      success: true,
      message: `Day ${dayNum} regenerated successfully`,
      trip,
    });
  } catch (error) {
    console.error('Regenerate Day Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to regenerate day',
      error: error.message,
    });
  }
};
