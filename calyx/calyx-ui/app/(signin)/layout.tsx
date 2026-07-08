import { Card, Text } from "@tremor/react";
import Image from "next/image";

export const metadata = {
  title: "Calyx",
  description: "The standalone alert management and AIOps platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-tremor-background-subtle">
      <body>
        <div className="min-h-screen flex items-center justify-center bg-tremor-background-subtle p-4">
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="text-3xl animate-spin" style={{ animationDuration: '6s' }}>🌀</span>
              <Text className="text-tremor-title font-bold text-tremor-content-strong text-2xl">
                Calyx
              </Text>
            </div>
            <Card
              className="w-full max-w-md p-8 min-w-96 flex flex-col gap-6 items-center"
              decoration="top"
              decorationColor="orange"
            >
              {children}
            </Card>
          </div>
        </div>
      </body>
    </html>
  );
}
