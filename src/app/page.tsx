import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">file</h1>
      <p className="max-w-md text-center text-sm text-muted-foreground">
        Стартовый каркас Next.js + shadcn/ui. Замени эту страницу на свой продукт.
      </p>
      <Button type="button">Кнопка</Button>
    </main>
  );
}
