import { useEffect, useRef } from "react";

function ConfirmDialog({ title, message, confirmText, cancelText, secondaryText, onConfirm, onCancel, onSecondary, danger }) {
  const confirmRef = useRef(null);

  useEffect(() => {
    confirmRef.current && confirmRef.current.focus();
    const handleKey = (e) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onCancel]);

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 id="confirm-title">{title || "Confirm"}</h3>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: "14px", color: "inherit" }}>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onCancel}>{cancelText || "Cancel"}</button>
          {onSecondary && (
            <button className="btn-save" onClick={onSecondary}>{secondaryText || "Save"}</button>
          )}
          <button
            ref={confirmRef}
            className={danger ? "btn-danger" : "btn-save"}
            onClick={onConfirm}
          >
            {confirmText || "OK"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
