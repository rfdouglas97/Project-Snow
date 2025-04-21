
import { Link } from "react-router-dom";

export const Navbar = () => {
  return (
    <header className="w-full border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center">
          <Link to="/" className="flex items-center space-x-2">
            <img 
              src="/lovable-uploads/4cbcba54-90df-4492-9f31-fbd34f7eec11.png" 
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
            to="/demo" 
            className="text-mira-text hover:text-mira-purple font-medium transition-colors"
          >
            Demo
          </Link>
          <Link 
            to="/demo" 
            className="btn-gradient px-4 py-2 rounded-full font-medium"
          >
            Try on with Mira
          </Link>
        </nav>
      </div>
    </header>
  );
};
