import express from 'express';
import cors from 'cors';
// import { corsConfig } from './middlewares/cors.js';
import router from './routes/index.js';
import ApiError from './utils/ApiError.js';
import httpStatus from 'http-status';
import error from './middlewares/error.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// URL/v1
app.use('/v1', router);

app.use(error.errorConverter);
app.use(error.errorHandler);

app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Not found'));
});

export default app;
