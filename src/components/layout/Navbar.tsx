
import { Link } from "react-router-dom";

export const Navbar = () => {
  return (
    <header className="w-full border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center">
          <Link to="/" className="flex items-center space-x-2">
            <img 
              src="/lovable-uploads/b2f99f37-05c4-4fef-99be-532dc5f5d3fb.png" 
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
