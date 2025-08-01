// VERSION: SERVER
// import app from './app.js';

// const PORT = process.env.PORT || 3001;

// app.listen(PORT, () => {
//   console.log(`Server is running and listening on http://localhost:${PORT}`);
// });

// VERSION: SERVERLESS
import serverless from 'serverless-http';
import app from './app.js';

// Export the handler function wrapped by serverless-http
export const handler = serverless(app);
