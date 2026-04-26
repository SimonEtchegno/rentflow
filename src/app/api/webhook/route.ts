import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { updateExpenseStatus } from '@/lib/db';

const accessToken = process.env.MP_ACCESS_TOKEN || 'TEST-dummy-token';
const client = new MercadoPagoConfig({ accessToken });

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type') || url.searchParams.get('topic');
    const id = url.searchParams.get('data.id') || url.searchParams.get('id');

    if (type === 'payment' && id) {
      const payment = new Payment(client);
      const paymentInfo = await payment.get({ id });

      if (paymentInfo.status === 'approved') {
        const externalReference = paymentInfo.external_reference;
        if (externalReference) {
          // In our implementation, external_reference is the expense ID
          updateExpenseStatus(externalReference, 'paid');
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
