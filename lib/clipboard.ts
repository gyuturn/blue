// 클립보드 복사. Clipboard API가 막힌 환경(비보안 컨텍스트·권한 거부)에서는 execCommand로 폴백한다.
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // 비보안 컨텍스트·권한 거부 시 폴백
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.readOnly = true;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      try {
        el.focus();
        el.select();
        el.setSelectionRange(0, text.length);
        return document.execCommand('copy');
      } finally {
        document.body.removeChild(el);
      }
    } catch {
      return false;
    }
  }
}
