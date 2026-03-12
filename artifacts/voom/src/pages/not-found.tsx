import { Layout } from "@/components/layout";
import { Button } from "@/components/ui-elements";
import { Link } from "wouter";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <Layout>
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[70vh]">
        <div className="w-24 h-24 bg-secondary rounded-full flex items-center justify-center mb-6">
          <SearchX className="w-12 h-12 text-muted-foreground" />
        </div>
        <h1 className="text-4xl font-display font-bold mb-4">404 - Not Found</h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-md">
          We couldn't find the page you're looking for. It might have been moved or doesn't exist.
        </p>
        <Link href="/">
          <Button size="lg" className="rounded-xl px-8">Return Home</Button>
        </Link>
      </div>
    </Layout>
  );
}
