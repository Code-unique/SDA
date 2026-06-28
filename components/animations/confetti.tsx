"use client"

import Confetti from "react-confetti"
import { useEffect, useState } from "react"

export function ConfettiAnimation() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return <Confetti width={window.innerWidth} height={window.innerHeight} />
}
