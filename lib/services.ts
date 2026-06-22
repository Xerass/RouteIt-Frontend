//frontend service registry, drives the landing-page nav cards. Each entry
//maps to a page under app/<route>/. This is the website's source of truth for
//navigation (route + icon + copy), the backend's /api/services is for
//discovery/health and is intentionally kept separate.

export interface ServiceLink {
  name: string;
  description: string;
  icon: string; // Font Awesome class
  href: string; // Next.js route
}

export const SERVICES: ServiceLink[] = [
  {
    name: "Traffic Reader",
    description:
      "Detect, classify, and track vehicles across an intersection line.",
    icon: "fa-solid fa-car",
    href: "/traffic-reader",
  },
  //store them in app in their subfolder
  {
    name: "Route Optimizer",
    description: "Plan multi-stop driving routes with TSP optimization and live weather penalties.",
    icon: "fa-solid fa-route",
    href: "/route-optimizer",
  }
];
