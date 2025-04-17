
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserProfileProps {
  user: User;
  onSignOut: () => Promise<void>;
}

export function UserProfile({ user, onSignOut }: UserProfileProps) {
  return (
    <div className="mb-8 flex flex-col items-center justify-center">
      <Avatar className="h-20 w-20 mb-4 border-2 border-mira-purple">
        {user.user_metadata.avatar_url ? (
          <AvatarImage src={user.user_metadata.avatar_url} alt={user.user_metadata.full_name || "User"} />
        ) : (
          <AvatarFallback className="bg-mira-purple text-white">{user.email?.substring(0, 2).toUpperCase()}</AvatarFallback>
        )}
      </Avatar>
      <h2 className="text-2xl font-bold font-heading text-mira-text">Welcome, {user.user_metadata.full_name || user.email}</h2>
      <Button onClick={onSignOut} variant="outline" className="mt-2 border-mira-purple/30 text-mira-purple hover:bg-mira-purple/10">
        Sign Out
      </Button>
    </div>
  );
}
