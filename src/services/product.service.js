import prisma from '../libs/prisma.js';

/**
 * Fetch products with price range + options
 * @param {object} opts
 * @param {number|null} opts.minPrice
 * @param {number|null} opts.maxPrice
 * @param {boolean} [opts.topPerBrand=false]   // show only the best (highest downPayment) per brand
 * @param {number} [opts.take=24]
 * @param {number} [opts.skip=0]
 * @param {"asc"|"desc"} [opts.sort="asc"]     // by downPaymentAmount
 */
export const fetchProducts = async (opts = {}) => {
  const { minPrice = null, maxPrice = null, topPerBrand = false, take = 24, skip = 0, sort = 'asc' } = opts;

  const where = {
    ...(minPrice != null || maxPrice != null
      ? {
          downPaymentAmount: {
            ...(minPrice != null ? { gte: Number(minPrice) } : {}),
            ...(maxPrice != null ? { lte: Number(maxPrice) } : {}),
          },
        }
      : {}),
  };

  // Aggregations for UI (range slider bounds, brand list)
  const [count, rangeAgg, brandsAgg] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.aggregate({
      where,
      _min: { downPaymentAmount: true },
      _max: { downPaymentAmount: true },
    }),
    prisma.product.findMany({
      where,
      distinct: ['brand'],
      select: { brand: true },
      orderBy: { brand: 'asc' },
    }),
  ]);

  // Mode 1: simple list (fast + paginated)
  if (!topPerBrand) {
    const items = await prisma.product.findMany({
      where,
      orderBy: { downPaymentAmount: sort },
      take,
      skip,
    });
    return {
      items,
      total: count,
      facets: {
        minAvailable: rangeAgg._min.downPaymentAmount ?? 0,
        maxAvailable: rangeAgg._max.downPaymentAmount ?? 0,
        brands: brandsAgg.map((b) => b.brand).filter(Boolean),
      },
    };
  }

  // Mode 2: top product per brand (best affordable in each brand)
  // NOTE: Prisma on Mongo doesn't do group-by well for this case with pagination.
  // We do a single big fetch (bounded by where) and reduce in memory.
  // If your dataset is huge, switch to a Mongo aggregation pipeline via $runCommandRaw.
  const rows = await prisma.product.findMany({
    where,
    orderBy: [{ brand: 'asc' }, { downPaymentAmount: 'desc' }],
  });

  const map = new Map(); // brand -> product
  for (const p of rows) {
    if (!map.has(p.brand)) map.set(p.brand, p); // first is highest per brand due to sort
  }
  const perBrand = Array.from(map.values());

  // Apply pagination AFTER grouping
  const items = perBrand
    .sort((a, b) =>
      sort === 'asc' ? a.downPaymentAmount - b.downPaymentAmount : b.downPaymentAmount - a.downPaymentAmount,
    )
    .slice(skip, skip + take);

  return {
    items,
    total: perBrand.length,
    facets: {
      minAvailable: rangeAgg._min.downPaymentAmount ?? 0,
      maxAvailable: rangeAgg._max.downPaymentAmount ?? 0,
      brands: brandsAgg.map((b) => b.brand).filter(Boolean),
    },
  };
};

export default {
  fetchProducts,
};
