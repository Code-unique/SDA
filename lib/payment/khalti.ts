import { paymentConfig } from './config'

export interface KhaltiInitiatePayload {
  return_url: string
  website_url: string
  amount: number
  purchase_order_id: string
  purchase_order_name: string
  customer_info: {
    name: string
    email: string
    phone?: string
  }
  amount_breakdown: Array<{
    label: string
    amount: number
  }>
  product_details: Array<{
    identity: string
    name: string
    total_price: number
    quantity: number
    unit_price: number
  }>
}

export interface KhaltiInitiationResponse {
  pidx: string
  payment_url: string
  expires_at: string
  expires_in: number
  total_amount: number
  status: 'Pending'
}

export async function initiateKhaltiPayment(payload: any) {
  const secret = process.env.KHALTI_SECRET_KEY?.trim();
  
  if (!secret) {
    throw new Error('Khalti secret key is not configured');
  }

  console.log("Khalti Payload:", JSON.stringify(payload, null, 2));
  console.log("Using Khalti Secret Key:", secret?.substring(0, 8) + "...");
  console.log("Khalti API URL:", "https://dev.khalti.com/api/v2/epayment/initiate/");

  try {
    const res = await fetch("https://dev.khalti.com/api/v2/epayment/initiate/", {
      method: "POST",
      headers: {
        "Authorization": `Key ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload)
    });

    const responseText = await res.text();
    console.log("Khalti Response Status:", res.status);
    console.log("Khalti Response:", responseText);

    if (!res.ok) {
      // Try to parse error as JSON, fallback to text
      let errorMessage = responseText;
      try {
        const errorJson = JSON.parse(responseText);
        errorMessage = errorJson.detail || errorJson.error || JSON.stringify(errorJson);
      } catch {
        // Keep the text response if not JSON
      }
      
      throw new Error(`Khalti API Error (${res.status}): ${errorMessage}`);
    }

    // Parse successful response
    const data = JSON.parse(responseText);
    return data;
    
  } catch (error: any) {
    console.error("Khalti Initiation Error:", error);
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to reach Khalti API');
    }
    throw error;
  }
}


// lib/payment/khalti.ts
export async function verifyKhaltiPayment(pidx: string) {
  try {
    const { secretKey, baseUrl } = paymentConfig.khalti
    
    console.log("Khalti Verification - Base URL:", baseUrl);
    console.log("Khalti Verification - PIDX:", pidx);
    console.log("Using Khalti Secret Key:", secretKey.substring(0, 8) + "...");

    if (!pidx || pidx.trim() === '') {
      throw new Error('PIDX is required for verification');
    }

    const response = await fetch(`${baseUrl}/epayment/lookup/`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pidx }),
    })

    let responseData;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      const textResponse = await response.text();
      console.log("Khalti Verification Raw Response:", textResponse);
      
      // Try to parse as JSON even if content-type is wrong
      try {
        responseData = JSON.parse(textResponse);
      } catch {
        throw new Error(`Invalid response format from Khalti: ${textResponse.substring(0, 100)}`);
      }
    }

    console.log("Khalti Verification Response Status:", response.status);
    console.log("Khalti Verification Data:", responseData);

    if (!response.ok) {
      const errorMessage = responseData.detail || responseData.error || responseData.message || 'Khalti verification failed';
      throw new Error(`Khalti API Error (${response.status}): ${errorMessage}`);
    }

    // Validate response structure
    if (!responseData || typeof responseData !== 'object') {
      throw new Error('Invalid response format from Khalti');
    }

    return responseData;
    
  } catch (error: any) {
    console.error('Error verifying Khalti payment:', error);
    
    // Provide more specific error messages
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to reach Khalti API. Please check your internet connection.');
    }
    
    if (error.name === 'SyntaxError') {
      throw new Error('Invalid response format from Khalti API. Please try again.');
    }
    
    // Re-throw the original error with improved message
    throw new Error(error.message || 'Failed to verify Khalti payment');
  }
}