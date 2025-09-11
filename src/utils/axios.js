import axios from "axios";

export const pushMessage = async (data) => {
  try {
    const channelAccessToken = process.env.CHANNEL_ACCESS_TOKEN;
    const config = {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${channelAccessToken}`,
      },
    };
    const response = await axios.post(
      "https://api.line.me/v2/bot/message/push",
      data,
      config,
    );
    return response;
  } catch (error) {
    console.error("[SEND_LINE_FAIL] - ", error);
  }
};

export default {
  pushMessage,
};
