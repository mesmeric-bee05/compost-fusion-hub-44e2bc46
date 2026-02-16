

# Captain Compost × MyEcoLoop — Unified Platform

A modern, professional web platform that integrates Captain Compost's agricultural waste-to-compost mission with MyEcoLoop's equipment expertise, serving households, farmers, institutions, and recyclers across Kenya.

---

## 🎨 Design & Branding
- **Modern, clean UI** with a professional SaaS feel — bold green accent colors reflecting sustainability, paired with neutral whites/grays
- Responsive design optimized for mobile, tablet, and desktop (PWA-ready)
- Consistent branding combining both organizations' identities
- Clean typography, card-based layouts, and data-rich dashboards

---

## 🔐 Authentication & User Roles
- **Sign up / Login** with email and phone number support
- **Role-based system** with distinct experiences for:
  - **Individual/Household** — buy products, request pickups, earn rewards
  - **Farmer** — access compost marketplace, education, traceability
  - **Institution** (schools, hotels, corporates) — bulk ordering, compliance reports
  - **Recycler/Collector** — RVM points dashboard, leaderboards
  - **Driver/Operator** — task management, collection verification
  - **Admin** — full system management, analytics, user management
- Secure role storage in a dedicated `user_roles` table with RLS policies

---

## 🛒 Module 1: E-Commerce Marketplace
- **Product catalog** with categories: Aerobin composters (200L/400L/600L), RVMs, finished compost products, services
- Product detail pages with specifications, pricing in KES, image galleries
- **Shopping cart** with quantity management
- **Order management** — place orders, track status (pending → confirmed → shipped → delivered)
- Bulk discount logic and institutional pricing
- Product reviews and ratings
- Wishlist / saved items
- Order history for users

---

## 🚛 Module 2: Waste Collection System
- **Collection request form** — select waste type (organic, recyclable, agricultural), estimate volume, pick date/time, enter address
- **Scheduling** — one-time or recurring pickups (weekly/bi-weekly/monthly)
- **Status tracking** — real-time status updates for collection requests
- **Driver dashboard** — view assigned tasks, mark as collected, upload verification photos
- Collection history and receipts
- SMS notification triggers (via edge functions)

---

## 📊 Module 3: Impact Dashboard & Analytics

### User-Facing Dashboard
- Personal environmental impact: waste diverted (kg), CO₂ saved, compost produced, trees equivalent
- Reward points balance and history
- Visual charts and progress tracking over time

### Admin Dashboard
- **Sales analytics** — revenue by product, region, time period
- **Operational metrics** — collection efficiency, delivery rates, equipment uptime
- **User analytics** — registrations, active users, retention
- **Environmental KPIs** — total waste diverted, CO₂ reduced, compost produced
- Exportable reports

---

## 📚 Module 4: Education & Community Hub
- **Content library** — articles, guides, and video embeds organized by category (composting, recycling, farming)
- **Interactive tools** — carbon footprint calculator, waste segregation guide
- Multi-language support labels (English/Swahili)
- **Community features** — discussion forums, success stories, farmer testimonials
- Course/certification listings (basic composting, advanced waste management)

---

## 🏆 Module 5: Gamification & Rewards
- **Points system** — earn points from RVM deposits, collections, purchases, education completion
- **Leaderboards** — top recyclers weekly/monthly (individual and institutional)
- **Achievement badges** — milestones like "First Compost," "100kg Recycled," "Eco Champion"
- **Level progression** — Beginner → Intermediate → Expert → Champion
- Points redemption interface (future M-Pesa cashout, product discounts)

---

## 🏢 Module 6: Institutional / Enterprise Portal
- Multi-location management for corporates and estates
- Department-level waste tracking and reporting
- Sustainability/ESG compliance reports
- Bulk ordering with custom pricing

---

## 🔧 Backend & Security (Supabase)
- **Database tables**: users, profiles, user_roles, products, orders, order_items, collection_requests, rvm_devices, rvm_transactions, content, impact_metrics, rewards, forum_posts
- **Row-Level Security** on all tables with proper policies per role
- **Edge functions** for sensitive operations (payment callbacks, SMS triggers, admin actions)
- Input validation with Zod on all forms
- Secure role checking via `has_role()` security definer function

---

## 📱 Platform Pages Summary
1. **Landing page** — hero section, mission statement, partner showcase, product highlights, impact stats, CTA
2. **Product catalog & detail pages**
3. **Shopping cart & checkout**
4. **Collection request & tracking**
5. **User dashboard** (role-specific)
6. **Admin dashboard** with analytics
7. **Education hub** with content library
8. **Community forums**
9. **Leaderboard & achievements**
10. **Profile & settings**
11. **About / Contact**

---

## ⚠️ Future Enhancements (Not in Initial Build)
- M-Pesa payment integration (requires Safaricom API keys)
- USSD interface (requires Africa's Talking backend)
- IoT/RVM real-time monitoring (requires MQTT infrastructure)
- AI chatbot (CompostBot)
- Native mobile apps
- Blockchain/carbon credits

