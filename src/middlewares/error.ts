import { Request, Response, NextFunction } from 'express';
import ApiError from '../utils/ApiError.js';
import httpStatus from 'http-status';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

const errorConverter = (err: any, req: Request, res: Response, next: NextFunction) => {
    let error = err;
    if (!(error instanceof ApiError)) {
        const statusCode = error.statusCode || error instanceof PrismaClientKnownRequestError ? httpStatus.BAD_REQUEST : httpStatus.INTERNAL_SERVER_ERROR;
        // const message = error.message || httpStatus[statusCode];
        error = new ApiError(statusCode, error.message || httpStatus[statusCode], false, err.stack);
    }
    next(error);
};

const errorHandler = (err: ApiError, req: Request, res: Response, next: NextFunction) => {
    console.error(err);
    let { statusCode, message } = err;
    if (process.env.NODE_ENV === 'production' && !err.isOperational) {
        statusCode = httpStatus.INTERNAL_SERVER_ERROR;
        message = httpStatus[httpStatus.INTERNAL_SERVER_ERROR];
    }

    res.locals.errorMessage = err.message;
    const response = {
        code: statusCode,
        message: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    };
    res.status(statusCode).send(response);
};

export default { errorConverter, errorHandler };
