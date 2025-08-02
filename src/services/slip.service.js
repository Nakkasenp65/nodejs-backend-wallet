async function validateSlip(imageUrl, transactionId) {
  // ตรวจสลิปแล้วเอา response มา
  // return response.data
  const slipImageFetchResponse = await fetch(imageUrl, { timeout: 15000 });
  const form = new FormData();

  const arrayBuffer = await slipImageFetchResponse.arrayBuffer();
  const imageBuffer = Buffer.from(arrayBuffer);
  const mimeType = slipImageFetchResponse.headers.get('content-type') || 'image/jpeg';

  form.append('file', imageBuffer, {
    filename: `slip_${transactionId}.${mimeType.split('/')[1] || 'jpg'}`, // ตั้งชื่อไฟล์ให้มีความหมาย
    contentType: mimeType, // ระบุประเภทของไฟล์
  });

  const verifyResponse = await fetch(verificationApiUrl, {
    method: 'POST',
    body: form, // body คือ FormData ที่เราสร้างขึ้น (node-fetch จะใส่ Content-Type header ให้เอง)
    timeout: 30000, // ตั้ง Timeout สำหรับการตรวจสอบ 30 วินาที
  });

  const verifyResult = await verifyResponse.json();

  const verifiedAmount = verifyResult?.data?.amount;

  if (typeof verifiedAmount !== 'number' || verifiedAmount <= 0) {
    const errorMessage = `API ตรวจสอบสลิปคืนค่าไม่ถูกต้อง: ${JSON.stringify(verifyResult)}`;
    console.error(`[Verify Slip] ${errorMessage}`);
    throw new Error(errorMessage);
  }

  const verificationApiUrl = 'https://slip2-go.vercel.app/';

  return;
}

export default { validateSlip };
