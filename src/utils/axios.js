import axios from 'axios';

export const lineAxios = async (url, data) => {
  const channelAccessToken = process.env.CHANNEL_ACCESS_TOKEN;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${channelAccessToken}`,
    },
  };
  const response = await axios.post(url, data, config);
  return response;
};

export default {
  lineAxios,
};
