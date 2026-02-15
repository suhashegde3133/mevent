// Simple DOM-based toast helper — lightweight, no framework changes required
export function showToast(message, { duration = 3000 } = {}) {
  try {
    if (typeof document === "undefined") return;

    const containerId = "photoflow-toast-container";
    let container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement("div");
      container.id = containerId;
      Object.assign(container.style, {
        position: "fixed",
        top: "72px",
        right: "20px",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        pointerEvents: "none",
      });
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.className = "photoflow-toast";
    Object.assign(toast.style, {
      pointerEvents: "auto",
      minWidth: "260px",
      maxWidth: "360px",
      background: "#fff",
      color: "#111827",
      borderRadius: "8px",
      boxShadow: "0 6px 18px rgba(16,24,40,0.12)",
      padding: "12px 14px",
      border: "1px solid rgba(0,0,0,0.06)",
      opacity: "0",
      transform: "translateY(-6px)",
      transition: "opacity 200ms ease, transform 200ms ease",
      fontSize: "0.95rem",
      lineHeight: "1.2",
    });

    const title = document.createElement("div");
    title.style.fontWeight = "600";
    title.style.marginBottom = "4px";
    title.textContent = "Notification";

    const msg = document.createElement("div");
    msg.textContent = message || "";
    msg.style.color = "#374151";

    toast.appendChild(title);
    toast.appendChild(msg);

    container.appendChild(toast);

    // animate in
    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
    });

    const hide = () => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(-6px)";
      setTimeout(() => {
        try {
          container.removeChild(toast);
        } catch (e) {}
        // remove container if empty
        if (container && container.childElementCount === 0) {
          try {
            container.parentNode.removeChild(container);
          } catch (e) {}
        }
      }, 220);
    };

    const t = setTimeout(hide, duration);
    // allow manual dismiss on click
    toast.addEventListener("click", () => {
      clearTimeout(t);
      hide();
    });
  } catch (err) {
    // swallow errors — non-critical
  }
}

export default showToast;
