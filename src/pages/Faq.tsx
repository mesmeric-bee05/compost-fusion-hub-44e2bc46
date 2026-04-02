import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqData = [
  {
    category: "Ordering & Products",
    items: [
      { q: "How do I place an order?", a: "Browse our products page, add items to your cart, fill in delivery details, and pay via M-Pesa. You can also order via USSD by dialing *384*555#." },
      { q: "What payment methods do you accept?", a: "We accept M-Pesa (Lipa na M-Pesa) for all orders. The STK push will be sent to your phone during checkout." },
      { q: "Can I order in bulk?", a: "Yes! We offer bulk discounts on most products. Contact us for custom quotes on large orders." },
      { q: "What is the Organic Waste Composter (OWC)?", a: "The OWC is our industrial-grade composting machine that processes 1-5 tonnes of organic waste per day. It's designed for municipalities, large farms, and institutions. Contact us for pricing." },
    ],
  },
  {
    category: "Composting",
    items: [
      { q: "How long does composting take?", a: "With an Aerobin composter, you can have finished compost in 4-8 weeks. Traditional composting methods take 3-6 months." },
      { q: "What can I compost?", a: "Fruit and vegetable scraps, coffee grounds, tea bags, eggshells, yard waste, shredded paper and cardboard. Avoid meat, dairy, oils, and pet waste." },
      { q: "Does composting smell bad?", a: "Properly managed compost should smell earthy, not foul. If it smells bad, it usually needs more brown materials (dry leaves, cardboard) or better aeration." },
    ],
  },
  {
    category: "Delivery & Collection",
    items: [
      { q: "Where do you deliver?", a: "We deliver across all 47 counties in Kenya. Delivery times vary: 1-3 days for Nairobi, 3-7 days for other counties." },
      { q: "How does waste collection work?", a: "Request a pickup through our app or website. Choose your waste type, schedule, and address. Our drivers will collect your organic waste and deliver it to our composting facilities." },
      { q: "Can I track my order?", a: "Yes! Once your order is confirmed, you'll receive status updates via SMS and in-app notifications. Visit the order tracking page for real-time updates." },
    ],
  },
  {
    category: "M-Pesa & Payments",
    items: [
      { q: "I didn't receive the M-Pesa prompt", a: "Ensure your phone number is correct and has sufficient balance. The STK push may take up to 30 seconds. If it doesn't arrive, try again or contact support." },
      { q: "Can I get a refund?", a: "Yes, we offer refunds for cancelled orders before shipping. Contact our support team with your order number." },
      { q: "Is my payment information secure?", a: "Absolutely. We use Safaricom's official M-Pesa API. We never store your M-Pesa PIN or sensitive financial data." },
    ],
  },
  {
    category: "USSD Service",
    items: [
      { q: "How do I use USSD ordering?", a: "Dial *384*555# from any phone (smartphone or feature phone). Follow the menu prompts to browse products, check eco-points, or track orders." },
      { q: "Do I need internet for USSD?", a: "No! USSD works without internet or data. It works on any phone that can make calls." },
      { q: "Can I pay via USSD?", a: "Yes. When you place an order via USSD, an M-Pesa STK push will be sent to your phone for payment." },
    ],
  },
];

const Faq = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <main className="container max-w-3xl py-16">
      <h1 className="font-display text-4xl font-bold text-foreground">Frequently Asked Questions</h1>
      <p className="mt-2 text-muted-foreground">Find answers to common questions about our products and services</p>

      <div className="mt-10 space-y-8">
        {faqData.map((section) => (
          <div key={section.category}>
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">{section.category}</h2>
            <Accordion type="multiple" className="space-y-2">
              {section.items.map((item, i) => (
                <AccordionItem key={i} value={`${section.category}-${i}`} className="rounded-lg border bg-card px-4">
                  <AccordionTrigger className="text-left font-medium">{item.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ))}
      </div>
    </main>
    <Footer />
  </div>
);

export default Faq;
