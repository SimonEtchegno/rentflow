import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';

// Check if access token is set, if not use a dummy one to avoid crashes during development
const accessToken = process.env.MP_ACCESS_TOKEN || 'TEST-dummy-token';
const client = new MercadoPagoConfig({ accessToken, options: { timeout: 5000 } });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, external_reference } = body;

    if (!process.env.MP_ACCESS_TOKEN) {
      console.warn('MP_ACCESS_TOKEN not set. Simulating preference ID.');
      return NextResponse.json({ id: `mock_pref_${Date.now()}` });
    }

    const preference = new Preference(client);
    
    // We need to pass the base URL for the webhook
    // In local dev, this would need ngrok
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const response = await preference.create({
      body: {
        items: items,
        external_reference: external_reference,
        back_urls: {
          success: `${baseUrl}/?status=success`,
          failure: `${baseUrl}/?status=failure`,
          pending: `${baseUrl}/?status=pending`,
        },
        auto_return: 'approved',
        notification_url: `${baseUrl}/api/webhook`
      }
    });

    return NextResponse.json({ id: response.id, init_point: response.init_point });
  } catch (error) {
    console.error('Error creating preference:', error);
    return NextResponse.json({ error: 'Failed to create preference' }, { status: 500 });
  }
}
