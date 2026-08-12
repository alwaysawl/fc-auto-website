import Image from "next/image";

const HEIGHT_CLASS = {
  header: "h-8 sm:h-9 w-auto",
  footer: "h-10 w-auto",
  admin: "h-8 w-auto",
} as const;

export default function BrandLogo({
  variant = "header",
  priority = false,
}: {
  variant?: keyof typeof HEIGHT_CLASS;
  priority?: boolean;
}) {
  return (
    <Image
      src="/images/fc-logo.png"
      alt=""
      width={760}
      height={231}
      className={`flex-shrink-0 object-contain object-center bg-transparent ${HEIGHT_CLASS[variant]}`}
      sizes="(min-width: 640px) 118px, 105px"
      priority={priority}
      aria-hidden
    />
  );
}
