import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useNotificationPreferences, NotificationPreferences } from "@/hooks/useNotificationPreferences";
import { Bell, Mail, Package, Truck, Award, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface PrefRowProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  browserKey: keyof NotificationPreferences;
  emailKey: keyof NotificationPreferences;
  preferences: NotificationPreferences;
  onToggle: (key: keyof NotificationPreferences, value: boolean) => void;
}

function PrefRow({ icon, label, description, browserKey, emailKey, preferences, onToggle }: PrefRowProps) {
  return (
    <div className="flex flex-col gap-4 py-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <p className="font-medium text-foreground">{label}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-6 pl-13 sm:pl-0">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <Switch
            checked={preferences[browserKey] as boolean}
            onCheckedChange={(v) => onToggle(browserKey, v)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <Switch
            checked={preferences[emailKey] as boolean}
            onCheckedChange={(v) => onToggle(emailKey, v)}
          />
        </div>
      </div>
    </div>
  );
}

export default function NotificationPreferencesPage() {
  const { preferences, isLoading, updatePreferences } = useNotificationPreferences();

  const handleToggle = (key: keyof NotificationPreferences, value: boolean) => {
    updatePreferences.mutate(
      { [key]: value },
      {
        onSuccess: () => toast({ title: "Preferences updated" }),
        onError: () => toast({ title: "Failed to save", variant: "destructive" }),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-8">
        <h1 className="mb-2 font-display text-3xl font-bold text-foreground">Notification Preferences</h1>
        <p className="mb-8 text-muted-foreground">Choose how you want to be notified about activity on your account.</p>

        <Card className="mx-auto max-w-2xl">
          <CardHeader>
            <CardTitle className="text-lg">Notification Channels</CardTitle>
            <CardDescription>
              Toggle browser push notifications and email alerts for each category.
            </CardDescription>
            <div className="flex items-center justify-end gap-6 pt-2 text-xs font-medium text-muted-foreground">
              <span className="flex items-center gap-1"><Bell className="h-3.5 w-3.5" /> Browser</span>
              <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> Email</span>
            </div>
          </CardHeader>
          <CardContent>
            <PrefRow
              icon={<Package className="h-5 w-5" />}
              label="Order Updates"
              description="Get notified when your order status changes (confirmed, shipped, delivered)."
              browserKey="browser_order_updates"
              emailKey="email_order_updates"
              preferences={preferences}
              onToggle={handleToggle}
            />
            <Separator />
            <PrefRow
              icon={<Truck className="h-5 w-5" />}
              label="Collection Reminders"
              description="Alerts about your waste collection pickups and schedule changes."
              browserKey="browser_collection_reminders"
              emailKey="email_collection_reminders"
              preferences={preferences}
              onToggle={handleToggle}
            />
            <Separator />
            <PrefRow
              icon={<Award className="h-5 w-5" />}
              label="Reward Achievements"
              description="Celebrate milestones like leveling up and reaching point milestones."
              browserKey="browser_reward_achievements"
              emailKey="email_reward_achievements"
              preferences={preferences}
              onToggle={handleToggle}
            />
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
