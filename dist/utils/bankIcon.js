const BANK_DATA = {
    ธนาคารกรุงเทพ: { short_name_en: 'BBL', logo_url: 'https://lh3.googleusercontent.com/d/1kvJOSuB70etFoHp14C8vvO7ZGeeYLbL4' },
    ธนาคารกสิกรไทย: { short_name_en: 'KBank', logo_url: 'https://lh3.googleusercontent.com/d/1fHHAJhVwsAsMaoVcTv8pJhxYGJbDrz0Z' },
    ธนาคารกรุงไทย: { short_name_en: 'KTB', logo_url: 'https://lh3.googleusercontent.com/d/1a9Zb5iggbFIyjgPz0DV9uBY0HfRgvy7R' },
    ธนาคารทหารไทย: { short_name_en: 'ttb', logo_url: 'https://lh3.googleusercontent.com/d/1KVeEmkjdEcmisA_t5yQMleiH7fsntMec' },
    ธนาคารไทยพาณิชย์: { short_name_en: 'SCB', logo_url: 'https://lh3.googleusercontent.com/d/1nWr51gJ5F-XZ6dlQ6eFbqF5GIe1af7c5' },
    ธนาคารกรุงศรีอยุธยา: { short_name_en: 'Krungsri', logo_url: 'https://lh3.googleusercontent.com/d/1AiQAHglWScRxFrnT61H_wxSs2K5dt2oU' },
    ธนาคารเกียรตินาคิน: { short_name_en: 'KKP', logo_url: 'https://lh3.googleusercontent.com/d/1O1Yw2zBEeeJ1d8qHFW3TNqI6gBupM84k' },
    ธนาคารซีไอเอ็มบีไทย: { short_name_en: 'CIMB Thai', logo_url: 'https://lh3.googleusercontent.com/d/16OT-Xhkxuha04cypcL45KGAy0i1QA6x7' },
    ธนาคารทิสโก้: { short_name_en: 'TISCO', logo_url: 'https://lh3.googleusercontent.com/d/1qAg6YCOjw1XiNeYXoA0Rc4aRcg9WCKBX' },
    ธนาคารยูโอบี: { short_name_en: 'UOB', logo_url: 'https://lh3.googleusercontent.com/d/1me_pPPqhglwp4XPqoFAAx3Tp-bfMpsC9' },
    'ธนาคารสแตนดาร์ดชาร์เตอร์ด (ไทย)': { short_name_en: 'Standard Chartered', logo_url: 'https://lh3.googleusercontent.com/d/1JR4lirECxzDlzAUE0gbk83sJma4HLaqU' },
    ธนาคารไทยเครดิตเพื่อรายย่อย: { short_name_en: 'Thai Credit', logo_url: 'https://lh3.googleusercontent.com/d/1aEXIY3YlG2ki1T1YbRJAWaQ6OY2_TfZY' },
    'ธนาคารแลนด์ แอนด์ เฮาส์': { short_name_en: 'LH Bank', logo_url: 'https://lh3.googleusercontent.com/d/1fZOWDkv_NtlzQMyZjXtCemGEO4HsHrZG' },
    'ธนาคารไอซีบีซี (ไทย)': { short_name_en: 'ICBC Thai', logo_url: 'https://lh3.googleusercontent.com/d/19cdKtPcGchjJpcJnLzOaDCbiMkwMoakG' },
    ธนาคารพัฒนาวิสาหกิจขนาดกลางและขนาดย่อมแห่งประเทศไทย: { short_name_en: 'SME D Bank', logo_url: 'https://lh3.googleusercontent.com/d/1HlEe4ridMmHiX3vvp7l78gzTgB4mHhaf' },
    ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร: { short_name_en: 'BAAC', logo_url: 'https://lh3.googleusercontent.com/d/1SDEDSm2b2J8cLuBHsovnL5bJwMp6BQoc' },
    ธนาคารเพื่อการส่งออกและนำเข้าแห่งประเทศไทย: { short_name_en: 'EXIM Bank', logo_url: 'https://lh3.googleusercontent.com/d/11ok1ASf9rM0OaIQuYDwfQ67nLjcDc25J' },
    ธนาคารออมสิน: { short_name_en: 'GSB', logo_url: 'https://lh3.googleusercontent.com/d/1PV1A-Zgvcyz7Anj4qyZlSEVESqfOeLcV' },
    ธนาคารอาคารสงเคราะห์: { short_name_en: 'GH Bank', logo_url: 'https://lh3.googleusercontent.com/d/1h438AWBIkci8wAi24IGIc3slNG9-qIY3' },
    ธนาคารอิสลามแห่งประเทศไทย: { short_name_en: 'iBank', logo_url: 'https://lh3.googleusercontent.com/d/14xetcwwsFSFPGPb5WyUEfIOg0eXSd0_q' },
    ธนาคารแห่งประเทศจีน: { short_name_en: 'BOC', logo_url: 'https://lh3.googleusercontent.com/d/1iXQ7JDH07tt51Zw0-tpfIKYvU5yn4J1I' },
    'ธนาคารซูมิโตโม มิตซุย ทรัสต์ (ไทย)': { short_name_en: 'SMTB', logo_url: 'https://lh3.googleusercontent.com/d/1t6qYVjP1swBoC-vMBFx7cani43rLhKUQ' },
    'ธนาคารฮ่องกงและเซี้ยงไฮ้แบงกิ้งคอร์ปอเรชั่น จำกัด': { short_name_en: 'HSBC', logo_url: 'https://lh3.googleusercontent.com/d/1DsaEf8YP7xbSulMhVyQuL5Ve4JeqnU6K' },
};
export default function getBankIconUrl(bankName) {
    return BANK_DATA?.[bankName]?.logo_url ?? null;
}
//# sourceMappingURL=bankIcon.js.map