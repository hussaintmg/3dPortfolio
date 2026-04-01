import { LayoutDashboard, Users, Package, Briefcase, FolderOpen, MessageSquare, Settings } from "lucide-react";

export const homeLinks = [
  { name: "Home", url: "/" },
  { name: "Services", url: "/#services" },
  { name: "Projects", url: "/#projects" },
  { name: "Packages", url: "/packages" },
  { name: "Contact", url: "/contact" },
];

export const userDashboardLinks = [
  {
    name: "Dashboard",
    url: "/dashboard",
    icon: "LayoutDashboard",
    dropdown: null,
  },
  {
    name: "Admin Management",
    url: "/dashboard/admin-management",
    icon: "ShieldCheck",
    dropdown: null,
    ownerOnly: true,
  },
  {
    name: "Chat Support",
    url: "/dashboard/chat",
    icon: "MessageSquare",
    dropdown: null,
  },
  {
    name: "Enquiries",
    url: "/dashboard/enquiries",
    icon: "Inbox",
    dropdown: null,
  },
  {
    name: "Management",
    url: null,
    icon: "Settings",
    dropdown: [
      { name: "Users", url: "/dashboard/users", icon: "Users" },
      { name: "Packages", url: "/dashboard/packages", icon: "Package" },
      { name: "Services", url: "/dashboard/services", icon: "Briefcase" },
      { name: "Projects", url: "/dashboard/projects", icon: "FolderOpen" },
    ],
  },
];

export const adminDashboardLinks = [
  {
    name: "Dashboard",
    url: "/dashboard",
    icon: "LayoutDashboard",
    dropdown: null,
  },
  {
    name: "Chat Support",
    url: "/dashboard/chat",
    icon: "MessageSquare",
    dropdown: null,
  },
  {
    name: "Enquiries",
    url: "/dashboard/enquiries",
    icon: "Inbox",
    dropdown: null,
  },
  {
    name: "Management",
    url: null,
    icon: "Settings",
    dropdown: [
      { name: "Users", url: "/dashboard/users", icon: "Users" },
      { name: "Packages", url: "/dashboard/packages", icon: "Package" },
      { name: "Services", url: "/dashboard/services", icon: "Briefcase" },
      { name: "Projects", url: "/dashboard/projects", icon: "FolderOpen" },
    ],
  },
];

export const ownerDashboardLinks = [
  {
    name: "Dashboard",
    url: "/dashboard",
    icon: "LayoutDashboard",
    dropdown: null,
  },
  {
    name: "Admin Management",
    url: null,
    icon: "UserCog",
    dropdown: [
      { name: "Pending Admins", url: "/dashboard/pending-admins", icon: "UserSearch" },
      { name: "Approved Admins", url: "/dashboard/approved-admins", icon: "UserCheck" },
      { name: "Rejected Admins", url: "/dashboard/rejected-admins", icon: "UserRoundX" },
    ],
  },
  {
    name: "Enquires",
    url: "/dashboard/enquiries",
    icon: "Inbox",
    dropdown: null,
  },
  {
    name: "Readymade solutions",
    url: "/dashboard/readymade-solutions",
    icon: "Compass",
    dropdown: null,
  },
  {
    name: "Projects",
    url: "/dashboard/projects",
    icon: "FolderOpen",
    dropdown: null,
  },
  {
    name: "Packages",
    url: "/dashboard/packages",
    icon: "Package",
    dropdown: null,
  },
  {
    name: "Setting",
    url: "/dashboard/setting",
    icon: "Settings",
    dropdown: null,
  },
];
  