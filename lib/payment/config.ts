// lib/payment/config.ts
class PaymentConfig {
  private validateKey(key: string | undefined, keyName: string, expectedPrefixes: string[]) {
    if (!key) {
      throw new Error(`Missing ${keyName}`);
    }
    const trimmedKey = key.trim();
    if (!expectedPrefixes.some(prefix => trimmedKey.startsWith(prefix))) {
      throw new Error(`Invalid ${keyName} format. Must start with one of: ${expectedPrefixes.join(', ')}`);
    }
    return trimmedKey;
  }

  get stripe() {
    const publicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY;
    const secretKey = process.env.STRIPE_SECRET_KEY;

    // Allow both test & live keys in all environments
    const validPublicPrefixes = ["pk_test_", "pk_live_"];
    const validSecretPrefixes = ["sk_test_", "sk_live_"];

    if (!publicKey) throw new Error("Missing Stripe public key");
    if (!secretKey) throw new Error("Missing Stripe secret key");

    return {
      publicKey: this.validateKey(publicKey, "Stripe public key", validPublicPrefixes),
      secretKey: this.validateKey(secretKey, "Stripe secret key", validSecretPrefixes),
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET?.trim() || "",
    };
  }

  get khalti() {
    const publicKey = process.env.NEXT_PUBLIC_KHALTI_PUBLIC_KEY;
    const secretKey = process.env.KHALTI_SECRET_KEY;

    // More flexible validation for Khalti
    if (!publicKey || !secretKey) {
      throw new Error('Missing Khalti keys. Please check your environment variables.');
    }

    const trimmedPublicKey = publicKey.trim();
    const trimmedSecretKey = secretKey.trim();

    // Khalti keys don't follow predictable patterns, so remove prefix validation
    if (process.env.NODE_ENV !== 'production') {
      console.log('Khalti Key Check:', {
        publicKey: trimmedPublicKey.substring(0, 8) + '...',
        secretKey: trimmedSecretKey.substring(0, 8) + '...',
        publicKeyLength: trimmedPublicKey.length,
        secretKeyLength: trimmedSecretKey.length
      });
    }

    return {
      publicKey: trimmedPublicKey,
      secretKey: trimmedSecretKey,
      webhookSecret: process.env.KHALTI_WEBHOOK_SECRET?.trim() || '',
      baseUrl: process.env.KHALTI_BASE_URL || 'https://dev.khalti.com/api/v2',
    };
  }

  get currency() {
    return 'USD';
  }

  get nepaliCurrency() {
    return 'NPR';
  }

  get exchangeRate() {
    return 133; // USD to NPR
  }

  get paymentTimeout() {
    return 30 * 60 * 1000; // 30 minutes
  }
}

export const paymentConfig = new PaymentConfig();

export function validatePaymentConfig() {
  const { stripe, khalti } = paymentConfig;

  if (process.env.NODE_ENV === 'production') {
    const required = [
      'STRIPE_SECRET_KEY',
      'KHALTI_SECRET_KEY',
    ];

    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
      throw new Error(`Missing required payment environment variables: ${missing.join(', ')}`);
    }
  }
}

export type PaymentMethod = 'stripe' | 'khalti' | 'free';