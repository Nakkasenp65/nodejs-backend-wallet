import prisma from '../libs/prisma.js';

const fetchProducts = async (maxPrice) => {
  console.log(maxPrice);
  const intMaxPrice = Number(maxPrice);

  const distinctBrands = await prisma.product.findMany({
    distinct: ['brand'],
    where: {
      downPaymentAmount: {
        lte: intMaxPrice,
      },
    },
    select: {
      brand: true,
    },
  });

  if (distinctBrands.length === 0) {
    console.log('No products found within the specified price range.');
    return [];
  }

  const brandNames = distinctBrands.map((item) => item.brand);

  const productQueries = brandNames.map((brandName) =>
    prisma.product.findMany({
      where: {
        brand: brandName,
        downPaymentAmount: {
          lte: intMaxPrice,
        },
      },
      orderBy: {
        downPaymentAmount: 'desc',
      },
    }),
  );

  const results = await Promise.all(productQueries);
  const allProducts = results.flat();

  console.log(`✅ Fetched a total of ${allProducts.length} products with max down payment of ${intMaxPrice}.`);
  return allProducts;
};

export default {
  fetchProducts,
};
