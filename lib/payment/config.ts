class PaymentConfig {
  private validateKey(key: string | undefined, keyName: string, allowedPrefixes: string[]) {
    if (!key) throw new Error(`Missing ${keyName}`);
    if (!allowedPrefixes.some(p => key.startsWith(p))) {
      throw new Error(`${keyName} must start with one of: ${allowedPrefixes.join(', ')}`);
    }
  }

  get stripe() {
    const publicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY;
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    const isProdRuntime =
      process.env.NODE_ENV === 'production' && process.env.VERCEL === '1';

    // 🚫 DO NOT VALIDATE DURING BUILD
    if (isProdRuntime) {
      this.validateKey(publicKey, 'Stripe public key', ['pk_live_']);
      this.validateKey(secretKey, 'Stripe secret key', ['sk_live_']);
    } else {
      // Dev-friendly non-breaking warnings
      if (publicKey && !publicKey.startsWith('pk_test_') && !publicKey.startsWith('pk_live_')) {
        console.warn('⚠ Stripe public key should start with pk_test_ in development.');
      }
      if (secretKey && !secretKey.startsWith('sk_test_') && !secretKey.startsWith('sk_live_')) {
        console.warn('⚠ Stripe secret key should start with sk_test_ in development.');
      }
    }

    return {
      publicKey: publicKey?.trim() || '',
      secretKey: secretKey?.trim() || '',
      webhookSecret: webhookSecret?.trim() || '',
    };
  }

  get khalti() {
    const publicKey = process.env.NEXT_PUBLIC_KHALTI_PUBLIC_KEY;
    const secretKey = process.env.KHALTI_SECRET_KEY;

    if (!publicKey || !secretKey) {
      throw new Error('Missing Khalti keys. Please check your environment variables.');
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('Khalti Key Check:', {
        publicKey: publicKey.substring(0, 8) + '...',
        secretKey: secretKey.substring(0, 8) + '...',
        publicKeyLength: publicKey.length,
        secretKeyLength: secretKey.length,
      });
    }

    return {
      publicKey: publicKey.trim(),
      secretKey: secretKey.trim(),
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
    return 133;
  }

  get paymentTimeout() {
    return 30 * 60 * 1000;
  }
}

export const paymentConfig = new PaymentConfig();

export function validatePaymentConfig() {
  if (process.env.NODE_ENV === 'production') {
    const required = ['STRIPE_SECRET_KEY', 'KHALTI_SECRET_KEY'];

    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
      throw new Error(`Missing required payment environment variables: ${missing.join(', ')}`);
    }
  }
}

export type PaymentMethod = 'stripe' | 'khalti' | 'free';
