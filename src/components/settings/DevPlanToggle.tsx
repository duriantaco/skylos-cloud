'use client'

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { devUpdatePlan } from "@/app/dashboard/settings/actions"

export default function DevPlanToggle({ currentPlan }: { currentPlan: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState("")

  function handleSubmit(formData: FormData) {
    startTransition(() => {
      devUpdatePlan(formData)
        .then((result) => {
          if (!result?.success) {
            setMessage(`${result?.error ?? "Update failed"}`)
            return
          }

          setMessage(`Updated to ${result.plan}`)
          router.refresh()
        })
        .catch((err) => {
          console.error("updatePlan threw:", err)
          setMessage(`${err?.message ?? "Update threw"}`)
        })
    })
  }

  return (
    <div className="rounded-xl border-2 border-orange-500 bg-orange-50 p-6 mb-8">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-lg font-semibold">DEV MODE: Plan Toggle</h3>
      </div>

      <p className="text-sm text-gray-700 mb-4">
        For testing only. This will be changed when we go out of beta
      </p>

      <form action={handleSubmit} className="flex items-center gap-4">
        <label htmlFor="plan" className="font-medium">
          Current: <span className="font-bold">{currentPlan}</span> → Switch to:
        </label>

        <select
          id="plan"
          name="plan"
          defaultValue={currentPlan}
          className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
          disabled={isPending}
        >
          <option value="free">Free</option>
          <option value="pro">Pro</option>
        </select>

        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium disabled:opacity-50"
        >
          {isPending ? "Updating..." : "Update Plan"}
        </button>
      </form>

      {message && <p className="text-sm mt-2">{message}</p>}
    </div>
  )
}
