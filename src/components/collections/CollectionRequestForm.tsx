import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCheckBadges } from "@/hooks/useCheckBadges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, Calendar, MapPin, Recycle } from "lucide-react";

const wasteTypes = [
  { value: "organic", label: "Organic", desc: "Food waste, garden cuttings" },
  { value: "recyclable", label: "Recyclable", desc: "Plastics, cans, paper" },
  { value: "agricultural", label: "Agricultural", desc: "Farm & crop waste" },
  { value: "mixed", label: "Mixed", desc: "Combination of waste types" },
] as const;

const frequencies = [
  { value: "one_time", label: "One-time" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
] as const;

const schema = z.object({
  waste_type: z.enum(["organic", "recyclable", "agricultural", "mixed"]),
  estimated_volume_kg: z.number().min(1).max(10000),
  address: z.string().trim().min(5, "Address is required").max(500),
  pickup_date: z.string().min(1, "Date is required"),
  pickup_time: z.string().optional(),
  frequency: z.enum(["one_time", "weekly", "biweekly", "monthly"]),
  notes: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

export default function CollectionRequestForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { checkBadges } = useCheckBadges();
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      waste_type: "organic",
      estimated_volume_kg: 20,
      address: "",
      pickup_date: "",
      pickup_time: "",
      frequency: "one_time",
      notes: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!user) { navigate("/auth"); return; }
    setLoading(true);
    const { error } = await supabase.from("collection_requests").insert({
      user_id: user.id,
      waste_type: values.waste_type,
      estimated_volume_kg: values.estimated_volume_kg,
      address: values.address,
      pickup_date: values.pickup_date,
      pickup_time: values.pickup_time || null,
      frequency: values.frequency,
      notes: values.notes || null,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Request submitted!", description: "We'll confirm your pickup soon." });
      navigate("/dashboard");
    }
  };

  const volume = form.watch("estimated_volume_kg");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Recycle className="h-5 w-5 text-primary" />
          Request a Collection
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField control={form.control} name="waste_type" render={({ field }) => (
              <FormItem>
                <FormLabel>Waste Type</FormLabel>
                <FormControl>
                  <RadioGroup value={field.value} onValueChange={field.onChange} className="grid grid-cols-2 gap-2">
                    {wasteTypes.map(w => (
                      <Label key={w.value} htmlFor={`wt-${w.value}`} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent ${field.value === w.value ? "border-primary bg-accent" : "border-border"}`}>
                        <RadioGroupItem value={w.value} id={`wt-${w.value}`} />
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
                <FormLabel className="flex items-center gap-1"><MapPin className="h-3 w-3" />Pickup Address</FormLabel>
                <FormControl><Input placeholder="Street address, area, city" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="pickup_date" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1"><Calendar className="h-3 w-3" />Preferred Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="pickup_time" render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Time</FormLabel>
                  <FormControl><Input type="time" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="frequency" render={({ field }) => (
              <FormItem>
                <FormLabel>Frequency</FormLabel>
                <FormControl>
                  <RadioGroup value={field.value} onValueChange={field.onChange} className="flex flex-wrap gap-2">
                    {frequencies.map(f => (
                      <Label key={f.value} htmlFor={`fr-${f.value}`} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors hover:bg-accent ${field.value === f.value ? "border-primary bg-accent" : "border-border"}`}>
                        <RadioGroupItem value={f.value} id={`fr-${f.value}`} />
                        {f.label}
                      </Label>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (optional)</FormLabel>
                <FormControl><Textarea placeholder="Special instructions, gate code, etc." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit Request
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
