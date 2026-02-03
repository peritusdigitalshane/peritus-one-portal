import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { X, UserCheck } from "lucide-react";

export const ImpersonationBanner = () => {
  const { isImpersonating, impersonatedUser, stopActingAsUser } = useAuth();

  if (!isImpersonating || !impersonatedUser) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-950 py-2 px-4">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserCheck className="h-5 w-5" />
          <span className="font-medium">
            Acting as: <strong>{impersonatedUser.full_name || impersonatedUser.email}</strong>
          </span>
          <span className="text-amber-800 text-sm">
            ({impersonatedUser.email})
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={stopActingAsUser}
          className="text-amber-950 hover:bg-amber-600 hover:text-amber-950"
        >
          <X className="h-4 w-4 mr-2" />
          Stop Impersonating
        </Button>
      </div>
    </div>
  );
};
