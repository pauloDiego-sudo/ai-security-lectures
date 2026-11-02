import type { CSSProperties } from 'react';

/** Inline styles of the quiz, kept from the original component. */
export const S = {
  root: {
    minHeight: "100vh",
    background: "linear-gradient(160deg, #0b0f19 0%, #111827 40%, #0f172a 100%)",
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    color: "#e2e8f0",
    padding: "16px",
    boxSizing: "border-box",
  },
  // MENU
  menuContainer: { maxWidth: 600, margin: "0 auto" },
  menuHeader: { textAlign: "center", marginBottom: 28, paddingTop: 16 },
  menuIcon: { fontSize: 48, marginBottom: 8 },
  menuTitle: { fontSize: 28, fontWeight: 800, margin: 0, background: "linear-gradient(90deg,#60a5fa,#a78bfa,#f472b6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  menuSub: { fontSize: 14, color: "#94a3b8", margin: "6px 0 2px" },
  menuProf: { fontSize: 12, color: "#64748b", margin: 0 },
  chGrid: { display: "flex", flexDirection: "column", gap: 8 },
  chCard: {
    display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
    borderRadius: 10, border: "none", cursor: "pointer", textAlign: "left",
    transition: "transform 0.15s ease", width: "100%",
  },
  chEmoji: { fontSize: 26, flexShrink: 0 },
  chLabel: { fontSize: 14, fontWeight: 700 },
  chCount: { fontSize: 12, color: "#94a3b8", marginTop: 2 },

  // QUIZ
  quizContainer: { maxWidth: 600, margin: "0 auto" },
  progressRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 16 },
  progressText: { fontSize: 13, fontWeight: 700, color: "#94a3b8", minWidth: 42 },
  progressBar: { flex: 1, height: 6, background: "#1e293b", borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", background: "linear-gradient(90deg,#3b82f6,#8b5cf6)", borderRadius: 3, transition: "width 0.3s" },
  scoreSmall: { fontSize: 12, color: "#64748b", minWidth: 50, textAlign: "right" },
  qCard: { background: "#1e293b", borderRadius: 12, padding: "18px 20px", marginBottom: 14 },
  qChip: { display: "inline-block", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, marginBottom: 10 },
  qText: { fontSize: 15, lineHeight: 1.55, margin: 0, fontWeight: 500 },
  optsGrid: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 },
  optBtn: {
    display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px",
    borderRadius: 10, border: "1.5px solid", textAlign: "left",
    fontSize: 14, lineHeight: 1.45, transition: "all 0.15s",
    position: "relative",
  },
  optLetter: {
    width: 28, height: 28, borderRadius: "50%", border: "1.5px solid",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 12, fontWeight: 700, flexShrink: 0,
  },
  optText: { flex: 1, paddingTop: 3 },
  optIcon: { position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 18, fontWeight: 700 },

  // EXPLANATION
  explCard: { background: "#1a2744", border: "1px solid #2563eb44", borderRadius: 10, padding: "14px 16px", marginBottom: 14 },
  explTitle: { fontSize: 13, fontWeight: 700, color: "#60a5fa", marginBottom: 6 },
  explText: { fontSize: 13, lineHeight: 1.55, color: "#cbd5e1", margin: 0 },

  // BUTTONS
  btnRow: { display: "flex", gap: 10, justifyContent: "center", paddingBottom: 24 },
  btnPrimary: {
    padding: "12px 28px", borderRadius: 10, border: "none",
    background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", color: "#fff",
    fontSize: 15, fontWeight: 700, cursor: "pointer", transition: "opacity 0.15s",
  },
  btnSecondary: {
    padding: "12px 28px", borderRadius: 10, border: "1.5px solid #475569",
    background: "#1e293b", color: "#e2e8f0",
    fontSize: 15, fontWeight: 600, cursor: "pointer",
  },
  btnGhost: {
    padding: "12px 20px", borderRadius: 10, border: "none",
    background: "transparent", color: "#64748b",
    fontSize: 14, cursor: "pointer",
  },

  // REVIEW
  reviewContainer: { maxWidth: 600, margin: "0 auto", paddingTop: 16 },
  scoreCard: { textAlign: "center", background: "#1e293b", borderRadius: 16, padding: "28px 20px", marginBottom: 24 },
  scoreGrade: { fontSize: 52, marginBottom: 4 },
  scoreNum: { fontSize: 36, fontWeight: 800, color: "#fff" },
  scorePct: { fontSize: 22, fontWeight: 700, color: "#94a3b8", marginBottom: 6 },
  scoreMsg: { fontSize: 14, color: "#94a3b8", marginBottom: 14 },
  scoreBar: { height: 8, background: "#334155", borderRadius: 4, overflow: "hidden", maxWidth: 300, margin: "0 auto" },
  scoreBarFill: { height: "100%", borderRadius: 4, transition: "width 0.5s" },
  wrongSection: { marginBottom: 20 },
  wrongTitle: { fontSize: 16, fontWeight: 700, color: "#f87171", marginBottom: 12 },
  wrongCard: { background: "#1e293b", borderRadius: 10, padding: "14px 16px", marginBottom: 10 },
  wrongChip: { display: "inline-block", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 12, marginBottom: 8 },
  wrongQ: { fontSize: 13, fontWeight: 600, lineHeight: 1.5, margin: "0 0 8px" },
  wrongAns: { fontSize: 12, lineHeight: 1.5, marginBottom: 4 },
  wrongExpl: { fontSize: 12, color: "#94a3b8", lineHeight: 1.5, marginTop: 8, fontStyle: "italic" },
} satisfies Record<string, CSSProperties>;
