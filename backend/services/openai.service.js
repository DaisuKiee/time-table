const OpenAI = require('openai');
const Subject = require('../models/Subject.model');
const Faculty = require('../models/Faculty.model');
const Room = require('../models/Room.model');
const Schedule = require('../models/Schedule.model');

// Initialize OpenAI clients with fallback API keys
const API_KEYS = [
  process.env.OPENAI_API_KEY,
  process.env.OPENAI_API_KEY_2,
  process.env.OPENAI_API_KEY_3,
  process.env.OPENAI_API_KEY_4,
  process.env.OPENAI_API_KEY_5,
].filter(Boolean); // Remove undefined keys

let currentKeyIndex = 0;
const keyFailureCount = new Map();
const MAX_FAILURES_PER_KEY = 3;

/**
 * Get next available API key with rotation
 */
const getNextApiKey = () => {
  const startIndex = currentKeyIndex;
  
  // Try to find a working key
  do {
    const key = API_KEYS[currentKeyIndex];
    const failures = keyFailureCount.get(currentKeyIndex) || 0;
    
    if (failures < MAX_FAILURES_PER_KEY) {
      return { key, index: currentKeyIndex };
    }
    
    currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  } while (currentKeyIndex !== startIndex);
  
  // All keys have failed, reset and try again
  keyFailureCount.clear();
  return { key: API_KEYS[0], index: 0 };
};

/**
 * Mark a key as failed
 */
const markKeyAsFailed = (index) => {
  const failures = (keyFailureCount.get(index) || 0) + 1;
  keyFailureCount.set(index, failures);
  currentKeyIndex = (index + 1) % API_KEYS.length;
};

/**
 * Load context data from database for RAG
 */
const loadContextData = async () => {
  try {
    const [subjects, faculty, rooms, schedules] = await Promise.all([
      Subject.find().lean(),
      Faculty.find().lean(),
      Room.find().lean(),
      Schedule.find({ isActive: true }).populate('faculty subject room section').lean(),
    ]);

    return { subjects, faculty, rooms, schedules };
  } catch (error) {
    console.error('Error loading context data:', error);
    return { subjects: [], faculty: [], rooms: [], schedules: [] };
  }
};

/**
 * Build system prompt with RAG context
 */
const getSystemPrompt = (context) => {
  const { subjects = [], faculty = [], rooms = [], schedules = [] } = context;

  // Build faculty experience data
  const facultyInfo = faculty.map(f => {
    // Calculate teaching history for specific subjects
    const teachingHistory = schedules
      .filter(s => s.faculty && s.faculty._id.toString() === f._id.toString())
      .reduce((acc, schedule) => {
        const subjectName = schedule.subject?.name || 'Unknown';
        if (!acc[subjectName]) {
          acc[subjectName] = { count: 0, years: new Set() };
        }
        acc[subjectName].count++;
        if (schedule.createdAt) {
          acc[subjectName].years.add(new Date(schedule.createdAt).getFullYear());
        }
        return acc;
      }, {});

    const experienceSummary = Object.entries(teachingHistory)
      .map(([subject, data]) => `${subject} (${data.years.size} years, ${data.count} classes)`)
      .join(', ');

    return `${f.name} (${f.email}) - Specialization: ${f.specialization || 'General'}, Experience: ${experienceSummary || 'No teaching history'}, Rating: ${f.averageRating || 'N/A'}/5, Load: ${f.currentLoad || 0}/${f.maxLoad || 24} units`;
  }).join('\n');

  const subjectInfo = subjects.map(s => 
    `${s.code} - ${s.name} (${s.units} units, ${s.yearLevel} ${s.semester})`
  ).join('\n');

  const roomInfo = rooms.map(r => 
    `${r.name} - ${r.building}, Capacity: ${r.capacity}, Type: ${r.type || 'Regular'}`
  ).join('\n');

  return `You are an AI assistant for a Faculty Timetabling and Information System. You help users with scheduling, faculty recommendations, and general queries about the system.

**YOUR CAPABILITIES:**
- Answer questions about faculty, subjects, rooms, and schedules
- Recommend faculty based on their teaching experience and specialization
- Provide scheduling suggestions based on constraints
- Support multilingual conversations (English, Filipino, Spanish, etc.)
- Analyze teaching loads and availability

**CONTEXT DATA:**
Subjects (${subjects.length}):
${subjectInfo || 'No subjects available'}

Faculty (${faculty.length}):
${facultyInfo || 'No faculty available'}

Rooms (${rooms.length}):
${roomInfo || 'No rooms available'}

Active Schedules: ${schedules.length}

**FACULTY RECOMMENDATION PRIORITY:**
When recommending faculty for a subject:
1. **Teaching Experience (HIGHEST PRIORITY)**: Prioritize faculty who have taught this specific subject before, especially those with multiple years of experience
2. **Specialization Match**: Consider if their specialization aligns with the subject
3. **Current Load**: Ensure they have available units (not exceeding maxLoad)
4. **Rating**: Consider their average student rating
5. **Recency**: Prefer faculty who taught the subject recently

**RESPONSE GUIDELINES:**
- Be concise and helpful
- Provide specific recommendations with reasoning
- Detect the user's language and respond in the same language
- If data is missing, acknowledge it clearly
- Format lists and important information clearly
- Always explain WHY you recommend a particular faculty member`;
};

/**
 * Generate chat response using OpenAI with RAG context
 */
