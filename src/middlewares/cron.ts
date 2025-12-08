import { Request, Response, NextFunction } from 'express';
import ApiError from "../utils/ApiError.js";
import httpStatus from "http-status";

export default (req: Request, res: Response, next: NextFunction) => {
    const envQstashToken = process.env.QSTASH_TOKEN;
    if (!envQstashToken) throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Qstash Token is not provided");

    const { token } = req.body;

    console.log(req);
    // console.log("bearerToken: ", bearerToken); // FIXME: bearerToken is not defined
    console.log("QstashToken: ", envQstashToken);

    if (token !== envQstashToken) {
        return res.status(httpStatus.UNAUTHORIZED).send("Unauthorized");
    }

    req.body = null;

    next();
};
