import { Image } from 'next/image';
import Link from 'next/link';

export default function ProductsPage() {
  const sampleProducts = [
    {
      id: '1',
      name: 'Home Composter Basic',
      description: 'Perfect for beginners - compact indoor composting system',
      price: 2500,
      image: '/images/composter-basic.jpg',
    },
    {
      id: '2',
      name: 'Garden Composter Deluxe',
      description: 'Large capacity for backyard composting',
      price: 5500,
      image: '/images/composter-deluxe.jpg',
    },
    {
      id: '3',
      name: 'Worm Farm Kit',
      description: 'Vermicomposting system for rich fertilizer',
      price: 3200,
      image: '/images/worm-farm.jpg',
    },
    {
      id: '4',
      name: 'Compost Thermometer',
      description: 'Monitor your compost temperature for optimal results',
      price: 800,
      image: '/images/thermometer.jpg',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Our Products</h1>
        <p className="text-muted-foreground">
          Explore our range of composting solutions for homes and gardens
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {sampleProducts.map((product) => (
          <Link
            key={product.id}
            href={`/products/${product.id}`}
            className="group"
          >
            <div className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="relative h-48">
                <Image
                  src={product.image}
                  alt={product.name}
                  className="object-cover w-full h-full"
                  placeholder="blur"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-center py-2">
                  <span className="font-medium">KES {product.price.toLocaleString()}</span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold mb-2">{product.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {product.description}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    In stock
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}