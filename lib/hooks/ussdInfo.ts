/**
 * Hook to get USSD service information
 */
export const useUSSDInfo = () => {
  const ussdCode = process.env.AFRICASTALKING_SHORT_CODE
    ? `*${process.env.AFRICASTALKING_SHORT_CODE}#`
    : '*XXX#';

  const ussdEndpoint = process.env.AFRICASTALKING_USSD_ENDPOINT
    || 'https://yourdomain.com/api/ussd';

  return {
    ussdCode,
    ussdEndpoint,
    // Example usage instructions
    instructions: [
      `Dial ${ussdCode} on your mobile phone`,
      'Follow the menu prompts to access Captain Compost services',
      'Available services:',
      '1. Check account balance',
      '2. Schedule waste collection',
      '3. View impact metrics',
      '4. Buy composting products',
      '5. Customer support'
    ]
  };
};