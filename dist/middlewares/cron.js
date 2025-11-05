import ApiError from "../utils/ApiError.js";
import httpStatus from "http-status";
export default (req, res, next) => {
    const envQstashToken = process.env.QSTASH_TOKEN;
    if (!envQstashToken)
        throw ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Qstash Token is not provided");
    const { token } = req.body;
    console.log(req);
    console.log("bearerToken: ", bearerToken);
    console.log("QstashToken: ", envQstashToken);
    if (token !== envQstashToken) {
        return res.status(httpStatus.UNAUTHORIZED).send("Unauthorized");
    }
    req.body = null;
    next();
};
//# sourceMappingURL=cron.js.map