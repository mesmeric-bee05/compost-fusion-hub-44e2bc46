import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import {
  Leaf, User, Bell, Truck, ChevronRight, ChevronLeft, Check,
  MapPin, Calendar, Package, Award, Mail, Loader2, Sparkles, ArrowRight,
} from "lucide-react";

// --- Step indicator ---
const steps = [
  { icon: User, label: "Profile" },
  { icon: Bell, label: "Notifications" },
  { icon: Truck, label: "First Pickup" },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((s, i) => {
        const Icon = s.icon;
        const done = i < current;
        const active = i === current;
        return (
          <div key={i} className="flex items-center gap-2">
            {i > 0 && (
              <div className={`h-px w-8 transition-colors ${done ? "bg-primary" : "bg-border"}`} />
            )}
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all ${
                done
                  ? "border-primary bg-primary text-primary-foreground"
                  : active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-muted text-muted-foreground"
              }`}
            >
              {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- Step 1: Profile ---
const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Name is required"),
  phone: z.string().trim().min(9, "Phone is required").max(15),
  location: z.string().trim().min(2, "Location helps us serve you better"),
});

function ProfileStep({ onNext }: { onNext: () => void }) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: "", phone: "", location: "" },
  });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, phone, location")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          form.reset({
            full_name: data.full_name || "",
            phone: data.phone || "",
            location: data.location || "",
          });
        }
      });
  }, [user]);

  const onSubmit = async (values: z.infer<typeof profileSchema>) => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update(values)
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      onNext();
    }
  };

  return (
    <div>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <User className="h-7 w-7 text-primary" />
        </div>
        <h2 className="font-display text-2xl font-bold text-foreground">Complete Your Profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">Tell us a bit about yourself so we can personalize your experience.</p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField control={form.control} name="full_name" render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="phone" render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl><Input placeholder="+254 7XX XXX XXX" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="location" render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Location</FormLabel>
              <FormControl><Input placeholder="Nairobi, Kenya" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Continue
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </form>
      </Form>
    </div>
  );
}

// --- Step 2: Notification Preferences ---
function NotificationsStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { preferences, updatePreferences, isLoading } = useNotificationPreferences();

  const toggle = (key: string, value: boolean) => {
    updatePreferences.mutate({ [key]: value } as any);
  };

  // Request browser notification permission
  const requestPermission = () => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  };

  useEffect(() => { requestPermission(); }, []);

  const rows = [
    { icon: <Package className="h-5 w-5" />, label: "Order Updates", browserKey: "browser_order_updates", emailKey: "email_order_updates" },
    { icon: <Truck className="h-5 w-5" />, label: "Collection Reminders", browserKey: "browser_collection_reminders", emailKey: "email_collection_reminders" },
    { icon: <Award className="h-5 w-5" />, label: "Reward Achievements", browserKey: "browser_reward_achievements", emailKey: "email_reward_achievements" },
  ];

  return (
    <div>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Bell className="h-7 w-7 text-primary" />
        </div>
        <h2 className="font-display text-2xl font-bold text-foreground">Stay in the Loop</h2>
        <p className="mt-1 text-sm text-muted-foreground">Choose how you'd like to receive notifications.</p>
      </div>

      <div className="mb-4 flex items-center justify-end gap-6 text-xs font-medium text-muted-foreground">
        <span className="flex items-center gap-1"><Bell className="h-3.5 w-3.5" /> Browser</span>
        <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> Email</span>
      </div>

      <div className="space-y-1">
        {rows.map((r, i) => (
          <div key={r.browserKey}>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">{r.icon}</div>
                <span className="text-sm font-medium text-foreground">{r.label}</span>
              </div>
              <div className="flex items-center gap-6">
                <Switch
                  checked={(preferences as any)[r.browserKey]}
                  onCheckedChange={(v) => toggle(r.browserKey, v)}
                />
                <Switch
                  checked={(preferences as any)[r.emailKey]}
                  onCheckedChange={(v) => toggle(r.emailKey, v)}
                />
              </div>
            </div>
            {i < rows.length - 1 && <Separator />}
          </div>
        ))}
      </div>

      <div className="mt-6 flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ChevronLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <Button onClick={onNext} className="flex-1">
          Continue <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// --- Step 3: First Collection ---
const wasteTypes = [
  { value: "organic", label: "Organic", desc: "Food waste, garden cuttings" },
  { value: "recyclable", label: "Recyclable", desc: "Plastics, cans, paper" },
  { value: "agricultural", label: "Agricultural", desc: "Farm & crop waste" },
  { value: "mixed", label: "Mixed", desc: "Combination of types" },
] as const;

const collectionSchema = z.object({
  waste_type: z.enum(["organic", "recyclable", "agricultural", "mixed"]),
  estimated_volume_kg: z.number().min(1).max(500),
  address: z.string().trim().min(5, "Address is required"),
  pickup_date: z.string().min(1, "Pick a date"),
});

function CollectionStep({ onBack, onComplete, onSkip }: { onBack: () => void; onComplete: () => void; onSkip: () => void }) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const form = useForm<z.infer<typeof collectionSchema>>({
    resolver: zodResolver(collectionSchema),
    defaultValues: { waste_type: "organic", estimated_volume_kg: 20, address: "", pickup_date: "" },
  });

  // Pre-fill address from profile
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("location")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.location) form.setValue("address", data.location);
      });
  }, [user]);

  const volume = form.watch("estimated_volume_kg");

  const onSubmit = async (values: z.infer<typeof collectionSchema>) => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("collection_requests").insert({
      user_id: user.id,
      waste_type: values.waste_type,
      estimated_volume_kg: values.estimated_volume_kg,
      address: values.address,
      pickup_date: values.pickup_date,
      frequency: "one_time" as const,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      onComplete();
    }
  };

  return (
    <div>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Truck className="h-7 w-7 text-primary" />
        </div>
        <h2 className="font-display text-2xl font-bold text-foreground">Schedule Your First Pickup</h2>
        <p className="mt-1 text-sm text-muted-foreground">Let's get your first waste collection on the calendar.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField control={form.control} name="waste_type" render={({ field }) => (
            <FormItem>
              <FormLabel>Waste Type</FormLabel>
              <FormControl>
                <RadioGroup value={field.value} onValueChange={field.onChange} className="grid grid-cols-2 gap-2">
                  {wasteTypes.map(w => (
                    <Label key={w.value} htmlFor={`ob-wt-${w.value}`} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent ${field.value === w.value ? "border-primary bg-accent" : "border-border"}`}>
                      <RadioGroupItem value={w.value} id={`ob-wt-${w.value}`} />
                      <div><div className="text-sm font-medium">{w.label}</div><div className="text-xs text-muted-foreground">{w.desc}</div></div>
                    </Label>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="estimated_volume_kg" render={({ field }) => (
            <FormItem>
              <FormLabel>Estimated Volume: {volume} kg</FormLabel>
              <FormControl>
                <Slider min={1} max={500} step={5} value={[field.value]} onValueChange={v => field.onChange(v[0])} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="address" render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Pickup Address</FormLabel>
              <FormControl><Input placeholder="Street address, area, city" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="pickup_date" render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Preferred Date</FormLabel>
              <FormControl><Input type="date" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onBack} className="flex-1">
              <ChevronLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Truck className="mr-1 h-4 w-4" />}
              Schedule Pickup
            </Button>
          </div>

          <Button type="button" variant="ghost" className="w-full text-muted-foreground" onClick={handleSkip}>
            Skip for now <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </form>
      </Form>
    </div>
  );
}

// --- Success ---
function SuccessScreen({ skippedCollection }: { skippedCollection: boolean }) {
  const navigate = useNavigate();

  return (
    <div className="text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10"
      >
        <Sparkles className="h-10 w-10 text-primary" />
      </motion.div>
      <h2 className="font-display text-2xl font-bold text-foreground">You're All Set! 🌿</h2>
      <p className="mt-2 text-muted-foreground">
        {skippedCollection
          ? "Your profile is ready. You can schedule a pickup anytime from the Collections page."
          : "Your profile is ready and your first pickup is scheduled. We'll notify you when it's confirmed!"}
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <Button onClick={() => navigate("/dashboard")} className="w-full">
          Go to Dashboard <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
        <Button variant="outline" onClick={() => navigate("/products")} className="w-full">
          Browse Products
        </Button>
      </div>
    </div>
  );
}

// --- Main Onboarding Page ---
export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [skippedCollection, setSkippedCollection] = useState(false);
  const [completed, setCompleted] = useState(false);

  const markOnboardingDone = async () => {
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("user_id", user.id);
    setCompleted(true);
  };

  const handleCollectionComplete = () => {
    setSkippedCollection(false);
    markOnboardingDone();
  };

  const handleCollectionSkip = () => {
    setSkippedCollection(true);
    markOnboardingDone();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Leaf className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold text-foreground">
              Captain<span className="text-primary">Compost</span>
            </span>
          </div>
          {!completed && <StepIndicator current={step} />}
        </div>

        {/* Card */}
        <Card className="overflow-hidden">
          <CardContent className="p-6 sm:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={completed ? "success" : step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                {completed ? (
                  <SuccessScreen skippedCollection={skippedCollection} />
                ) : step === 0 ? (
                  <ProfileStep onNext={() => setStep(1)} />
                ) : step === 1 ? (
                  <NotificationsStep onNext={() => setStep(2)} onBack={() => setStep(0)} />
                ) : (
                  <CollectionStep
                    onBack={() => setStep(1)}
                    onComplete={() => {
                      // We need to distinguish skip vs submit — handled by the component calling onComplete
                      // The CollectionStep calls onComplete for both submit and skip
                      // We'll track it differently
                      handleCollectionComplete();
                    }}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Skip all */}
        {!completed && (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            <button onClick={() => { setSkippedCollection(true); markOnboardingDone(); }} className="underline underline-offset-4 hover:text-foreground transition-colors">
              Skip onboarding
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
