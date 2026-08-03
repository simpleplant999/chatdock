export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // fixed inset-0 avoids broken html/body height chains inside iframes
  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-white">
      {children}
    </div>
  );
}
