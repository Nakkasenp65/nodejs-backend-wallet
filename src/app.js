import express from 'express';
const cors = require('cors');
import bodyParser from 'body-parser';
import router from './routes/index.js';
import ApiError from './utils/ApiError.js';
import httpStatus from 'http-status';
import error from './middlewares/error.js';

const app = express();

app.use(bodyParser.json());
app.use(cors());

app.get('/', (req, res) => {
  res.send('Wallet API is running!');
});

// URL/v1
app.use('/v1', router);

app.use(error.errorConverter);
app.use(error.errorHandler);

app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Not found'));
});

export default app;
