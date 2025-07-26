import { pick } from '../utils/pick.js';

const validate = (schema) => (req, res, next) => {
  const objectToValidate = pick(req, Object.keys(schema.describe().keys));

  const { value, error } = schema.validate(objectToValidate, {
    abortEarly: false,
    allowUnknown: true,
  });

  if (error) {
    const errorMessage = error.details.map((details) => details.message).join(', ');
    return res.status(400).json({ message: errorMessage });
  }

  Object.assign(req, value);

  return next();
};

export default validate;
