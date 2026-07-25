export default function LayoutWithRight({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-layout">
      <aside>
        <h2>管理后台</h2>
      </aside>
      <div className="main-content">{children}</div>
    </div>
  );
}
