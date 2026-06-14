type HapticType = "light" | "success" | "warning";

export function triggerHaptic(type: HapticType) {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    switch (type) {
      case "light":
        navigator.vibrate(10);
        break;
      case "success":
        navigator.vibrate([40, 30, 40]);
        break;
      case "warning":
        navigator.vibrate([100, 50, 100]);
        break;
    }
  }
}
