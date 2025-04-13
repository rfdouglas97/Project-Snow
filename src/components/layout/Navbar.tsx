
import { Link } from "react-router-dom";

export const Navbar = () => {
  return (
    <header className="w-full border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center">
          <Link to="/" className="flex items-center space-x-2">
            <img 
              src="/lovable-uploads/62ec2fd6-86b9-484d-b076-a102d794019d.png" 
              alt="Mira" 
              className="h-20"
            />
          </Link>
        </div>
        <nav className="hidden md:flex items-center space-x-6">
          <Link 
            to="/" 
            className="text-mira-text hover:text-mira-purple font-medium transition-colors"
          >
            Home
          </Link>
          <Link 
            to="/products" 
            className="text-mira-text hover:text-mira-purple font-medium transition-colors"
          >
            Demo
          </Link>
          <Link 
            to="/products" 
            className="btn-gradient px-4 py-2 rounded-full font-medium"
          >
            Try on with Mira
          </Link>
        </nav>
      </div>
    </header>
  );
};
