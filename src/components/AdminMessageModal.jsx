import { useState } from 'react';
import GuiIcon from './GuiIcon';

export default function AdminMessageModal({ message, onAcknowledge }) {
  const [busy, setBusy] = useState(false);
  if (!message) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/85 p-4" role="dialog" aria-modal="true" aria-labelledby="admin-message-title">
      <div className="pixel-frame w-full max-w-lg rounded-2xl border border-amber-400/50 bg-slate-900 p-5 shadow-2xl">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-cyan-300">
          <GuiIcon name="quest" alt="" size={18} />
          Wiadomość od administracji
        </p>
        <h2 id="admin-message-title" className="mt-3 text-xl font-black text-amber-300">{message.title}</h2>
        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-200">{message.body}</p>
        <button
          type="button"
          className="mt-5 w-full rounded-xl bg-amber-500 px-4 py-3 font-black text-slate-950 disabled:cursor-wait disabled:bg-slate-600"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onAcknowledge(message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? 'Zapisywanie…' : 'Rozumiem'}
        </button>
      </div>
    </div>
  );
}
