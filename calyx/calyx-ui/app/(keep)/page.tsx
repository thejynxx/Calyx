import { redirect } from "next/navigation";

export const metadata = {
  title: "Calyx AIOps",
  description: "Standalone Calyx Log and Alert Management System",
};

export default function RootKeepPage() {
  redirect("/aiops/dashboard");
}
