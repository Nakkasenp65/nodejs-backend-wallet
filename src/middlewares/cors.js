import cors from 'cors';

export const corsConfig = cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

console.log(corsConfig);
