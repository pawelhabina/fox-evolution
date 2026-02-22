export default function ToastStack({ toasts }) {
  return (
    <div className="fixed bottom-4 left-4 z-50 grid gap-2">
      {toasts.map((toast) => (
        <div key={toast.id} className="toast">
          {toast.message}
        </div>
      ))}
    </div>
  );
}
