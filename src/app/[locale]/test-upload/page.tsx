import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "File Picker Test",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function TestUploadPage() {
  return (
    <main style={{ padding: "40px" }}>
      <h1>File Picker Test</h1>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
      />
    </main>
  );
}
