import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function EmailVerification({ email }: { email: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent">
        <MailCheck className="h-8 w-8 text-primary" />
      </div>
      <h3 className="font-display text-xl font-bold">Verify your email</h3>
      <p className="max-w-sm text-sm text-muted-foreground">
        We sent a verification link to <span className="font-medium text-foreground">{email}</span>. 
        Click the link in your email to activate your account.
      </p>
      <Button variant="outline" asChild>
        <Link to="/auth">Back to login</Link>
      </Button>
    </div>
  );
}
