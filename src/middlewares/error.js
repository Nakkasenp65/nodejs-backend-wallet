import ApiError from '../utils/ApiError.js';
import httpStatus from 'http-status';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

const errorConverter = (err, req, res, next) => {
  let error = err;
  if (!(error instanceof ApiError)) {
    const statusCode =
      error.statusCode || error instanceof PrismaClientKnownRequestError
        ? httpStatus.BAD_REQUEST
        : httpStatus.INTERNAL_SERVER_ERROR;
    // const message = error.message || httpStatus[statusCode];
    const message = error.message;
    error = new ApiError(statusCode, error.message, false, err.stack);
  }
  next(error);
};

const errorHandler = (err, req, res, next) => {
  console.log('ERROR CAUGHT: ', err);
  let { statusCode, message } = err;

  res.locals.errorMessage = err.message;

  const response = {
    code: statusCode,
    message: message,
  };

  res.status(statusCode).send(response);
};

export default { errorConverter, errorHandler };