const generateChatResponse = async (userMessage, context = {}, conversationHistory = []) => {
  if (API_KEYS.length === 0) {
    return {
      success: false,
      message: "OpenAI API keys not configured. Please add OPENAI_API_KEY to your .env file.",
      error: 'No API keys available',
    };
  }

  let lastError = null;
  let currentAttemptIndex = 0;

  while (currentAttemptIndex < API_KEYS.length) {
    try {
      const { key, index } = getNextApiKey();
      console.log(`\nAttempting with OpenAI API key ${index + 1}/${API_KEYS.length}`);
      currentAttemptIndex++;

      const openai = new OpenAI({ apiKey: key });
      const systemContext = getSystemPrompt(context);

      // Build conversation messages
      const messages = [
        { role: 'system', content: systemContext },
        ...conversationHistory
          .filter(msg => msg.role === 'user' || msg.role === 'assistant')
          .filter(msg => !msg.content.includes('👋 Hello')) // Exclude greeting
          .map(msg => ({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.content,
          })),
        { role: 'user', content: userMessage },
      ];

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1024,
        top_p: 0.95,
      });

      const text = response.choices[0]?.message?.content || '';

      console.log(`✓ Success with OpenAI API key ${index + 1}`);
      
      return {
        success: true,
        message: text,
        keyUsed: index + 1,
        totalKeys: API_KEYS.length,
      };

    } catch (error) {
      lastError = error;
      const errorMessage = error.message || 'Unknown error';
      console.error(`✗ OpenAI API key ${currentAttemptIndex} failed:`, errorMessage);

      // Mark key as failed on rate limit or auth errors
      if (
        errorMessage.includes('429') ||
        errorMessage.includes('quota') ||
        errorMessage.includes('rate_limit') ||
        errorMessage.includes('insufficient_quota') ||
        errorMessage.includes('401') ||
        errorMessage.includes('invalid_api_key')
      ) {
        markKeyAsFailed(currentAttemptIndex - 1);
      }

      // Stop trying on invalid argument errors
      if (errorMessage.includes('invalid_request_error') || errorMessage.includes('model_not_found')) {
        break;
      }
    }
  }

  console.log('\nAll OpenAI API keys exhausted\n');

  return {
    success: false,
    message: "I apologize, but I'm temporarily unable to process your request. Please try again in a moment.",
    error: lastError?.message || 'All API keys failed',
    keyUsed: null,
    totalKeys: API_KEYS.length,
  };
};

/**
 * Recommend faculty for a specific subject using RAG
 */
const recommendFacultyForSubject = async (subjectId) => {
  try {
    const context = await loadContextData();
    const subject = await Subject.findById(subjectId);

    if (!subject) {
      return {
        success: false,
        message: 'Subject not found',
      };
    }

    // Find faculty who have taught this subject before
    const facultyExperience = await Promise.all(
      context.faculty.map(async (faculty) => {
        const teachingHistory = context.schedules.filter(
          s => s.faculty && s.subject &&
               s.faculty._id.toString() === faculty._id.toString() &&
               s.subject._id.toString() === subjectId
        );

        const years = new Set(
          teachingHistory.map(s => new Date(s.createdAt).getFullYear())
        );

        const totalTeachingHistory = context.schedules.filter(
          s => s.faculty && s.faculty._id.toString() === faculty._id.toString()
        );

        // Calculate recommendation score
        const subjectExperience = years.size; // Years teaching this specific subject
        const totalExperience = totalTeachingHistory.length;
        const rating = faculty.averageRating || 0;
        const hasAvailableLoad = (faculty.currentLoad || 0) + subject.units <= (faculty.maxLoad || 24);
        
        // Priority: Teaching experience > Specialization > Rating > Load
        const score = 
          (subjectExperience * 10) + // Highest weight for subject-specific experience
          (totalExperience * 2) +
          (rating * 5) +
          (hasAvailableLoad ? 5 : 0);

        return {
          faculty,
          subjectExperience,
          totalExperience,
          score,
          hasAvailableLoad,
        };
      })
    );

    // Sort by score and filter available faculty
    const recommendations = facultyExperience
      .filter(f => f.hasAvailableLoad)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    if (recommendations.length === 0) {
      return {
        success: false,
        message: `No faculty available for ${subject.name}. All faculty have reached their maximum load.`,
      };
    }

    const recommendationText = recommendations
      .map((rec, idx) => {
        const exp = rec.subjectExperience > 0
          ? `Taught this subject for ${rec.subjectExperience} year(s)`
          : 'No prior experience with this subject';
        
        return `${idx + 1}. ${rec.faculty.name}\n   - ${exp}\n   - Rating: ${rec.faculty.averageRating || 'N/A'}/5\n   - Available Load: ${(rec.faculty.maxLoad || 24) - (rec.faculty.currentLoad || 0)} units\n   - Score: ${rec.score.toFixed(1)}`;
      })
      .join('\n\n');

    return {
      success: true,
      message: `Top faculty recommendations for ${subject.name} (${subject.code}):\n\n${recommendationText}`,
      recommendations: recommendations.map(r => r.faculty),
    };

  } catch (error) {
    console.error('Error recommending faculty:', error);
    return {
      success: false,
      message: 'Error generating faculty recommendations',
      error: error.message,
    };
  }
};

module.exports = {
  generateChatResponse,
  recommendFacultyForSubject,
  loadContextData,
};
