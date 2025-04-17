
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <div className="text-center mb-12">
      <h1 className="text-4xl font-bold text-mira-text font-heading sm:text-5xl lg:text-6xl">
        Virtual Try-On with <span className="text-transparent bg-clip-text bg-gradient-primary">Mira</span>
      </h1>
      <p className="mt-5 max-w-xl mx-auto text-xl text-mira-text/80">
        Let your customers try before they buy
      </p>
      <div className="mt-8">
        <Link to="/demo">
          <Button size="lg" className="bg-gradient-primary rounded-full px-8 py-6 text-lg font-medium hover:shadow-lg transition-shadow duration-300">
            Try on with Mira
          </Button>
        </Link>
      </div>
    </div>
  );
}
