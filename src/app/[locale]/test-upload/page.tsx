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
