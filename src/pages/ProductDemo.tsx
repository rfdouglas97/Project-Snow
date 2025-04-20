
import { useState } from "react";
import { ProductTryOn } from "@/components/product-try-on/ProductTryOn";
import { Button } from "@/components/ui/button";
import { TryOnPopup } from "@/components/tryon/TryOnPopup";
import { TryOnRouter } from "@/components/tryon/TryOnRouter";

const ProductDemo = () => {
  const [showMiraPopup, setShowMiraPopup] = useState(false);

  const productData = [
    {
      id: "prod-001",
      name: "Classic Striped T-Shirt",
      imageUrl: "/lovable-uploads/b6bfa933-c408-42a4-a596-9b701e86dfa3.png",
      price: "$34.99",
      description: "A timeless navy and white striped t-shirt with a relaxed fit. Perfect for casual weekends and layering."
    },
    {
      id: "prod-002",
      name: "Black Denim Jacket",
      imageUrl: "https://coach.scene7.com/is/image/Coach/cs198_blk_a0?$mobileProductV3$",
      price: "$89.99",
      description: "A stylish black denim jacket that goes with everything. Features premium stitching and metal buttons."
    }
  ];

  // For the popup: show logo in header except when in "login" step
  const [popupStep, setPopupStep] = useState<null | string>(null);

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
                  {product.id === "prod-001" ? (
                    <>
                      <Button
                        variant="outline"
                        className="w-full flex items-center justify-center gap-2 font-semibold border-2"
                        style={{
                          borderColor: "#F9C846", // Gold outline (hex)
                          color: "#F97316"
                        }}
                        onClick={() => {
                          setShowMiraPopup(true);
                          setPopupStep("login");
                        }}
                      >
                        Try on with Mira (Pop-up)
                      </Button>
                      {/* Modal: Try-On Full Flow */}
                      <TryOnPopup
                        open={showMiraPopup}
                        onClose={() => setShowMiraPopup(false)}
                        header={
                          // Show logo in all steps except login
                          popupStep !== "login" && (
                            <img
                              src="/lovable-uploads/4a9e6bb2-27ae-42ad-9764-f1381ba11187.png"
                              alt="Mira logo"
                              className="w-28 h-auto"
                            />
                          )
                        }
                      >
                        <TryOnRouter
                          onClose={() => setShowMiraPopup(false)}
                          defaultStep="login"
                          // Propagate popupStep by updating on step change
                          onStepChange={(step: string) => setPopupStep(step)}
                        />
                      </TryOnPopup>
                    </>
                  ) : (
                    <ProductTryOn
                      productId={product.id}
                      productName={product.name}
                      productImageUrl={product.imageUrl}
                      price={product.price}
                    />
                  )}
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
