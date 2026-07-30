import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-charcoal-dark">
      <div className="text-center px-4">
        <div className="gold-divider mb-8" />
        <h1 className="text-6xl font-display font-bold text-white mb-4">404</h1>
        <p className="text-gray-400 mb-10">Page not found</p>
        <Link href="/en" className="btn-primary">
          Go Home
        </Link>
      </div>
    </div>
  );
}
