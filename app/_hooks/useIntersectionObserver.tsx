import { useEffect, useState, useRef } from 'react'

export function useIntersectionObserver(): [boolean, React.RefObject<HTMLDivElement | null>] {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries
      setIsVisible(entry.isIntersecting)
    })

    const observedElement = ref.current

    if (observedElement) {
      observer.observe(observedElement)
    }

    return () => {
      if (observedElement) {
        observer.unobserve(observedElement)
      }
    }
  }, [])

  return [isVisible, ref]
}
