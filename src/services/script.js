import dotenv from 'dotenv';

dotenv.config();

console.log(process.env.GOOGLE_CREDENTIALS_JSON);

const file = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);

console.log(file);
