
import { Button } from "@/components/ui/button";
import { ProductTryOn } from "@/components/ProductTryOn";
import { toast } from "@/components/ui/use-toast";

const ProductDemo = () => {
  const productData = [
    {
      id: "prod-001",
      name: "Classic White T-Shirt",
      imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
      price: "$24.99",
      description: "A timeless white t-shirt made from 100% organic cotton. Perfect for any casual occasion."
    },
    {
      id: "prod-002",
      name: "Black Denim Jacket",
      imageUrl: "https://images.unsplash.com/photo-1551537482-f2075a1d41f2?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
      price: "$89.99",
      description: "A stylish black denim jacket that goes with everything. Features premium stitching and metal buttons."
    }
  ];

  const handleAddToCart = (productName: string) => {
    toast({
      title: "Added to cart",
      description: `${productName} has been added to your cart.`,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
            Product Demo
          </h1>
          <p className="mt-5 max-w-xl mx-auto text-xl text-gray-500">
            Try on products virtually before you buy
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {productData.map((product) => (
            <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="aspect-w-3 aspect-h-4 w-full">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="object-cover w-full h-[400px]"
                />
              </div>
              <div className="p-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">{product.name}</h2>
                  <p className="text-xl font-semibold text-gray-900">{product.price}</p>
                </div>
                <p className="mt-2 text-gray-600">{product.description}</p>
                <div className="mt-4 space-y-3">
                  <Button 
                    className="w-full" 
                    onClick={() => handleAddToCart(product.name)}
                  >
                    Add to Cart
                  </Button>
                  
                  <ProductTryOn
                    productId={product.id}
                    productName={product.name}
                    productImageUrl={product.imageUrl}
                    price={product.price}
                    onAddToCart={() => handleAddToCart(product.name)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductDemo;
