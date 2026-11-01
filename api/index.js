// Vercel-funktio: koko NestJS-backend yhtenä funktiona.
// Koodi käännetään buildissa hakemistoon backend/dist (katso vercel.json).
module.exports = require('../backend/dist/serverless.js').default;
