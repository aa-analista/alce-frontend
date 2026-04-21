/**
 * Generic function to send data to an N8N Webhook
 * @param {string} url - The Webhook URL provided by N8N
 * @param {object} data - The payload to send
 * @returns {Promise<any>}
 */
export const handleUpdate = async (url, data) => {
  if (!url) {
    console.error('Webhook URL is missing');
    return { success: false, error: 'Webhook URL is missing' };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...data,
        timestamp: new Date().toISOString(),
        source: 'ALCE-Dashboard'
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error('Error sending updates to N8N:', error);
    return { success: false, error: error.message };
  }
};
