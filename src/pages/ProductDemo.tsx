import { ProductTryOn } from "@/components/product-try-on/ProductTryOn";

const ProductDemo = () => {
  const productData = [
    {
      id: "prod-001",
      name: "Classic White T-Shirt",
      imageUrl: "https://www.jcrew.com/s7-img-facade/29866_RD6428?hei=2000&crop=0,0,1600,0",
      price: "$24.99",
      description: "A timeless white t-shirt made from 100% organic cotton. Perfect for any casual occasion."
    },
    {
      id: "prod-002",
      name: "Black Denim Jacket",
      imageUrl: "https://coach.scene7.com/is/image/Coach/cs198_blk_a0?$mobileProductV3$",
      price: "$89.99",
      description: "A stylish black denim jacket that goes with everything. Features premium stitching and metal buttons."
    }
  ];

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-mira-text font-heading sm:text-5xl lg:text-6xl">
            Try on with <span className="text-transparent bg-clip-text bg-gradient-primary">Mira</span>
          </h1>
          <p className="mt-5 max-w-xl mx-auto text-xl text-mira-text/80">
            See how these products look on you before you buy
          </p>
          <p className="mt-2 max-w-xl mx-auto text-sm text-mira-text/60">
            Using the avatar you've already created in the Avatar Generator
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
                  <h2 className="text-2xl font-bold text-mira-text font-heading">{product.name}</h2>
                  <p className="text-xl font-semibold text-mira-purple">{product.price}</p>
                </div>
                <p className="mt-2 text-mira-text/80">{product.description}</p>
                <div className="mt-4">
                  <ProductTryOn
                    productId={product.id}
                    productName={product.name}
                    productImageUrl={product.imageUrl}
                    price={product.price}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ProductDemo;
