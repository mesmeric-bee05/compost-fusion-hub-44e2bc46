import { useState } from "react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Mail, Phone, Hash } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email").max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  interest: z.string().default("general"),
  county: z.string().trim().max(100).optional().or(z.literal("")),
  message: z.string().trim().min(1, "Message is required").max(2000),
});

const channels = [
  { icon: MessageSquare, label: "WhatsApp", value: "+254 700 000 000", href: "https://wa.me/254700000000" },
  { icon: Mail, label: "Email", value: "info@captaincompost.co.ke", href: "mailto:info@captaincompost.co.ke" },
  { icon: Phone, label: "Call Us", value: "+254 700 116 655", href: "tel:+254700116655" },
  { icon: Hash, label: "USSD", value: "Dial *384*555#", href: "/ussd" },
];

const Contact = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", phone: "", interest: "general", county: "", message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = contactSchema.safeParse(form);
    if (!parsed.success) {
      toast({ title: "Validation Error", description: Object.values(parsed.error.flatten().fieldErrors).flat().join(", "), variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("contact_submissions" as any).insert(parsed.data as any);
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: "Failed to send message. Please try again.", variant: "destructive" });
    } else {
      toast({ title: "Message Sent!", description: "We'll get back to you within 24 hours." });
      setForm({ name: "", email: "", phone: "", interest: "general", county: "", message: "" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-16">
        <h1 className="font-display text-4xl font-bold text-foreground">Contact Us</h1>
        <p className="mt-2 text-muted-foreground">Reach out through any channel — we respond within 24 hours</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {channels.map((ch) => (
            <a key={ch.label} href={ch.href} className="block">
              <Card className="h-full transition-shadow hover:shadow-lg">
                <CardContent className="flex flex-col items-center gap-2 p-6 text-center">
                  <ch.icon className="h-8 w-8 text-primary" />
                  <h3 className="font-display font-semibold text-foreground">{ch.label}</h3>
                  <p className="text-sm text-muted-foreground">{ch.value}</p>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>

        <Card className="mt-12 max-w-2xl">
          <CardHeader><CardTitle className="font-display">Send Us a Message</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label htmlFor="name">Name *</Label><Input id="name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required maxLength={100} /></div>
                <div><Label htmlFor="email">Email</Label><Input id="email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} maxLength={255} /></div>
                <div><Label htmlFor="phone">Phone</Label><Input id="phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} maxLength={20} /></div>
                <div><Label htmlFor="county">County</Label><Input id="county" value={form.county} onChange={e => setForm(f => ({ ...f, county: e.target.value }))} maxLength={100} /></div>
              </div>
              <div>
                <Label>Interest</Label>
                <Select value={form.interest} onValueChange={v => setForm(f => ({ ...f, interest: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Inquiry</SelectItem>
                    <SelectItem value="composters">Composting Equipment</SelectItem>
                    <SelectItem value="collection">Waste Collection</SelectItem>
                    <SelectItem value="compost">Buy Compost</SelectItem>
                    <SelectItem value="partnership">Partnership</SelectItem>
                    <SelectItem value="agent">Become a Sub-Agent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label htmlFor="message">Message *</Label><Textarea id="message" value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} required maxLength={2000} rows={5} /></div>
              <Button type="submit" disabled={loading}>{loading ? "Sending..." : "Send Message"}</Button>
            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;
