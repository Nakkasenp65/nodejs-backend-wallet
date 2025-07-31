import Joi from 'joi';

const getProducts = Joi.object().keys({
  query: Joi.object().keys({
    maxPrice: Joi.number().required(),
  }),
});

export default { getProducts };
