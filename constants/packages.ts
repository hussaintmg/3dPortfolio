export interface Package {
  id: string;
  name: string;
  originalPrice: number;
  discountedPrice: number;
  duration: string;
  features: string[];
  description: string;
  images: string[];
  videos?: string[];
}

export const packages: Package[] = [
  {
    id: "p1",
    name: "Basic Portfolio",
    originalPrice: 199,
    discountedPrice: 99,
    duration: "1 Week",
    features: [
      "Custom UI Design",
      "Next.js App Router",
      "Responsive Layout",
      "Contact Form (Basic)",
      "Vercel Deployment",
    ],
    description: "Launch your personal brand with a sleek, one-page portfolio. Perfect for junior developers and freelancers looking for a clean professional presence.",
    images: [
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1000&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=1000&auto=format&fit=crop"
    ]
  },
  {
    id: "p2",
    name: "Business Suite",
    originalPrice: 499,
    discountedPrice: 249,
    duration: "2-3 Weeks",
    features: [
      "Multi-page Application",
      "Admin Dashboard",
      "Content Management",
      "Enquiry Notifications",
      "SEO Optimization",
      "Advanced Interactions",
    ],
    description: "A comprehensive solution for growing businesses. Includes a dashboard to manage enquiries and content dynamically.",
    images: [
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1000&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1000&auto=format&fit=crop"
    ]
  },
  {
    id: "p3",
    name: "E-Commerce Ultra",
    originalPrice: 999,
    discountedPrice: 499,
    duration: "4-5 Weeks",
    features: [
      "Full Shopping Cart",
      "Stripe/PayPal Integration",
      "Stock Management",
      "User Accounts & Orders",
      "Real-time Chat Support",
      "Premium Design System",
    ],
    description: "A high-end e-commerce engine designed for scalability. Robust backend, user management, and seamless performance.",
    images: [
      "https://images.unsplash.com/photo-1557821552-17105176677c?q=80&w=1000&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1472851294608-062f824d29cc?q=80&w=1000&auto=format&fit=crop"
    ]
  }
];
