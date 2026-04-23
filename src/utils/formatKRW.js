/**
 * @param {number | null | undefined} n
 * @returns {string}
 */
export function formatKRW(n) {
  if (n === undefined || n === null) return "₩0";
  return "₩" + Math.abs(n).toLocaleString("ko-KR");
}
