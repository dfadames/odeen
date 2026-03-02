// Shared types for the single-event ephemeral assembly model

export interface MotionQuestion {
  id: string
  title: string
  type: "radio" | "checkbox" | "text"
  options: string[]
}

export interface Motion {
  id: string
  title: string
  description: string
  questions: MotionQuestion[]
  requires_totp?: boolean
  status: "pending" | "live" | "completed"
  results?: MotionResult[]
  totalVotes?: number
}

export interface MotionResult {
  label: string
  value: number
  color: string
}

export interface AssemblyState {
  title: string
  date: string
  motions: Motion[]
  activeMotionId: string | null
  connectedUsers: number
  totalEligible: number
}

// Default demo assembly state
export const DEFAULT_ASSEMBLY: AssemblyState = {
  title: "General Assembly - Spring 2026",
  date: "2026-03-15",
  connectedUsers: 312,
  totalEligible: 800,
  motions: [
    {
      id: "m1",
      title: "Approval of the 2025-2026 Budget Proposal",
      description:
        "Do you approve the proposed budget for the upcoming academic year as presented by the treasury committee?",
      questions: [
        {
          id: "m1q1",
          title: "Approval of the 2025-2026 Budget Proposal",
          type: "radio",
          options: ["Approve", "Reject", "Abstain"],
        },
      ],
      status: "completed",
      totalVotes: 420,
      results: [
        { label: "Approve", value: 245, color: "oklch(0.6 0.18 155)" },
        { label: "Reject", value: 98, color: "oklch(0.6 0.2 25)" },
        { label: "Abstain", value: 77, color: "oklch(0.6 0.12 250)" },
      ],
    },
    {
      id: "m2",
      title: "Strike Action on Tuition Fee Increase",
      description:
        "Should the student body authorize a 48-hour strike action to protest the proposed 12% tuition fee increase?",
      questions: [
        {
          id: "m2q1",
          title: "Strike Action on Tuition Fee Increase",
          type: "radio",
          options: ["Authorize Strike", "Oppose Strike", "Abstain"],
        },
      ],
      status: "pending",
    },
    {
      id: "m3",
      title: "Election of Student Council Representatives",
      description:
        "Select up to 3 candidates for the open Student Council seats.",
      questions: [
        {
          id: "m3q1",
          title: "Election of Student Council Representatives",
          type: "checkbox",
          options: [
            "Ana Martinez",
            "James O'Brien",
            "Priya Sharma",
            "Lucas Fernandez",
            "Nina Kowalski",
          ],
        },
      ],
      status: "pending",
    },
    {
      id: "m4",
      title: "Amendment to Assembly Bylaws - Quorum Rules",
      description:
        "Do you approve the proposed amendment to reduce the minimum quorum from 50% to 35% for ordinary sessions?",
      questions: [
        {
          id: "m4q1",
          title: "Amendment to Assembly Bylaws - Quorum Rules",
          type: "radio",
          options: ["Approve Amendment", "Reject Amendment", "Abstain"],
        },
      ],
      status: "pending",
    },
  ],
  activeMotionId: null,
}
