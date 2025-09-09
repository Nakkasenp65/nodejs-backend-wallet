import express from 'express';
import cors from 'cors';
// import { corsConfig } from './middlewares/cors.js';
import v1Router from './api/v1/index.js';
import ApiError from './utils/ApiError.js';
import httpStatus from 'http-status';
import error from './middlewares/error.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.status(200).json({ message: 'test backend wallet' });
});
// URL/v1
app.use('/v1', v1Router);
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Not found'));
});

app.use(error.errorConverter);
app.use(error.errorHandler);
export default app;
