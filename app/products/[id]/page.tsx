import { useState } from 'react';
import { useMpesa } from '@/lib/hooks/useMpesa';
import { useRouter, usePathname } from 'next/navigation';

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const pathname = usePathname();
  const { id } = params;

  // Sample product data - in a real app, this would come from the database
  const productData: Record<string, any> = {
    '1': {
      id: '1',
      name: 'Home Composter Basic',
      description: 'Perfect for beginners - compact indoor composting system',
      price: 2500,
      image: '/images/composter-basic.jpg',
    },
    '2': {
      id: '2',
      name: 'Garden Composter Deluxe',
      description: 'Large capacity for backyard composting',
      price: 5500,
      image: '/images/composter-deluxe.jpg',
    },
    '3': {
      id: '3',
      name: 'Worm Farm Kit',
      description: 'Vermicomposting system for rich fertilizer',
      price: 3200,
      image: '/images/worm-farm.jpg',
    },
    '4': {
      id: '4',
      name: 'Compost Thermometer',
      description: 'Monitor your compost temperature for optimal results',
      price: 800,
      image: '/images/thermometer.jpg',
    },
  };

  const product = productData[id] || {
    id,
    name: 'Product Not Found',
    description: 'We could not find this product.',
    price: 0,
    image: '/images/placeholder.jpg',
  };

  const { initiateStkPush, loading, error, result, reset } = useMpesa();
  const [phoneNumber, setPhoneNumber] = useState('');

  const handleCheckout = async () => {
    if (!phoneNumber) {
      alert('Please enter your phone number');
      return;
    }

    // Validate phone number format (Kenyan format)
    const phoneRegex = /^(\+254|0)?[1-9][0-9]{8}$/;
    if (!phoneRegex.match(phoneNumber)) {
      alert('Please enter a valid Kenyan phone number');
      return;
    }

    try {
      const paymentResult = await initiateStkPush({
        phoneNumber,
        amount: product.price,
        accountReference: `COMPOST-${product.id}-${Date.now()}`,
        transactionDesc: `Purchase of ${product.name}`,
      });

      if (paymentResult) {
        // In a real app, you would redirect to a payment status page
        // or show a success message and wait for the callback
        alert(
          `Payment initiated successfully!\n\n` +
          `Checkout Request ID: ${paymentResult.CheckoutRequestID}\n\n` +
          `Please complete the payment on your phone.`
        );
        // Reset form
        reset();
        setPhoneNumber('');
      }
    } catch (err) {
      // Error is already handled by the hook
      console.error('Checkout error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link
                href="/products"
                className="flex items-center text-sm font-medium text-gray-900 hover:text-gray-600"
              >
                ← Back to Products
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="pt-16 pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="lg:col-span-1">
              <div className="h-96 rounded-lg overflow-hidden">
                {/* In a real app, you'd use next/image here */}
                <img
                  src={product.image}
                  alt={product.name}
                  className="object-cover w-full h-full"
                />
              </div>
            </div>

            <div className="lg:col-span-1 space-y-6">
              <div className="space-y-4">
                <h1 className="text-3xl font-bold">{product.name}</h1>
                <p className="text-lg text-muted-foreground">
                  KES {product.price.toLocaleString()}
                </p>
                <p className="text-muted-foreground line-clamp-4">
                  {product.description}
                </p>

                {/* Checkout Form */}
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold">Checkout</h2>
                  <div className="space-y-3">
                    <label htmlFor="phone" className="block text-sm font-medium text-muted-foreground">
                      Phone Number (for M-Pesa payment)
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="e.g., 0712345678 or +254712345678"
                      className="w-full px-4 py-2 rounded-border border-input bg-background focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
                      disabled={loading}
                    />
                    {loading && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Processing payment...
                      </p>
                    )}
                    {!loading && error && (
                      <p className="text-sm text-destructive">
                        {error.message}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={handleCheckout}
                    disabled={loading || !phoneNumber}
                    className="w-full flex justify-center items-center rounded-border bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Pay with M-Pesa'}
                  </button>
                </div>
              </div>

              {/* Payment Status */}
              {result && (
                <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
                  <h3 className="font-semibold mb-2">Payment Initiated</h3>
                  <p className="text-sm">
                    Your payment request has been sent to your phone. Please
                    enter your M-Pesa PIN to complete the transaction.
                  </p>
                  <div className="mt-3 space-y-1 text-xs">
                    <div>
                      <span className="font-medium">Checkout Request ID:</span>
                      <span className="ml-2">{result.CheckoutRequestID}</span>
                    </div>
                    <div>
                      <span className="font-medium">Merchant Request ID:</span>
                      <span className="ml-2">{result.MerchantRequestID}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}